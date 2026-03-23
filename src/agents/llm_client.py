"""
llm_client.py — LLM client using Azure OpenAI Responses API.
Reads credentials from OpenClaw's config and calls Azure OpenAI directly.
Falls back to structured text if the LLM is unreachable.
"""

import json
import os
import time

import httpx

_OPENCLAW_CONFIG = os.path.expanduser("~/.openclaw/openclaw.json")
_TIMEOUT = 30.0
_MAX_RETRIES = 2


def _load_azure_config() -> dict:
    """Read Azure OpenAI config from OpenClaw's openclaw.json."""
    try:
        with open(_OPENCLAW_CONFIG) as f:
            cfg = json.load(f)
        provider = cfg["models"]["providers"]["azure-openai-responses"]
        api_key = provider["headers"]["api-key"]
        base_url = provider["baseUrl"]  # e.g. https://xxx.openai.azure.com/openai/v1
        model = provider["models"][0]["id"]
        return {"base_url": base_url, "api_key": api_key, "model": model}
    except (FileNotFoundError, KeyError, json.JSONDecodeError, IndexError):
        return {}


class LLMClient:
    """Azure OpenAI Responses API client with fallback."""

    def __init__(self):
        self._config = _load_azure_config()

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
        temperature: float = 0.3,
    ) -> str:
        """
        Generate text via Azure OpenAI Responses API.
        Retries up to _MAX_RETRIES times.
        Returns fallback summary if LLM is unreachable.
        """
        if not self._config:
            return self._fallback(user_prompt, "No Azure OpenAI config found")

        base_url = self._config["base_url"]
        url = f"{base_url}/responses"

        headers = {
            "Content-Type": "application/json",
            "api-key": self._config["api_key"],
        }
        payload = {
            "model": self._config["model"],
            "instructions": system_prompt,
            "input": user_prompt,
            "temperature": temperature,
            "max_output_tokens": 2048,
        }

        for attempt in range(_MAX_RETRIES + 1):
            try:
                with httpx.Client(timeout=_TIMEOUT) as client:
                    resp = client.post(url, headers=headers, json=payload)
                    resp.raise_for_status()
                    data = resp.json()

                # Extract text from responses API output
                for item in data.get("output", []):
                    if item.get("type") == "message":
                        for content in item.get("content", []):
                            text = content.get("text", "")
                            if text:
                                return text.strip()

                return self._fallback(user_prompt, "No text in response")

            except Exception as e:
                if attempt < _MAX_RETRIES:
                    time.sleep(1)
                    continue
                return self._fallback(user_prompt, str(e))

    @staticmethod
    def _fallback(user_prompt: str, error: str) -> str:
        """Build a plain-text summary when LLM is unavailable."""
        lines = [
            "[LLM unavailable — structured summary]",
            "",
            user_prompt[:2000],
            "",
            f"(Error: {error[:200]})",
        ]
        return "\n".join(lines)


# Module-level singleton
llm_client = LLMClient()
