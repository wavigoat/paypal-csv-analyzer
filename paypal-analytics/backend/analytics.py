"""
Pure data-processing logic for PayPal CSV exports: validation, cleaning,
categorization, and the analytics computed on any given slice of data.
Kept separate from main.py (the API layer) so the exact same function
computes stats for the full upload AND for any filtered view.
"""
import pandas as pd

REQUIRED_COLUMNS = ["Date", "Description", "Currency", "Gross", "Fee", "Net"]

# Transaction types that represent money coming IN from a customer purchase.
# (Combined with Gross > 0, since refunds share these same Description
# values but show up as a negative Gross.)
REVENUE_TYPES = {
    "General Payment",
    "Express Checkout Payment",
    "Mobile Payment",
    "Mobile Express Checkout",
    "Mobile Express Checkout Payment",
    "Website Payment",
    "Subscription Payment",
    "Recurring Payment",
    "Mass Pay Payment",
}

# Marketplace / platform fees that show up as their OWN transaction row.
PARTNER_FEE_TYPES = {"Partner Fee"}

WITHDRAWAL_TYPES = {"User Initiated Withdrawal", "Bank Deposit to PP Account"}
BILL_PAYMENT_TYPES = {"PreApproved Payment Bill User Payment"}
HOLD_TYPES = {"Account Hold for Open Authorization", "Reversal of General Account Hold"}

DOW_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def classify_category(description: str, gross: float) -> str:
    """Bucket every transaction into a human-readable category, regardless
    of whether it counts as 'revenue' for the headline metrics."""
    if description in REVENUE_TYPES:
        return "Revenue" if gross > 0 else "Refund"
    if description in PARTNER_FEE_TYPES:
        return "Fee"
    if description in WITHDRAWAL_TYPES:
        return "Withdrawal"
    if description in BILL_PAYMENT_TYPES:
        return "Bill Payment"
    if description in HOLD_TYPES:
        return "Hold/Reversal"
    return "Other"


