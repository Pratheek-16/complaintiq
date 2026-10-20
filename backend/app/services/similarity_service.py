import numpy as np
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.models.complaint import Complaint
from app.schemas.analytics import SimilarComplaintResponse, SimilarComplaintItem
from app.services.preprocessing import default_preprocessor

class SimilarityService:
    @staticmethod
    def find_similar_complaints(
        db: Session,
        complaint_id: int | None = None,
        query_text: str | None = None,
        threshold: float = 0.60,
        top_k: int = 20,
        limit_pool: int = 5000
    ) -> SimilarComplaintResponse:
        """
        Uses TF-IDF vectors and cosine similarity to find complaints textually similar
        to a selected complaint or input query. Distinguishes near-duplicates (score >= 0.85).
        """
        if complaint_id is not None:
            target_complaint = db.query(Complaint).filter(Complaint.id == complaint_id).first()
            if not target_complaint:
                raise ValueError(f"Complaint with ID {complaint_id} not found.")
            target_text = target_complaint.cleaned_text or target_complaint.original_text
            display_query = target_complaint.original_text
        elif query_text:
            display_query = query_text
            target_text = default_preprocessor.clean_text(query_text)
        else:
            raise ValueError("Either complaint_id or query_text must be provided.")

        if not target_text:
            raise ValueError("Query text is empty after preprocessing.")

        # Fetch pool of complaints from DB
        complaints_query = (
            db.query(Complaint)
            .filter(Complaint.cleaned_text.isnot(None))
            .filter(Complaint.cleaned_text != "")
        )
        if complaint_id is not None:
            complaints_query = complaints_query.filter(Complaint.id != complaint_id)

        candidate_records = complaints_query.limit(limit_pool).all()

        if not candidate_records:
            return SimilarComplaintResponse(
                query_complaint_id=complaint_id,
                query_text=display_query,
                similarity_threshold=threshold,
                similar_complaints=[],
                total_found=0
            )

        corpus_texts = [c.cleaned_text for c in candidate_records]

        # Vectorize target and corpus
        vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)
        tfidf_matrix = vectorizer.fit_transform(corpus_texts)
        target_vec = vectorizer.transform([target_text])

        # Compute cosine similarities
        sim_scores = cosine_similarity(target_vec, tfidf_matrix)[0]

        # Filter by threshold and rank
        matched_indices = np.where(sim_scores >= threshold)[0]
        sorted_indices = matched_indices[np.argsort(sim_scores[matched_indices])[::-1]][:top_k]

        similar_items = []
        for idx in sorted_indices:
            score = float(round(sim_scores[idx], 4))
            record = candidate_records[idx]
            similar_items.append(
                SimilarComplaintItem(
                    complaint_id=record.id,
                    text=record.original_text,
                    category=record.actual_category,
                    similarity_score=score,
                    received_at=record.received_at,
                    company=record.company,
                    is_near_duplicate=(score >= 0.85)
                )
            )

        return SimilarComplaintResponse(
            query_complaint_id=complaint_id,
            query_text=display_query,
            similarity_threshold=threshold,
            similar_complaints=similar_items,
            total_found=len(similar_items)
        )
