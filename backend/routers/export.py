import csv
import io
from fpdf import FPDF
from fastapi.responses import StreamingResponse
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models.transaction import Transaction
from core.database import get_db
from core.auth import get_current_user

router = APIRouter(
    prefix="/export",
    tags=["export"]
)

@router.get("/csv")
def get_transactions(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    transactions = db.query(Transaction).filter(Transaction.user_id == user_id).all()
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["ID", "Date" , "Type", "Category", "Amount", "Currency", "Note"])
    for transaction in transactions:
        writer.writerow([
            transaction.id,
            transaction.date,
            transaction.type,
            transaction.category,
            transaction.amount,
            transaction.currency or "USD",
            transaction.note or ""
        ])
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=transactions.csv"}
    )

@router.get("/pdf")
def export_pdf(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    transactions = db.query(Transaction).filter(
        Transaction.user_id == user_id
    ).all()

    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Helvetica", size=12)

    # title
    pdf.cell(0, 10, "Smart Finance Tracker - Transaction Report", ln=True, align="C")
    pdf.ln(5)

    # column headers
    pdf.set_font("Helvetica", style="B", size=10)
    pdf.cell(20, 8, "ID", border=1)
    pdf.cell(30, 8, "Date", border=1)
    pdf.cell(25, 8, "Type", border=1)
    pdf.cell(35, 8, "Category", border=1)
    pdf.cell(25, 8, "Amount", border=1)
    pdf.cell(20, 8, "Currency", border=1)
    pdf.cell(45, 8, "Note", border=1)
    pdf.ln()

    # data rows
    pdf.set_font("Helvetica", size=9)
    for t in transactions:
        pdf.cell(20, 8, str(t.id), border=1)
        pdf.cell(30, 8, str(t.date)[:10], border=1)
        pdf.cell(25, 8, t.type, border=1)
        pdf.cell(35, 8, t.category, border=1)
        pdf.cell(25, 8, str(t.amount), border=1)
        pdf.cell(20, 8, t.currency or "USD", border=1)
        pdf.cell(45, 8, t.note or "", border=1)
        pdf.ln()

    buffer = io.BytesIO(pdf.output())
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=transactions.pdf"}
    )