def clean_and_validate(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Validate a raw upload and return (cleaned_df, validation_summary).
    Raises ValueError with a user-facing message on bad input."""

    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(
            f"This doesn't look like a PayPal Activity CSV export. "
            f"Missing expected column(s): {', '.join(missing)}"
        )
    if df.empty:
        raise ValueError("The CSV has no transactions in it.")

    currencies = sorted(df["Currency"].dropna().unique().tolist())
    raw_transaction_count = len(df)

    for col in ["Gross", "Fee", "Net"]:
        df[col] = pd.to_numeric(
            df[col].astype(str).str.replace(",", "").str.replace("$", ""),
            errors="coerce",
        ).fillna(0)

    df["ParsedDate"] = pd.to_datetime(df["Date"], errors="coerce")
    date_parse_failures = int(df["ParsedDate"].isna().sum())
    df = df.dropna(subset=["ParsedDate"])

    dedupe_key = "Transaction ID" if "Transaction ID" in df.columns else None
    before = len(df)
    df = df.drop_duplicates(subset=[dedupe_key]) if dedupe_key else df.drop_duplicates()
    duplicates_removed = before - len(df)

    if df.empty:
        raise ValueError("No transactions had a valid, parseable date.")

    df["Year"] = df["ParsedDate"].dt.year
    df["Month"] = df["ParsedDate"].dt.strftime("%Y-%m")
    df["Week"] = df["ParsedDate"].dt.strftime("%Y-W%U")
    df["DayOfWeek"] = df["ParsedDate"].dt.day_name()
    df["Category"] = [classify_category(d, g) for d, g in zip(df["Description"], df["Gross"])]

    validation = {
        "paypal_csv_detected": True,
        "transactions_found": raw_transaction_count,
        "date_column_valid": date_parse_failures == 0,
        "date_parse_failures": date_parse_failures,
        "amount_columns_valid": True,
        "currencies": currencies,
        "duplicates_removed": int(duplicates_removed),
        "date_range": {
            "min": df["ParsedDate"].min().strftime("%Y-%m-%d"),
            "max": df["ParsedDate"].max().strftime("%Y-%m-%d"),
        },
    }
    return df, validation


def compute_analytics(df: pd.DataFrame) -> dict:
    """Compute the full analytics payload for whatever slice of the
    (already cleaned) dataframe is passed in. Used for both the full
    dataset and any filtered subset."""

    is_revenue_type = df["Description"].isin(REVENUE_TYPES)
    revenue_df = df[is_revenue_type & (df["Gross"] > 0)].copy()
    refunds_df = df[is_revenue_type & (df["Gross"] < 0)].copy()
    partner_fees_df = df[df["Description"].isin(PARTNER_FEE_TYPES)].copy()

    total_gross = float(revenue_df["Gross"].sum())
    total_refunds = float(abs(refunds_df["Gross"].sum()))
    total_paypal_fees = float(abs(revenue_df["Fee"].sum()))
    total_partner_fees = float(abs(partner_fees_df["Gross"].sum()))
    total_fees = round(total_paypal_fees + total_partner_fees, 2)
    total_net = round(total_gross - total_fees - total_refunds, 2)

    revenue_by_month_series = revenue_df.groupby("Month")["Gross"].sum().sort_index()
    months = revenue_by_month_series.index.tolist()
    revenue_by_month = []
    for i, m in enumerate(months):
        val = float(revenue_by_month_series[m])
        growth_pct = None
        if i > 0:
            prev = float(revenue_by_month_series[months[i - 1]])
            if prev != 0:
                growth_pct = round((val - prev) / abs(prev) * 100, 1)
        revenue_by_month.append({"month": m, "revenue": round(val, 2), "growth_pct": growth_pct})

    revenue_by_day_series = (
        revenue_df.groupby(revenue_df["ParsedDate"].dt.strftime("%Y-%m-%d"))["Gross"]
        .sum()
        .sort_index()
    )
    timeseries = [{"date": d, "revenue": round(float(v), 2)} for d, v in revenue_by_day_series.items()]

    transaction_count = int(len(revenue_df))
    avg_transaction = round(float(revenue_df["Gross"].mean()), 2) if transaction_count else 0.0
    median_transaction = round(float(revenue_df["Gross"].median()), 2) if transaction_count else 0.0
    largest_transaction = round(float(revenue_df["Gross"].max()), 2) if transaction_count else 0.0

    transactions_per_month = [
        {"month": m, "count": int(c)}
        for m, c in revenue_df.groupby("Month").size().sort_index().items()
    ]

    fee_pct = round((total_fees / total_gross) * 100, 2) if total_gross else 0.0
    avg_fee = round(total_fees / transaction_count, 2) if transaction_count else 0.0

    best_month = None
    if not revenue_by_month_series.empty:
        bm = revenue_by_month_series.idxmax()
        best_month = {"month": bm, "revenue": round(float(revenue_by_month_series[bm]), 2)}

    rev_by_dow = revenue_df.groupby("DayOfWeek")["Gross"].sum().reindex(DOW_ORDER).fillna(0)
    best_day_of_week = None
    if rev_by_dow.sum() > 0:
        bd = rev_by_dow.idxmax()
        best_day_of_week = {"day": bd, "revenue": round(float(rev_by_dow[bd]), 2)}
    revenue_by_day_of_week = [{"day": d, "revenue": round(float(rev_by_dow[d]), 2)} for d in DOW_ORDER]

    growth_periods = []
    current = None
    for row in revenue_by_month:
        if row["growth_pct"] is None:
            continue
        direction = "growth" if row["growth_pct"] >= 0 else "decline"
        if current and current["direction"] == direction:
            current["end_month"] = row["month"]
        else:
            if current:
                growth_periods.append(current)
            current = {"direction": direction, "start_month": row["month"], "end_month": row["month"]}
    if current:
        growth_periods.append(current)

    customer_stats = None
    if "From Email Address" in revenue_df.columns:
        cust_df = revenue_df.dropna(subset=["From Email Address"])
        cust_df = cust_df[cust_df["From Email Address"].astype(str).str.strip() != ""]
        if not cust_df.empty:
            grouped = (
                cust_df.groupby("From Email Address")
                .agg(total_spent=("Gross", "sum"), purchases=("Gross", "count"), name=("Name", "first"))
                .reset_index()
            )
            unique_customers = int(len(grouped))
            repeat_customers = int((grouped["purchases"] > 1).sum())
            avg_customer_revenue = round(float(grouped["total_spent"].mean()), 2)
            avg_purchase_frequency = round(float(grouped["purchases"].mean()), 2)
            retention_rate = round((repeat_customers / unique_customers) * 100, 1) if unique_customers else 0.0

            top = grouped.sort_values("total_spent", ascending=False).head(10)
            top_customers = [
                {
                    "email": row["From Email Address"],
                    "name": row["name"] if pd.notna(row["name"]) and str(row["name"]).strip() else row["From Email Address"],
                    "total_spent": round(float(row["total_spent"]), 2),
                    "purchases": int(row["purchases"]),
                }
                for _, row in top.iterrows()
            ]
            customer_stats = {
                "unique_customers": unique_customers,
                "repeat_customers": repeat_customers,
                "avg_customer_revenue": avg_customer_revenue,
                "avg_purchase_frequency": avg_purchase_frequency,
                "retention_rate": retention_rate,
                "top_customers": top_customers,
            }

    # Category breakdown across ALL transactions in this slice (not just revenue)
    cat_group = df.groupby("Category").agg(
        count=("Gross", "count"), total=("Gross", lambda s: float(s.abs().sum()))
    ).reset_index()
    categories_breakdown = [
        {"category": row["Category"], "count": int(row["count"]), "total": round(row["total"], 2)}
        for _, row in cat_group.sort_values("total", ascending=False).iterrows()
    ]

    return {
        "metrics": {
            "total_gross": round(total_gross, 2),
            "total_fees": total_fees,
            "total_net": total_net,
            "total_refunds": round(total_refunds, 2),
            "transaction_count": transaction_count,
            "avg_transaction": avg_transaction,
            "median_transaction": median_transaction,
            "largest_transaction": largest_transaction,
            "fee_pct": fee_pct,
            "avg_fee": avg_fee,
        },
        "timeseries": timeseries,
        "revenue_by_month": revenue_by_month,
        "revenue_by_day_of_week": revenue_by_day_of_week,
        "transactions_per_month": transactions_per_month,
        "categories_breakdown": categories_breakdown,
        "trends": {
            "best_month": best_month,
            "best_day_of_week": best_day_of_week,
            "growth_periods": growth_periods,
        },
        "customers": customer_stats,
    }


def apply_filters(df: pd.DataFrame, start_date: str | None, end_date: str | None,
                   categories: list[str] | None) -> pd.DataFrame:
    """Apply date-range and category filters to an already-cleaned dataframe."""
    out = df
    if start_date:
        out = out[out["ParsedDate"] >= pd.to_datetime(start_date)]
    if end_date:
        out = out[out["ParsedDate"] <= pd.to_datetime(end_date)]
    if categories:
        out = out[out["Category"].isin(categories)]
    return out