from datetime import datetime, timedelta
from typing import Any
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.config import settings
from app.models.complaint import Complaint
from app.schemas.analytics import PriorityScoreBreakdown

class PriorityService:
    @staticmethod
    def calculate_priorities(
        db: Session,
        volume_weight: float | None = None,
        severity_weight: float | None = None,
        growth_weight: float | None = None
    ) -> list[PriorityScoreBreakdown]:
        """
        Calculates explainable priority scores for each complaint category.
        If severity is unavailable in the dataset, automatically shifts to a documented
        volume-and-growth 2-factor formulation without fabricating fake severity.
        """
        w_vol = volume_weight if volume_weight is not None else settings.DEFAULT_PRIORITY_VOLUME_WEIGHT
        w_sev = severity_weight if severity_weight is not None else settings.DEFAULT_PRIORITY_SEVERITY_WEIGHT
        w_gro = growth_weight if growth_weight is not None else settings.DEFAULT_PRIORITY_GROWTH_WEIGHT

        # 1. Check if severity data is available
        severity_sample = (
            db.query(Complaint.severity)
            .filter(Complaint.severity.isnot(None))
            .filter(Complaint.severity != "")
            .first()
        )
        is_severity_available = severity_sample is not None

        # Re-normalize weights if severity is absent
        if not is_severity_available:
            total_active_w = w_vol + w_gro
            if total_active_w > 0:
                w_vol = round(w_vol / total_active_w, 2)
                w_gro = round(1.0 - w_vol, 2)
                w_sev = 0.0

        # 2. Get category volume counts
        category_counts = dict(
            db.query(Complaint.actual_category, func.count(Complaint.id))
            .filter(Complaint.actual_category.isnot(None))
            .filter(Complaint.actual_category != "")
            .group_by(Complaint.actual_category)
            .all()
        )

        if not category_counts:
            return []

        max_volume = max(category_counts.values()) or 1

        # 3. Compute growth rate per category (comparing last 30 days vs prior 30 days)
        latest_record = db.query(Complaint.received_at).filter(Complaint.received_at.isnot(None)).order_by(Complaint.received_at.desc()).first()
        growth_rates: dict[str, float] = {}
        if latest_record and latest_record[0]:
            latest_date = latest_record[0]
            current_start = latest_date - timedelta(days=30)
            previous_start = current_start - timedelta(days=30)

            cur_counts = dict(
                db.query(Complaint.actual_category, func.count(Complaint.id))
                .filter(Complaint.received_at >= current_start)
                .group_by(Complaint.actual_category)
                .all()
            )
            prev_counts = dict(
                db.query(Complaint.actual_category, func.count(Complaint.id))
                .filter(Complaint.received_at >= previous_start)
                .filter(Complaint.received_at < current_start)
                .group_by(Complaint.actual_category)
                .all()
            )

            for cat in category_counts:
                cur_v = cur_counts.get(cat, 0)
                prev_v = prev_counts.get(cat, 0)
                if prev_v > 0:
                    growth_rates[cat] = max(0.0, (cur_v - prev_v) / prev_v)
                elif cur_v > 0:
                    growth_rates[cat] = 1.0 # 100% surge from baseline
                else:
                    growth_rates[cat] = 0.0
        else:
            growth_rates = {cat: 0.0 for cat in category_counts}

        max_growth = max(growth_rates.values()) if growth_rates and max(growth_rates.values()) > 0 else 1.0

        # 4. Compute severity scores if present
        severity_scores: dict[str, float] = {}
        if is_severity_available:
            # Map High -> 1.0, Medium -> 0.5, Low -> 0.2
            severity_records = (
                db.query(Complaint.actual_category, Complaint.severity)
                .filter(Complaint.severity.isnot(None))
                .all()
            )
            cat_sev_sums: dict[str, float] = {}
            cat_sev_counts: dict[str, int] = {}
            sev_map = {"critical": 1.0, "high": 0.9, "medium": 0.5, "low": 0.2}

            for cat, sev in severity_records:
                weight = sev_map.get(str(sev).lower().strip(), 0.5)
                cat_sev_sums[cat] = cat_sev_sums.get(cat, 0.0) + weight
                cat_sev_counts[cat] = cat_sev_counts.get(cat, 0) + 1

            for cat in category_counts:
                if cat in cat_sev_counts and cat_sev_counts[cat] > 0:
                    severity_scores[cat] = cat_sev_sums[cat] / cat_sev_counts[cat]
                else:
                    severity_scores[cat] = 0.5

        # 5. Calculate total score and construct breakdown
        breakdowns: list[PriorityScoreBreakdown] = []

        for cat, volume in category_counts.items():
            norm_vol = round((volume / max_volume) * 100, 2)
            growth_rate = growth_rates.get(cat, 0.0)
            norm_growth = round(min(100.0, (growth_rate / max_growth) * 100), 2)

            if is_severity_available:
                norm_sev = round(severity_scores.get(cat, 0.5) * 100, 2)
                total_score = round(
                    (w_vol * norm_vol) + (w_sev * norm_sev) + (w_gro * norm_growth), 1
                )
                weights_applied = {"volume": w_vol, "severity": w_sev, "growth": w_gro}
                explanation = (
                    f"Prioritized based on {volume} complaints ({norm_vol}/100 volume), "
                    f"{norm_sev}/100 severity index, and {round(growth_rate*100, 1)}% recent growth."
                )
            else:
                norm_sev = None
                total_score = round((w_vol * norm_vol) + (w_gro * norm_growth), 1)
                weights_applied = {"volume": w_vol, "growth": w_gro}
                explanation = (
                    f"Prioritized based on 2-factor formula (severity absent in dataset): "
                    f"{volume} complaints ({norm_vol}/100 volume weight {w_vol}) and "
                    f"{round(growth_rate*100, 1)}% recent growth ({norm_growth}/100 weight {w_gro})."
                )

            # Assign Priority Level
            if total_score >= 70.0:
                priority_level = "High"
            elif total_score >= 40.0:
                priority_level = "Medium"
            else:
                priority_level = "Low"

            breakdowns.append(
                PriorityScoreBreakdown(
                    category=cat,
                    total_score=total_score,
                    priority_level=priority_level,
                    normalized_volume=norm_vol,
                    normalized_growth=norm_growth,
                    normalized_severity=norm_sev,
                    weights_applied=weights_applied,
                    explanation=explanation,
                    complaint_count=volume,
                    recent_growth_rate=round(growth_rate * 100, 1),
                    is_severity_available=is_severity_available
                )
            )

        breakdowns.sort(key=lambda x: x.total_score, reverse=True)
        return breakdowns
