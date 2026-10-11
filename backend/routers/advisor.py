import json
import re
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.auth import get_current_user
from core.database import get_db
from core.groq_client import get_groq_client
from models.mascot import Mascot
from models.chat_session import ChatSession
from models.transaction import Transaction
from models.budget import Budget
from models.goal import Goal
from models.UserSettings import UserSettings
from schemas.mascot import (
    AdvisorUsageResponse,
    AdvisorChatRequest,
    AdvisorChatResponse,
    ChatSessionResponse,
    CreateChatRequest,
    UpdateChatRequest,
)


router = APIRouter(prefix="/advisor", tags=["advisor"])

WEEKLY_LIMIT = 10
WEEK_LENGTH = timedelta(days=7)
GROQ_MODEL = "llama-3.3-70b-versatile"
# Bound the prompt size per request — the Groq free tier has a shared daily
# token cap, so one oversized history must not be able to exhaust it.
MAX_HISTORY_MESSAGES = 20
MAX_MESSAGE_CHARS = 4000

# Matches a complete leaked function-call tag in text content.
# Compiled once at module level; used in chat() to recover silently-dropped actions.
_LEAKED_CALL_RE = re.compile(r"<function=(\w+)>(.*?)</function>", re.DOTALL)


# ── Helpers ──────────────────────────────────────────────────────────────

def _ensure_mascot(db: Session, user_id: str) -> Mascot:
    mascot = db.query(Mascot).filter(Mascot.user_id == user_id).first()
    if not mascot:
        raise HTTPException(
            status_code=400,
            detail="Companion not initialized — open the Companion page first",
        )
    return mascot


def _maybe_reset_week(mascot: Mascot) -> None:
    week_start = mascot.ai_week_start
    if week_start and week_start.tzinfo is None:
        week_start = week_start.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    if not week_start or now >= week_start + WEEK_LENGTH:
        mascot.ai_week_start = now
        mascot.ai_uses_this_week = 0


def _resets_at(mascot: Mascot) -> datetime:
    week_start = mascot.ai_week_start or datetime.now(timezone.utc)
    if week_start.tzinfo is None:
        week_start = week_start.replace(tzinfo=timezone.utc)
    return week_start + WEEK_LENGTH


def _build_context(db: Session, user_id: str) -> dict:
    settings = db.query(UserSettings).filter(UserSettings.user_id == user_id).first()
    base_currency = settings.base_currency if settings else "USD"

    # Fetch up to 50 recent transactions for aggregation; send a category
    # summary (covers the full history) plus the 5 most recent raw rows
    # (covers specific recent-activity questions) — far fewer tokens than
    # sending 10 raw objects while giving the AI more analytical data.
    all_tx = (
        db.query(Transaction)
        .filter(Transaction.user_id == user_id)
        .order_by(Transaction.created_at.desc())
        .limit(50)
        .all()
    )
    budgets = db.query(Budget).filter(Budget.user_id == user_id).all()
    goals = db.query(Goal).filter(Goal.user_id == user_id).all()

    # Aggregate by category across all fetched transactions
    totals: dict = defaultdict(lambda: {"income": 0.0, "expense": 0.0, "count": 0})
    for t in all_tx:
        cat = t.category or "Uncategorized"
        tx_type = t.type or "expense"
        totals[cat][tx_type] = round(totals[cat][tx_type] + float(t.amount or 0), 2)
        totals[cat]["count"] += 1
    spending_by_category = {
        cat: {k: v for k, v in data.items() if k == "count" or v != 0.0}
        for cat, data in totals.items()
    }

    recent_5 = [
        {
            "amount": round(float(t.amount), 2),
            "type": t.type,
            "category": t.category,
            "note": t.note,
            "date": t.date.strftime("%Y-%m-%d") if t.date else None,
        }
        for t in all_tx[:5]
    ]

    # Strip currency from budgets/goals — base_currency is already in the prompt
    budget_summary = [
        {"category": b.category, "limit": round(float(b.limit), 2), "period": b.period}
        for b in budgets
    ]
    goal_summary = [
        {
            "name": g.name,
            "target": round(float(g.target_amount), 2),
            "saved": round(float(g.current_amount), 2),
            "deadline": g.deadline.strftime("%Y-%m-%d") if g.deadline else None,
        }
        for g in goals
    ]

    return {
        "base_currency": base_currency,
        "spending_by_category": spending_by_category,
        "recent_transactions": recent_5,
        "budgets": budget_summary,
        "goals": goal_summary,
    }


