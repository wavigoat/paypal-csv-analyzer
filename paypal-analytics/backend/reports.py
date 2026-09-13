import io

import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle


def build_csv_report(df: pd.DataFrame) -> io.BytesIO:
    """Cleaned, categorized transaction-level export."""
    cols = [c for c in [
        "ParsedDate", "Description", "Category", "Name", "From Email Address",
        "Gross", "Fee", "Net", "Currency",
    ] if c in df.columns]
    out = df[cols].sort_values("ParsedDate").rename(columns={"ParsedDate": "Date"})
    buf = io.BytesIO()
    out.to_csv(buf, index=False)
    buf.seek(0)
    return buf


def build_pdf_report(analytics: dict, filename: str, date_range: dict) -> io.BytesIO:
    """One-page executive summary PDF: headline metrics, revenue by month,
    fees, and top customers (if available)."""
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter, topMargin=0.6 * inch, bottomMargin=0.6 * inch)
    styles = getSampleStyleSheet()
    story = []

    story.append(Paragraph("PayPal Revenue Report", styles["Title"]))
    story.append(Paragraph(f"Source file: {filename}", styles["Normal"]))
    story.append(Paragraph(f"Period: {date_range['min']} to {date_range['max']}", styles["Normal"]))
    story.append(Spacer(1, 0.25 * inch))

    m = analytics["metrics"]
    metric_rows = [
        ["Metric", "Value"],
        ["Gross Revenue", f"${m['total_gross']:,.2f}"],
        ["Net Revenue", f"${m['total_net']:,.2f}"],
        ["Total Fees", f"${m['total_fees']:,.2f} ({m['fee_pct']}%)"],
        ["Refunds", f"${m['total_refunds']:,.2f}"],
        ["Transactions", f"{m['transaction_count']:,}"],
        ["Avg / Median Transaction", f"${m['avg_transaction']:,.2f} / ${m['median_transaction']:,.2f}"],
        ["Largest Transaction", f"${m['largest_transaction']:,.2f}"],
    ]
    story.append(Paragraph("Summary", styles["Heading2"]))
    story.append(_table(metric_rows))
    story.append(Spacer(1, 0.25 * inch))

    story.append(Paragraph("Revenue by Month", styles["Heading2"]))
    month_rows = [["Month", "Revenue", "MoM Growth"]]
    for row in analytics["revenue_by_month"]:
        growth = f"{row['growth_pct']}%" if row["growth_pct"] is not None else "—"
        month_rows.append([row["month"], f"${row['revenue']:,.2f}", growth])
    story.append(_table(month_rows))
    story.append(Spacer(1, 0.25 * inch))

    if analytics.get("customers"):
        story.append(Paragraph("Top Customers", styles["Heading2"]))
        cust_rows = [["Customer", "Purchases", "Total Spent"]]
        for c in analytics["customers"]["top_customers"][:10]:
            cust_rows.append([c["name"], str(c["purchases"]), f"${c['total_spent']:,.2f}"])
        story.append(_table(cust_rows))

    doc.build(story)
    buf.seek(0)
    return buf


def _table(rows: list[list[str]]) -> Table:
    t = Table(rows, hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f2937")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t