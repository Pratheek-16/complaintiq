import pytest
from app.services.preprocessing import default_preprocessor, PRESERVED_TOKENS

def test_clean_text_basic():
    raw = "I DID NOT receive my refund from the bank! Visit http://example.com for proof."
    cleaned = default_preprocessor.clean_text(raw)
    assert "not" in cleaned
    assert "refund" in cleaned
    assert "bank" in cleaned
    assert "http" not in cleaned
    assert "example.com" not in cleaned

def test_preserves_crucial_negations():
    phrases = [
        ("never refunded my money", "never"),
        ("cannot access my account", "cannot"),
        ("did not agree to the terms", "not"),
        ("unauthorized transaction occurred", "unauthorized"),
        ("payment failed multiple times", "failed")
    ]
    for text, expected_token in phrases:
        cleaned = default_preprocessor.clean_text(text)
        assert expected_token in cleaned, f"Expected '{expected_token}' to be preserved in '{cleaned}'"

def test_handles_html_and_redactions():
    raw = "<p>Account <b>XXXX XXXX 1234</b> was closed without notice &amp; consent.</p>"
    cleaned = default_preprocessor.clean_text(raw)
    assert "<p>" not in cleaned
    assert "xxxx" not in cleaned
    assert "without" in cleaned
    assert "closed" in cleaned

def test_is_usable_document():
    assert default_preprocessor.is_usable_document("valid complaint text about charges", min_words=2) is True
    assert default_preprocessor.is_usable_document("", min_words=2) is False
    assert default_preprocessor.is_usable_document("single", min_words=2) is False