def _build_system_prompt(mascot: Mascot, context: dict) -> str:
    species = "cat" if mascot.companion_type == "cat" else "dog"
    sound = "Meow!" if species == "cat" else "Woof!"
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    return (
        f"You are {mascot.companion_name}, a {species} financial advisor for PawPurse.\n"
        f"You are friendly, playful, and speak in first person as the pet.\n"
        f"Start responses with a relevant animal sound or expression occasionally ({sound}).\n"
        f"Keep responses concise (under 150 words unless the user asks for detail).\n"
        f"\n"
        f"RESPONSE FORMAT (follow strictly):\n"
        f"Reply in plain conversational sentences only, the way a pet would talk.\n"
        f"Never use markdown or any formatting: no asterisks, bold, italics, backticks, "
        f"code blocks, headings, bullet points, numbered lists, tables, or pipe characters.\n"
        f"Never write tool names, function names, JSON, or code-like text in your reply.\n"
        f"\n"
        f"TOOLS: you have exactly three tools, create_transaction, create_budget, and "
        f"create_goal.\n"
        f"Never call or mention any other tool. You do NOT have web search, brave_search, "
        f"or any other capability.\n"
        f"Only call a tool when the user explicitly asks to record a transaction, set a "
        f"budget, or create a savings goal; then call it directly instead of describing "
        f"what you would do.\n"
        f"\n"
        f"Today's date is {today}. When the user gives a relative date such as "
        f"'end of the year', 'next month', or 'tomorrow', resolve it relative to "
        f"today's date and pass the result as a YYYY-MM-DD string.\n"
        f"\n"
        f"The user's financial data (all amounts in {context['base_currency']}):\n"
        f"- Spending by category (up to last 50 transactions): {json.dumps(context['spending_by_category'])}\n"
        f"- Most recent 5 transactions: {json.dumps(context['recent_transactions'])}\n"
        f"- Budgets: {json.dumps(context['budgets'])}\n"
        f"- Goals: {json.dumps(context['goals'])}\n"
        f"Always give actionable advice based on the actual data above."
    )


def _groq_http_exc(e: Exception, context: str = "") -> HTTPException:
    """Map a Groq API error to the right HTTP exception.
    A 429 rate-limit becomes 503 with a user-facing message so the frontend
    can show something readable instead of a generic 502 Bad Gateway."""
    if "429" in str(e):
        return HTTPException(
            status_code=503,
            detail="The AI service is temporarily busy — please try again in a moment.",
        )
    label = f"Groq {context} error" if context else "Groq error"
    print(f"{label}: {e}")
    return HTTPException(status_code=502, detail="The AI service returned an error — please try again.")


def _strip_formatting(text: str) -> str:
    """Reduce a reply to plain prose. The model occasionally ignores the
    plain-text instruction and emits markdown or leaked function-call XML."""
    # Leaked function-call XML the model sometimes prints as text.
    # First pass: complete tags (opening + closing).
    text = re.sub(r"<function=\w+>.*?</function>", "", text, flags=re.DOTALL)
    # Second pass: truncated tags (max_tokens cut off the JSON before </function>
    # was written — the first pattern won't match, so remove to end-of-string).
    text = re.sub(r"<function=\w+>.*", "", text, flags=re.DOTALL)
    # Fenced code blocks and inline backticks
    text = re.sub(r"```[a-zA-Z]*\n?", "", text)
    text = text.replace("`", "")
    # Bold / italic asterisk markers — keep the words
    text = re.sub(r"\*{1,3}([^*\n]+)\*{1,3}", r"\1", text)
    # Markdown headings at line start
    text = re.sub(r"(?m)^\s{0,3}#{1,6}\s*", "", text)
    # Table separator rows like |---|---|
    text = re.sub(r"(?m)^\s*\|?[\s:|-]*\|[\s:|-]*$", "", text)
    # Any remaining table pipes
    text = text.replace("|", " ")
    # Bullet / numbered-list markers at line start
    text = re.sub(r"(?m)^\s*[-*+]\s+", "", text)
    text = re.sub(r"(?m)^\s*\d+\.\s+", "", text)
    # Collapse extra blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_transaction",
            "description": "Create a new transaction for the user",
            "parameters": {
                "type": "object",
                "properties": {
                    "amount": {"type": "number"},
                    "type": {"type": "string", "enum": ["income", "expense"]},
                    "category": {"type": "string"},
                    "note": {"type": "string"},
                    "date": {
                        "type": "string",
                        "description": "ISO date string YYYY-MM-DD",
                    },
                },
                "required": ["amount", "type", "category"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_budget",
            "description": "Create a new budget for a category",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {"type": "string"},
                    "limit": {"type": "number"},
                    "period": {
                        "type": "string",
                        "enum": ["daily", "weekly", "monthly"],
                    },
                },
                "required": ["category", "limit", "period"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_goal",
            "description": "Create a new savings goal for the user",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "target_amount": {"type": "number"},
                    "current_amount": {
                        "type": "number",
                        "description": "Amount already saved toward the goal, defaults to 0",
                    },
                    "deadline": {
                        "type": "string",
                        "description": "ISO date string YYYY-MM-DD",
                    },
                },
                "required": ["name", "target_amount"],
            },
        },
    },
]


