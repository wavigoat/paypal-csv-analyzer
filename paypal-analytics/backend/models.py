from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, func

from db import Base


class AnalysisRun(Base):
    """
    One row per CSV upload. Deliberately stores only aggregated numbers —
    never the raw transaction rows and never customer names/emails — in
    keeping with the "don't persist raw financial data" design decision
    from Version 1.
    """
    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String, index=True)  # links back to the in-memory session, if still alive
    filename = Column(String, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    date_range_start = Column(String)
    date_range_end = Column(String)
    currencies = Column(JSON)  # list[str]

    transaction_count = Column(Integer)
    total_gross = Column(Float)
    total_fees = Column(Float)
    total_net = Column(Float)
    total_refunds = Column(Float)
    avg_transaction = Column(Float)
    median_transaction = Column(Float)
    largest_transaction = Column(Float)
    fee_pct = Column(Float)
    avg_fee = Column(Float)

    # Aggregated, non-PII customer stats only — no emails, no names, no per-customer rows.
    unique_customers = Column(Integer, nullable=True)
    repeat_customers = Column(Integer, nullable=True)
    avg_customer_revenue = Column(Float, nullable=True)
    retention_rate = Column(Float, nullable=True)

    revenue_by_month = Column(JSON)       # [{month, revenue, growth_pct}]
    categories_breakdown = Column(JSON)   # [{category, count, total}]
    best_month = Column(JSON, nullable=True)
    best_day_of_week = Column(JSON, nullable=True)

    def to_summary_dict(self) -> dict:
        return {
            "id": self.id,
            "filename": self.filename,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "date_range_start": self.date_range_start,
            "date_range_end": self.date_range_end,
            "transaction_count": self.transaction_count,
            "total_gross": self.total_gross,
            "total_net": self.total_net,
        }

    def to_detail_dict(self) -> dict:
        return {
            "id": self.id,
            "session_id": self.session_id,
            "filename": self.filename,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "date_range": {"start": self.date_range_start, "end": self.date_range_end},
            "currencies": self.currencies,
            "metrics": {
                "total_gross": self.total_gross,
                "total_fees": self.total_fees,
                "total_net": self.total_net,
                "total_refunds": self.total_refunds,
                "transaction_count": self.transaction_count,
                "avg_transaction": self.avg_transaction,
                "median_transaction": self.median_transaction,
                "largest_transaction": self.largest_transaction,
                "fee_pct": self.fee_pct,
                "avg_fee": self.avg_fee,
            },
            "customers": {
                "unique_customers": self.unique_customers,
                "repeat_customers": self.repeat_customers,
                "avg_customer_revenue": self.avg_customer_revenue,
                "retention_rate": self.retention_rate,
            } if self.unique_customers is not None else None,
            "revenue_by_month": self.revenue_by_month,
            "categories_breakdown": self.categories_breakdown,
            "trends": {
                "best_month": self.best_month,
                "best_day_of_week": self.best_day_of_week,
            },
        }