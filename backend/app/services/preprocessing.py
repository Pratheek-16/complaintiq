import re
import html
import unicodedata

# Explicit list of critical negation and sentiment-inversion tokens that MUST NOT be removed
PRESERVED_TOKENS = {
    "not", "no", "never", "neither", "nor", "none", "nobody", "nowhere",
    "cannot", "cant", "can't", "dont", "don't", "wont", "won't", "didnt", "didn't",
    "isnt", "isn't", "wasnt", "wasn't", "werent", "weren't", "hasnt", "hasn't",
    "havent", "haven't", "hadnt", "hadn't", "couldnt", "couldn't", "shouldnt", "shouldn't",
    "wouldnt", "wouldn't", "without", "against", "failed", "unauthorized", "refused",
    "stolen", "dispute", "fraud", "scam", "error", "wrong", "late", "loss", "denied"
}

# Standard English stopwords excluding preserved tokens
DEFAULT_STOPWORDS = {
    "a", "about", "above", "after", "again", "all", "am", "an", "and", "any",
    "are", "as", "at", "be", "because", "been", "before", "being", "below",
    "between", "both", "but", "by", "could", "did", "do", "does", "doing",
    "down", "during", "each", "few", "for", "from", "further", "had", "has",
    "have", "having", "he", "her", "here", "hers", "herself", "him", "himself",
    "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just",
    "me", "more", "most", "my", "myself", "of", "off", "on", "once", "only",
    "or", "other", "our", "ours", "ourselves", "out", "over", "own", "same",
    "she", "should", "so", "some", "such", "than", "that", "the", "their",
    "theirs", "them", "themselves", "then", "there", "these", "they", "this",
    "those", "through", "to", "too", "under", "until", "up", "very", "was",
    "we", "were", "what", "when", "where", "which", "while", "who", "whom",
    "why", "with", "you", "your", "yours", "yourself", "yourselves"
} - PRESERVED_TOKENS

URL_REGEX = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)
HTML_REGEX = re.compile(r"<[^>]+>")
WHITESPACE_REGEX = re.compile(r"\s+")
SPECIAL_CHARS_REGEX = re.compile(r"[^a-zA-Z0-9\s'\-]")
REPEATED_CHARS_REGEX = re.compile(r"(.)\1{3,}") # e.g. "pleeeeease" -> "plee"
CFPB_MASK_REGEX = re.compile(r"X{2,}") # Masked CFPB PII like XXXX or XX/XX/XXXX

class TextPreprocessor:
    def __init__(self, remove_stopwords: bool = True, min_token_length: int = 2):
        self.remove_stopwords = remove_stopwords
        self.min_token_length = min_token_length
        self.stopwords = DEFAULT_STOPWORDS

    def clean_text(self, text: str | None) -> str:
        """
        Cleans complaint text deterministically:
        - Decodes HTML entities and strips tags.
        - Removes URLs.
        - Replaces CFPB redactions (XXXX).
        - Normalizes unicode and whitespace.
        - Keeps essential domain terms and negations.
        """
        if not text or not isinstance(text, str):
            return ""

        # 1. Unescape HTML entities & strip tags
        text = html.unescape(text)
        text = HTML_REGEX.sub(" ", text)

        # 2. Remove URLs
        text = URL_REGEX.sub(" ", text)

        # 3. Replace CFPB redaction masks like XXXX
        text = CFPB_MASK_REGEX.sub(" ", text)

        # 4. Unicode normalization (NFKD)
        text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("utf-8", "ignore")

        # 5. Lowercase
        text = text.lower()

        # 6. Normalize contractions like "didn't" -> "didn't"
        text = re.sub(r"n't\b", " not", text)
        text = re.sub(r"'re\b", " are", text)
        text = re.sub(r"'s\b", " is", text)
        text = re.sub(r"'d\b", " would", text)
        text = re.sub(r"'ll\b", " will", text)
        text = re.sub(r"'ve\b", " have", text)
        text = re.sub(r"'m\b", " am", text)

        # 7. Replace repeated characters
        text = REPEATED_CHARS_REGEX.sub(r"\1\1", text)

        # 8. Filter special characters (keep alphanumerics and hyphens)
        text = SPECIAL_CHARS_REGEX.sub(" ", text)

        # 9. Token filtering
        tokens = text.split()
        filtered_tokens = []
        for token in tokens:
            token = token.strip("-'")
            if len(token) < self.min_token_length:
                continue
            if self.remove_stopwords and token in self.stopwords:
                continue
            filtered_tokens.append(token)

        # 10. Rejoin and normalize spaces
        cleaned = " ".join(filtered_tokens)
        return cleaned.strip()

    def is_usable_document(self, cleaned_text: str, min_words: int = 2) -> bool:
        """Determines if the document has sufficient informative content."""
        if not cleaned_text:
            return False
        words = cleaned_text.split()
        return len(words) >= min_words

# Singleton preprocessor instance
default_preprocessor = TextPreprocessor()
