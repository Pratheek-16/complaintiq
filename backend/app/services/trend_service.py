from datetime import datetime, timedelta
from typing import Any
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.models.complaint import Complaint
from app.schemas.analytics import TrendAnalysisResponse, EmergingIssueAlert

class TrendService:
    @staticmethod
    def get_trends(
        db: Session,
        period_type: str = "monthly",
        top_n_categories: int = 6
    ) -> TrendAnalysisResponse:
        """
        Aggregates complaint volume by date period (monthly, weekly, daily) and category.
        """
        # Check if date exists
        has_dates = db.query(Complaint).filter(Complaint.received_at.isnot(None)).first() is not None
        if not has_dates:
            return TrendAnalysisResponse(
                period_type=period_type,
                series=[],
                categories=[],
                time_labels=[]
            )

        # Get top categories by total volume
        top_cats_query = (
            db.query(Complaint.actual_category, func.count(Complaint.id).label("cnt"))
            .filter(Complaint.actual_category.isnot(None))
            .filter(Complaint.actual_category != "")
            .group_by(Complaint.actual_category)
            .order_by(func.count(Complaint.id).desc())
            .limit(top_n_categories)
            .all()
        )
        top_categories = [c[0] for c in top_cats_query]

        # Fetch all dated records for these top categories
        records = (
            db.query(Complaint.actual_category, Complaint.received_at)
            .filter(Complaint.received_at.isnot(None))
            .filter(Complaint.actual_category.in_(top_categories))
            .order_by(Complaint.received_at.asc())
            .all()
        )

        # Aggregate counts by period label and category
        period_map: dict[str, dict[str, int]] = {}

        for cat, rec_date in records:
            if period_type == "daily":
                p_label = rec_date.strftime("%Y-%m-%d")
            elif period_type == "weekly":
                p_label = rec_date.strftime("%Y-W%U")
            else: # monthly
                p_label = rec_date.strftime("%Y-%m")

            if p_label not in period_map:
                period_map[p_label] = {c: 0 for c in top_categories}
            period_map[p_label][cat] = period_map[p_label].get(cat, 0) + 1

        time_labels = sorted(list(period_map.keys()))
        series_data = []

        for p_label in time_labels:
            point: dict[str, Any] = {"period": p_label}
            for cat in top_categories:
                point[cat] = period_map[p_label].get(cat, 0)
            series_data.append(point)

        return TrendAnalysisResponse(
            period_type=period_type,
            series=series_data,
            categories=top_categories,
            time_labels=time_labels
        )

    @staticmethod
    def detect_emerging_issues(
        db: Session,
        growth_threshold: float = 0.40,
        min_current_volume: int = 5
    ) -> list[EmergingIssueAlert]:
        """
        Detects categories whose volume is surging compared to their previous period.
        Handles zero-volume baselines safely and retrieves supporting complaint examples.
        """
        # Determine latest date in DB
        latest_record = db.query(Complaint.received_at).filter(Complaint.received_at.isnot(None)).order_by(Complaint.received_at.desc()).first()
        if not latest_record or not latest_record[0]:
            return []

        latest_date = latest_record[0]
        # Recent period: last 30 days of data
        period_days = 30
        current_start = latest_date - timedelta(days=period_days)
        previous_start = current_start - timedelta(days=period_days)

        # Count per category in current period
        current_counts = dict(
            db.query(Complaint.actual_category, func.count(Complaint.id))
            .filter(Complaint.received_at >= current_start)
            .filter(Complaint.received_at <= latest_date)
            .filter(Complaint.actual_category.isnot(None))
            .group_by(Complaint.actual_category)
            .all()
        )

        # Count per category in previous period
        previous_counts = dict(
            db.query(Complaint.actual_category, func.count(Complaint.id))
            .filter(Complaint.received_at >= previous_start)
            .filter(Complaint.received_at < current_start)
            .filter(Complaint.actual_category.isnot(None))
            .group_by(Complaint.actual_category)
            .all()
        )

        alerts: list[EmergingIssueAlert] = []

        for cat, curr_vol in current_counts.items():
            if curr_vol < min_current_volume:
                continue

            prev_vol = previous_counts.get(cat, 0)
            abs_change = curr_vol - prev_vol

            # Handle zero baseline safely
            if prev_vol == 0:
                pct_change = 100.0 # Brand new emerging issue
                trigger_rule = f"New volume spike ({curr_vol} complaints in last {period_days} days from 0 previously)"
            else:
                pct_change = round(((curr_vol - prev_vol) / prev_vol) * 100, 2)
                trigger_rule = f"Volume grew by {pct_change}% (from {prev_vol} to {curr_vol}) exceeding threshold ({growth_threshold * 100}%)"

            if (pct_change / 100.0) >= growth_threshold or (prev_vol == 0 and curr_vol >= min_current_volume):
                # Alert level
                if pct_change >= 100.0 or curr_vol >= 50:
                    alert_level = "Critical"
                elif pct_change >= 50.0:
                    alert_level = "Warning"
                else:
                    alert_level = "Watch"

                # Supporting complaints
                examples = (
                    db.query(Complaint.id, Complaint.original_text, Complaint.received_at, Complaint.company)
                    .filter(Complaint.actual_category == cat)
                    .filter(Complaint.received_at >= current_start)
                    .order_by(Complaint.received_at.desc())
                    .limit(3)
                    .all()
                )

                supporting = [
                    {
                        "id": ex[0],
                        "text": ex[1][:250] + ("..." if len(ex[1]) > 250 else ""),
                        "received_at": ex[2].strftime("%Y-%m-%d") if ex[2] else None,
                        "company": ex[3]
                    }
                    for ex in examples
                ]

                alerts.append(
                    EmergingIssueAlert(
                        category=cat,
                        current_volume=curr_vol,
                        previous_volume=prev_vol,
                        absolute_change=abs_change,
                        percentage_change=pct_change,
                        time_window=f"{current_start.strftime('%Y-%m-%d')} to {latest_date.strftime('%Y-%m-%d')}",
                        alert_level=alert_level,
                        trigger_rule=trigger_rule,
                        supporting_complaints=supporting
                    )
                )

        # Sort by percentage change and volume
        alerts.sort(key=lambda x: (x.percentage_change, x.current_volume), reverse=True)
        return alerts
