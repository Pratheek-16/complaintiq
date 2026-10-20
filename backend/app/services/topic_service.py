import uuid
import numpy as np
from datetime import datetime
from sqlalchemy.orm import Session
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.decomposition import NMF, LatentDirichletAllocation
from sklearn.cluster import KMeans

from app.models.complaint import Complaint
from app.models.topic import DiscoveredTopic, ComplaintTopic
from app.models.audit import AuditEvent
from app.schemas.topic import (
    TopicDiscoveryRequest,
    TopicResponse,
    TopicKeyword,
    RepresentativeComplaint,
    TopicDiscoveryResponse,
)

class TopicService:
    @staticmethod
    def discover_topics(
        db: Session,
        req: TopicDiscoveryRequest,
        limit_docs: int = 5000
    ) -> TopicDiscoveryResponse:
        """
        Discovers recurring complaint themes using NMF, LDA, or K-Means over TF-IDF/Count features.
        Extracts weighted keywords and retrieves representative complaints.
        """
        # Fetch complaints
        query = (
            db.query(Complaint.id, Complaint.original_text, Complaint.cleaned_text, Complaint.actual_category)
            .filter(Complaint.cleaned_text.isnot(None))
            .filter(Complaint.cleaned_text != "")
            .limit(limit_docs)
            .all()
        )

        if len(query) < 10:
            raise ValueError(f"Insufficient complaints in database to discover themes. Found {len(query)}, require at least 10.")

        complaint_ids = [r[0] for r in query]
        original_texts = [r[1] for r in query]
        cleaned_texts = [r[2] for r in query]
        categories = [r[3] for r in query]
        num_docs = len(cleaned_texts)

        # Clear previous topic assignments if replacing
        version_id = f"{req.algorithm.lower()}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:4]}"

        if req.algorithm.lower() == "lda":
            # Count vectorizer for LDA
            vectorizer = CountVectorizer(
                max_features=req.max_features,
                min_df=2,
                stop_words="english"
            )
            dtm = vectorizer.fit_transform(cleaned_texts)
            model = LatentDirichletAllocation(
                n_components=req.num_topics,
                random_state=42,
                max_iter=20,
                learning_method="online"
            )
            doc_topic_matrix = model.fit_transform(dtm)
            components = model.components_
        elif req.algorithm.lower() == "kmeans":
            vectorizer = TfidfVectorizer(
                max_features=req.max_features,
                min_df=2,
                sublinear_tf=True
            )
            dtm = vectorizer.fit_transform(cleaned_texts)
            model = KMeans(n_clusters=req.num_topics, random_state=42, n_init="auto")
            cluster_labels = model.fit_predict(dtm)
            # Create synthetic doc topic matrix from cluster distances
            distances = model.transform(dtm)
            doc_topic_matrix = 1.0 / (1.0 + distances)
            doc_topic_matrix = doc_topic_matrix / doc_topic_matrix.sum(axis=1, keepdims=True)
            components = model.cluster_centers_
        else: # Default NMF
            vectorizer = TfidfVectorizer(
                max_features=req.max_features,
                min_df=2,
                sublinear_tf=True
            )
            dtm = vectorizer.fit_transform(cleaned_texts)
            model = NMF(
                n_components=req.num_topics,
                random_state=42,
                init="nndsvda",
                max_iter=300
            )
            doc_topic_matrix = model.fit_transform(dtm)
            components = model.components_

        feature_names = np.array(vectorizer.get_feature_names_out())

        # Determine dominant topic per document
        dominant_topics = np.argmax(doc_topic_matrix, axis=1)
        topic_counts = np.bincount(dominant_topics, minlength=req.num_topics)

        # Clean existing topics in DB for new run
        db.query(ComplaintTopic).delete()
        db.query(DiscoveredTopic).delete()
        db.commit()

        discovered_topics_resp: list[TopicResponse] = []

        for t_idx in range(req.num_topics):
            # Top keywords
            top_kw_indices = np.argsort(components[t_idx])[::-1][:req.num_keywords]
            top_kw_weights = components[t_idx][top_kw_indices]
            # Normalize keyword weights to 0..1 for display
            max_weight = top_kw_weights[0] if len(top_kw_weights) > 0 and top_kw_weights[0] > 0 else 1.0
            kw_list = [
                {"term": str(feature_names[idx]), "weight": round(float(weight / max_weight), 3)}
                for idx, weight in zip(top_kw_indices, top_kw_weights)
            ]

            # Heuristic human-readable name from top 3 keywords
            top_3_words = [str(feature_names[i]).capitalize() for i in top_kw_indices[:3]]
            default_name = f"Theme {t_idx + 1}: {' / '.join(top_3_words)}"

            # Find top representative complaints
            doc_weights_for_topic = doc_topic_matrix[:, t_idx]
            top_doc_indices = np.argsort(doc_weights_for_topic)[::-1][:3]
            rep_complaints = []
            for doc_i in top_doc_indices:
                if doc_weights_for_topic[doc_i] > 0:
                    rep_complaints.append(
                        RepresentativeComplaint(
                            complaint_id=complaint_ids[doc_i],
                            text=original_texts[doc_i][:300] + ("..." if len(original_texts[doc_i]) > 300 else ""),
                            category=categories[doc_i],
                            similarity_weight=round(float(doc_weights_for_topic[doc_i]), 4)
                        )
                    )

            rec_count = int(topic_counts[t_idx])
            prevalence = round((rec_count / num_docs) * 100, 2) if num_docs > 0 else 0.0

            # Save in database
            db_topic = DiscoveredTopic(
                topic_model_version=version_id,
                topic_number=t_idx + 1,
                topic_name=default_name,
                algorithm=req.algorithm.lower(),
                keywords=kw_list,
                record_count=rec_count,
                created_at=datetime.utcnow()
            )
            db.add(db_topic)
            db.commit()
            db.refresh(db_topic)

            # Assign complaint_topics for docs where this is dominant
            complaint_topic_assignments = []
            for doc_i, dom_t in enumerate(dominant_topics):
                if dom_t == t_idx:
                    complaint_topic_assignments.append(
                        ComplaintTopic(
                            complaint_id=complaint_ids[doc_i],
                            topic_id=db_topic.id,
                            topic_weight=round(float(doc_topic_matrix[doc_i, t_idx]), 4)
                        )
                    )
            if complaint_topic_assignments:
                db.bulk_save_objects(complaint_topic_assignments)
                db.commit()

            discovered_topics_resp.append(
                TopicResponse(
                    id=db_topic.id,
                    topic_number=t_idx + 1,
                    topic_name=default_name,
                    algorithm=req.algorithm.lower(),
                    keywords=[TopicKeyword(**k) for k in kw_list],
                    record_count=rec_count,
                    prevalence_percentage=prevalence,
                    representative_complaints=rep_complaints,
                    created_at=db_topic.created_at
                )
            )

        # Audit
        db.add(AuditEvent(
            event_type="TOPICS_DISCOVERED",
            entity_type="DiscoveredTopic",
            details={"algorithm": req.algorithm, "num_topics": req.num_topics, "version": version_id}
        ))
        db.commit()

        return TopicDiscoveryResponse(
            topics=discovered_topics_resp,
            total_documents_modeled=num_docs,
            algorithm=req.algorithm.lower(),
            topic_model_version=version_id
        )

    @staticmethod
    def get_topics(db: Session) -> list[TopicResponse]:
        """Retrieves stored discovered topics."""
        db_topics = db.query(DiscoveredTopic).order_by(DiscoveredTopic.topic_number).all()
        if not db_topics:
            return []

        total_docs = db.query(ComplaintTopic).count() or 1
        results = []

        for t in db_topics:
            # Fetch representative complaints
            assignments = (
                db.query(ComplaintTopic, Complaint)
                .join(Complaint, ComplaintTopic.complaint_id == Complaint.id)
                .filter(ComplaintTopic.topic_id == t.id)
                .order_by(ComplaintTopic.topic_weight.desc())
                .limit(3)
                .all()
            )

            reps = [
                RepresentativeComplaint(
                    complaint_id=c.id,
                    text=c.original_text[:300] + ("..." if len(c.original_text) > 300 else ""),
                    category=c.actual_category,
                    similarity_weight=ct.topic_weight or 0.0
                )
                for ct, c in assignments
            ]

            prevalence = round((t.record_count / total_docs) * 100, 2)
            results.append(
                TopicResponse(
                    id=t.id,
                    topic_number=t.topic_number,
                    topic_name=t.topic_name,
                    algorithm=t.algorithm,
                    keywords=[TopicKeyword(**k) for k in t.keywords],
                    record_count=t.record_count,
                    prevalence_percentage=prevalence,
                    representative_complaints=reps,
                    created_at=t.created_at
                )
            )

        return results

    @staticmethod
    def rename_topic(db: Session, topic_id: int, new_name: str) -> TopicResponse:
        """Allows human analyst to assign an informative name to a discovered topic."""
        topic = db.query(DiscoveredTopic).filter(DiscoveredTopic.id == topic_id).first()
        if not topic:
            raise ValueError(f"Topic {topic_id} not found.")

        topic.topic_name = new_name
        db.commit()
        db.refresh(topic)

        # Audit
        db.add(AuditEvent(
            event_type="TOPIC_RENAMED",
            entity_type="DiscoveredTopic",
            entity_id=topic.id,
            details={"new_name": new_name}
        ))
        db.commit()

        topics = TopicService.get_topics(db)
        return next(t for t in topics if t.id == topic_id)