def _execute_tool(
    db: Session, user_id: str, base_currency: str, name: str, args: dict
) -> dict:
    if name == "create_transaction":
        amount = float(args.get("amount", 0))
        if amount <= 0:
            return {"error": "amount must be positive"}
        if args.get("type") not in ("income", "expense"):
            return {"error": "type must be 'income' or 'expense'"}
        if not args.get("category"):
            return {"error": "category is required"}
        tx_date = None
        if args.get("date"):
            try:
                tx_date = datetime.fromisoformat(str(args["date"]))
            except ValueError:
                tx_date = None
        new_tx = Transaction(
            user_id=user_id,
            amount=amount,
            type=args["type"],
            category=args["category"],
            note=args.get("note"),
            date=tx_date or datetime.now(timezone.utc),
            currency=base_currency,
        )
        db.add(new_tx)
        db.commit()
        db.refresh(new_tx)
        return {
            "ok": True,
            "id": new_tx.id,
            "amount": new_tx.amount,
            "type": new_tx.type,
            "category": new_tx.category,
        }
    if name == "create_budget":
        limit = float(args.get("limit", 0))
        if limit <= 0:
            return {"error": "limit must be positive"}
        if args.get("period") not in ("daily", "weekly", "monthly"):
            return {"error": "period must be daily, weekly or monthly"}
        if not args.get("category"):
            return {"error": "category is required"}
        existing = (
            db.query(Budget)
            .filter(Budget.user_id == user_id, Budget.category == args["category"])
            .first()
        )
        if existing:
            existing.limit = limit
            existing.period = args["period"]
            db.commit()
            db.refresh(existing)
            return {
                "ok": True,
                "id": existing.id,
                "category": existing.category,
                "limit": existing.limit,
                "period": existing.period,
                "updated": True,
            }
        new_budget = Budget(
            user_id=user_id,
            category=args["category"],
            limit=limit,
            period=args["period"],
            currency=base_currency,
        )
        db.add(new_budget)
        db.commit()
        db.refresh(new_budget)
        return {
            "ok": True,
            "id": new_budget.id,
            "category": new_budget.category,
            "limit": new_budget.limit,
            "period": new_budget.period,
        }
    if name == "create_goal":
        target_amount = float(args.get("target_amount", 0))
        if target_amount <= 0:
            return {"error": "target_amount must be positive"}
        goal_name = args.get("name")
        if not goal_name:
            return {"error": "name is required"}
        current_amount = float(args.get("current_amount", 0) or 0)
        if current_amount < 0:
            current_amount = 0.0
        deadline = None
        if args.get("deadline"):
            try:
                deadline = datetime.fromisoformat(str(args["deadline"]))
            except ValueError:
                deadline = None
        new_goal = Goal(
            user_id=user_id,
            name=goal_name,
            target_amount=target_amount,
            current_amount=current_amount,
            deadline=deadline,
            currency=base_currency,
        )
        db.add(new_goal)
        db.commit()
        db.refresh(new_goal)
        return {
            "ok": True,
            "id": new_goal.id,
            "name": new_goal.name,
            "target_amount": new_goal.target_amount,
            "current_amount": new_goal.current_amount,
        }
    return {"error": f"Unknown tool: {name}"}


# ── Endpoints ────────────────────────────────────────────────────────────

# ── Chat session CRUD ─────────────────────────────────────────────────────

@router.get("/chats", response_model=List[ChatSessionResponse])
def list_chats(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(ChatSession)
        .filter(ChatSession.user_id == user_id)
        .order_by(ChatSession.created_at.desc())
        .all()
    )


