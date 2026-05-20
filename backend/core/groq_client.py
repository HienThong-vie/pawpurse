import os
from groq import Groq


_client: Groq | None = None


def get_groq_client() -> Groq:
    """Lazy-initialize the Groq client so the import of this module doesn't
    crash the app at startup when GROQ_API_KEY is missing (e.g. in tests)."""
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError(
                "GROQ_API_KEY must be set to use the AI advisor"
            )
        _client = Groq(api_key=api_key)
    return _client
