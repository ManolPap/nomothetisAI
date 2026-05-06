import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.core.config import settings
from app.features.field_23.services.llm.embeddings import CachedEmbeddings


class Scorer:
    def __init__(self) -> None:
        self.embeddings_model = CachedEmbeddings(
            model="models/gemini-embedding-2-preview",
            api_key=(
                settings.feature.field_23_google_api_key.get_secret_value()
                if settings.feature.field_23_google_api_key
                else None
            ),
            namespace="field_23_comparison",
        )
        self.vectorizer = TfidfVectorizer()

    def compute_tfidf_similarities(self, old_texts: list[str], new_texts: list[str]) -> np.ndarray:
        if not old_texts or not new_texts:
            return np.zeros((len(old_texts), len(new_texts)))

        self.vectorizer.fit(old_texts + new_texts)
        old_vecs = self.vectorizer.transform(old_texts)
        new_vecs = self.vectorizer.transform(new_texts)

        return cosine_similarity(old_vecs, new_vecs)

    def compute_embedding_similarities(
        self, old_texts: list[str], new_texts: list[str]
    ) -> np.ndarray:
        if not old_texts or not new_texts:
            return np.zeros((len(old_texts), len(new_texts)))

        old_embeds = self.embeddings_model.embed_documents(old_texts)
        new_embeds = self.embeddings_model.embed_documents(new_texts)

        return cosine_similarity(old_embeds, new_embeds)