@router.post("/chats", response_model=ChatSessionResponse, status_code=201)
def create_chat(
    data: CreateChatRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = ChatSession(user_id=user_id, title=data.title, messages=[])
    db.add(chat)
    db.commit()
    db.refresh(chat)
    return chat


@router.put("/chats/{chat_id}", response_model=ChatSessionResponse)
def update_chat(
    chat_id: str,
    data: UpdateChatRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = (
        db.query(ChatSession)
        .filter(ChatSession.id == chat_id, ChatSession.user_id == user_id)
        .first()
    )
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    if data.title is not None:
        chat.title = data.title
    if data.pinned is not None:
        chat.pinned = data.pinned
    if data.messages is not None:
        chat.messages = [m.model_dump(mode="json") for m in data.messages]
    chat.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(chat)
    return chat


@router.delete("/chats/{chat_id}", status_code=204)
def delete_chat(
    chat_id: str,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    chat = (
        db.query(ChatSession)
        .filter(ChatSession.id == chat_id, ChatSession.user_id == user_id)
        .first()
    )
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    db.delete(chat)
    db.commit()


@router.get("/usage", response_model=AdvisorUsageResponse)
def get_usage(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mascot = _ensure_mascot(db, user_id)
    _maybe_reset_week(mascot)
    db.commit()
    return AdvisorUsageResponse(
        uses_this_week=mascot.ai_uses_this_week,
        limit=WEEKLY_LIMIT,
        resets_at=_resets_at(mascot),
    )


@router.post("/chat", response_model=AdvisorChatResponse)
def chat(
    data: AdvisorChatRequest,
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        mascot = _ensure_mascot(db, user_id)
        _maybe_reset_week(mascot)

        if mascot.ai_uses_this_week >= WEEKLY_LIMIT:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "weekly_limit_reached",
                    "resets_at": _resets_at(mascot).isoformat(),
                },
            )

        context = _build_context(db, user_id)
        system_prompt = _build_system_prompt(mascot, context)
        base_currency = context["base_currency"]

        messages: List[dict] = [{"role": "system", "content": system_prompt}]
        history = [m for m in data.messages if m.role in ("user", "assistant")]
        for m in history[-MAX_HISTORY_MESSAGES:]:
            messages.append({"role": m.role, "content": m.content[:MAX_MESSAGE_CHARS]})

        client = get_groq_client()
        try:
            response = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=messages,
                tools=TOOLS,
                tool_choice="auto",
                max_tokens=400,
                temperature=0.7,
                timeout=30,
            )
        except Exception as e:
            # The model occasionally hallucinates a tool not in TOOLS (e.g.
            # brave_search); Groq rejects the whole request with a 400
            # tool_use_failed. Retry once without tools for a plain answer.
            if "tool_use_failed" not in str(e):
                raise _groq_http_exc(e)
            try:
                response = client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=messages,
                    max_tokens=400,
                    temperature=0.7,
                    timeout=30,
                )
            except Exception as retry_err:
                raise _groq_http_exc(retry_err, "retry")

        choice = response.choices[0]
        msg = choice.message
        tool_results: List[dict] = []

        # Detect a leaked function call in text content (model put the call in
        # msg.content instead of msg.tool_calls).  Execute the tool so the
        # user's action isn't silently lost, then get a natural confirmation.
        leaked_match = (
            None
            if getattr(msg, "tool_calls", None)
            else _LEAKED_CALL_RE.search(msg.content or "")
        )
        if leaked_match:
            tool_name = leaked_match.group(1)
            raw_args = leaked_match.group(2).strip()
            try:
                args = json.loads(raw_args)
            except json.JSONDecodeError:
                args = {}
            result = _execute_tool(db, user_id, base_currency, tool_name, args)
            tool_results.append({"name": tool_name, "result": result})
            synth_id = "leaked_0"
            messages.append(
                {
                    "role": "assistant",
                    "content": "",
                    "tool_calls": [
                        {
                            "id": synth_id,
                            "type": "function",
                            "function": {"name": tool_name, "arguments": raw_args},
                        }
                    ],
                }
            )
            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": synth_id,
                    "content": json.dumps(result),
                }
            )
            try:
                follow_up = client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=messages,
                    max_tokens=300,
                    temperature=0.7,
                    timeout=30,
                )
                final_message = follow_up.choices[0].message.content or ""
            except Exception as e:
                raise _groq_http_exc(e, "follow-up")
        elif getattr(msg, "tool_calls", None):
            messages.append(
                {
                    "role": "assistant",
                    "content": msg.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in msg.tool_calls
                    ],
                }
            )

            for tc in msg.tool_calls:
                try:
                    args = json.loads(tc.function.arguments or "{}")
                except json.JSONDecodeError:
                    args = {}
                result = _execute_tool(db, user_id, base_currency, tc.function.name, args)
                tool_results.append({"name": tc.function.name, "result": result})
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result),
                    }
                )

            try:
                follow_up = client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=messages,
                    max_tokens=300,
                    temperature=0.7,
                    timeout=30,
                )
                final_message = follow_up.choices[0].message.content or ""
            except Exception as e:
                raise _groq_http_exc(e, "follow-up")
        else:
            final_message = msg.content or ""

        final_message = _strip_formatting(final_message)

        mascot.ai_uses_this_week += 1
        db.commit()
        db.refresh(mascot)

        return AdvisorChatResponse(
            message=final_message,
            uses_this_week=mascot.ai_uses_this_week,
            limit=WEEKLY_LIMIT,
            tool_results=tool_results or None,
        )
    except HTTPException:
        raise
    except Exception:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Unexpected error in AI advisor")
