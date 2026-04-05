import tkinter as tk
import tkinter.ttk as ttk
from colors_scheme import COLORS
from datetime import datetime
from core.data_manager import (
    get_transaction,
    get_budget,
)
from core.algorithm import (
    analyze_budgets,
    generate_advice
)

def build_dashboard_page(frame,data):
    advice_list = generate_advice(data)
    budget_analysis = analyze_budgets(data)
    transactions = get_transaction(data)
    total_income = sum(total["amount"] for total in transactions if total["type"] == "income")
    total_expense = sum(total["amount"] for total in transactions if total["type"] == "expense")
    balance =  total_income - total_expense
    #widgets section
    page_title = tk.Label(
        frame,
        text = "📊 Dashboard",
        bg=COLORS["bg_main"],
        fg=COLORS["text_primary"],
        font = ("Segoe UI", 18, "bold")
    )
    card_frame = tk.Frame(
        frame,
        bg=COLORS["bg_main"],
        relief="solid"
    )
    cards = [
          ("💰 Total Income",total_income,COLORS["status_acceptable"]),
          ("💸 Total Expense",total_expense,COLORS["status_exceeded"]),
          ("🏦 Balance",balance,COLORS["accent"])
    ]
    spending_label = tk.Label(
        frame,
        text = "📊 Spending by Category",
        bg= COLORS["bg_main"],
        fg= COLORS["text_primary"],
        font = ("Segoe UI", 13, "bold"),
    )
    spending_frame = tk.LabelFrame(
        frame,
        text = "",
        bg=COLORS["bg_card"],
        fg=COLORS["text_secondary"]
    )
    page_title.pack(anchor="w",padx=20,pady=15)
    card_frame.pack(fill="x",padx=20,pady=10)
    card_frame.columnconfigure(0, weight=1,minsize=400)
    card_frame.columnconfigure(1, weight=1,minsize=400)
    card_frame.columnconfigure(2, weight=1,minsize=400)
    spending_label.pack(anchor="w",padx=20,pady=(15,5))
    spending_frame.pack(fill="x",padx=20,pady=10)
    
    for index, (title,amount,color) in enumerate(cards): #enumerate gets the position number storing inside index
        card = tk.Frame(
            card_frame,
            bg = color,
            relief="solid",
            bd=2
        )
        title_label = tk.Label(
            card,
            text = title,
            bg = color,
            fg=COLORS["text_light"],
            font = ("Segoe UI", 16, "bold")
        )
        amount_label = tk.Label(
            card,
            text = amount,
            bg = color,
            fg=COLORS["text_light"],
            font = ("Segoe UI", 20, "bold")
        )
        card.grid(row=0,column=index,sticky="ew",padx=10,pady=5,)
        title_label.grid(row=0,column=0,padx=20, pady=10)
        amount_label.grid(row=1,column=0,padx=20, pady=10)

    if not budget_analysis: #if budget_analysis is empty 
        tk.Label(
            spending_frame,
            text="No budgets set yet.",
            bg=COLORS["bg_card"],
            fg=COLORS["text_secondary"],
            font = ("Segoe UI", 13)
        ).pack(fill="x")

    for category, analysis in budget_analysis.items():
        row_frame = tk.Frame(
            spending_frame,
            bg=COLORS["bg_card"],
        )
        category_label = tk.Label(
            row_frame,
            text = category,
            width=12,
            anchor="w"
        )
        percentage_label = tk.Label(
            row_frame,
            text=f'{round(analysis["used_percentage"],1)}%',
        )
        if analysis["status"] == "exceeded":
            bar_color = COLORS["status_exceeded"]
        elif analysis["status"] == "warning":
            bar_color = COLORS["status_warning"]
        elif analysis["status"] == "caution":
            bar_color = COLORS["status_caution"]
        else:
            bar_color = COLORS["status_acceptable"]

        outer_frame = tk.Frame (
            row_frame,
            bg="#e0d9d0",
            height=20
        )
        fill_width = min(analysis["used_percentage"], 100) /100
        inner_bar = tk.Frame(
            outer_frame,
            bg=bar_color,
            height=20
        )

        outer_frame.pack(side="right",fill="x",expand=True,padx=10)
        inner_bar.place(relx=0,rely=0,relwidth=fill_width,relheight=1)
            
        row_frame.pack(fill="x", padx=10, pady=5)
        category_label.pack(side="left")
        percentage_label.pack(side="left")

    alert_label = tk.Label(
        frame,
        text="🤖 Smart Alerts",
        bg= COLORS["bg_main"],
        fg= COLORS["text_primary"],
        font = ("Segoe UI", 13, "bold"),
    )
    alert_frame = tk.LabelFrame(
        frame,
        text = "",
        bg=COLORS["bg_card"],
        fg=COLORS["text_secondary"]
    )
    alert_label.pack(anchor="w",padx=20,pady=(15,5))
    alert_frame.pack(fill="x",padx=20,pady=10)
    if not advice_list:
        tk.Label(
            alert_frame,
            text="No alerts at this time.",
            bg=COLORS["bg_card"],
            fg=COLORS["text_secondary"],
            font = ("Segoe UI", 13)
        ).pack(fill="x",pady=5)
    else:
        for advice in advice_list:
            if advice.startswith("🔴"):
                bg_color = COLORS["status_exceeded"]
            elif advice.startswith("⚠️"):
                bg_color = COLORS["status_warning"]
            elif advice.startswith("🟡"):
                bg_color = COLORS["status_caution"]
            else:
                bg_color = COLORS["status_acceptable"]

            advice = tk.Label(
                alert_frame,
                text = advice,
                bg = bg_color,
                fg=COLORS["text_primary"],
                font=("Segoe UI", 10),
                anchor="w"
            )
            advice.pack(fill="x", padx=10, pady=3, anchor="w")


        

        