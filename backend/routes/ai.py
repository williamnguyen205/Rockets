import json
import os

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/ai", tags=["ai"])

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "phi4:14b")


class LearnQuestionRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=800)


class LearnAnswerResponse(BaseModel):
    answer: str
    takeaway: str
    example: str


def _build_learn_prompt(question: str) -> str:
    return f"""
You are Clarity, a calm beginner-investor tutor inside a fintech learning app.

Answer the user's investing question in plain English.

Rules:
- Keep it educational, concise, and beginner friendly.
- Do not recommend buying, selling, or holding a specific security.
- Do not provide personalized financial advice.
- If the user asks for stock picks, price predictions, or direct advice, redirect to general principles, risks, diversification, time horizon, and fees.
- Return only valid JSON with exactly these string keys: "answer", "takeaway", "example".

User question:
{question}
""".strip()


def _fallback_parse_response(content: str) -> LearnAnswerResponse:
    cleaned = content.strip()

    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`").removeprefix("json").strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail="The AI response could not be parsed. Please try again.",
        ) from exc

    return LearnAnswerResponse(
        answer=str(parsed.get("answer", "")).strip(),
        takeaway=str(parsed.get("takeaway", "")).strip(),
        example=str(parsed.get("example", "")).strip(),
    )


async def _ask_ollama(question: str) -> LearnAnswerResponse:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": _build_learn_prompt(question),
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.4,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload)
    except httpx.ConnectError as exc:
        raise HTTPException(
            status_code=503,
            detail="Ollama is not running. Start it with `ollama serve` and try again.",
        ) from exc
    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=503,
            detail="Ollama took too long to respond. Try a shorter question or a smaller model.",
        ) from exc
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=503,
            detail="Unable to reach Ollama. Confirm it is running on http://127.0.0.1:11434.",
        ) from exc

    if response.status_code == 404:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama model '{OLLAMA_MODEL}' was not found. Run `ollama pull {OLLAMA_MODEL}`.",
        )

    if response.status_code >= 500:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama could not generate a response. Confirm the model is installed with `ollama pull {OLLAMA_MODEL}`.",
        )

    if not response.is_success:
        raise HTTPException(
            status_code=502,
            detail="Unexpected Ollama response while generating the learning answer.",
        )

    data = response.json()
    content = str(data.get("response", "")).strip()
    if not content:
        raise HTTPException(
            status_code=502,
            detail="Ollama returned an empty response. Please try again.",
        )

    parsed = _fallback_parse_response(content)
    if not parsed.answer or not parsed.takeaway or not parsed.example:
        raise HTTPException(
            status_code=502,
            detail="The AI response was missing required fields. Please try again.",
        )

    return parsed


@router.post("/learn", response_model=LearnAnswerResponse)
async def ask_learn_question(request: LearnQuestionRequest) -> LearnAnswerResponse:
    question = request.question.strip()
    if not question:
        raise HTTPException(status_code=422, detail="Question cannot be empty.")

    return await _ask_ollama(question)
