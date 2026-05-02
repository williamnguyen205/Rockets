import json
import os

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/ai", tags=["ai"])

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma4:e4b")


class LearnQuestionRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=800)
    moduleTitle: str | None = Field(default=None, max_length=120)
    lessonTitle: str | None = Field(default=None, max_length=120)


class LearnAnswerResponse(BaseModel):
    answer: str
    takeaway: str
    example: str


class TopHoldingSummary(BaseModel):
    symbol: str = Field(..., max_length=16)
    name: str = Field(..., max_length=120)
    pctRounded: int = Field(..., ge=0, le=100)


class PortfolioSummaryPayload(BaseModel):
    totalValueUsd: float = Field(..., ge=0)
    cashPct: int = Field(..., ge=0, le=100)
    stocksPct: int = Field(..., ge=0, le=100)
    fundsPct: int = Field(..., ge=0, le=100)
    profile: str = Field(..., max_length=32)
    timeline: str = Field(..., max_length=32)
    goal: str = Field(..., max_length=200)
    monthlyContribution: float = Field(..., ge=0)
    topHoldings: list[TopHoldingSummary] = Field(default_factory=list, max_length=8)


class ScenarioExplainRequest(BaseModel):
    scenarioId: str = Field(..., min_length=1, max_length=64)
    scenarioTitle: str = Field(..., min_length=1, max_length=200)
    portfolioSummary: PortfolioSummaryPayload
    suggestedTrade: str = Field(..., min_length=1, max_length=8000)


class ScenarioExplainResponse(BaseModel):
    theWhy: str
    theRisk: str
    theMove: str


class ScenarioSimulationRequest(BaseModel):
    scenario: str = Field(..., min_length=4, max_length=1200)
    portfolioSummary: PortfolioSummaryPayload


class ScenarioSimulationResponse(BaseModel):
    title: str
    summary: str
    estimatedReturnAdjustmentPp: float = Field(..., ge=-15, le=15)
    estimatedPortfolioImpactPct: float = Field(..., ge=-60, le=60)
    confidence: str
    assumptions: list[str] = Field(..., min_length=2, max_length=5)
    recommendedMoves: list[str] = Field(..., min_length=2, max_length=5)
    riskNotes: list[str] = Field(..., min_length=2, max_length=5)


def _build_learn_prompt(
    question: str,
    module_title: str | None = None,
    lesson_title: str | None = None,
) -> str:
    course_context = ""
    if module_title or lesson_title:
        course_context = f"""
Course context:
- Module: {module_title or "Not selected"}
- Lesson: {lesson_title or "Not selected"}
Use this context to keep the answer relevant to the current learning plan.
""".strip()

    return f"""
You are Clarity, a calm beginner-investor tutor inside a fintech learning app.

Answer the user's investing question in plain English.

Rules:
- Keep it educational, concise, and beginner friendly.
- Do not recommend buying, selling, or holding a specific security.
- Do not provide personalized financial advice.
- If the user asks for stock picks, price predictions, or direct advice, redirect to general principles, risks, diversification, time horizon, and fees.
- Return only valid JSON with exactly these string keys: "answer", "takeaway", "example".

{course_context}

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


async def _ask_ollama(
    question: str,
    module_title: str | None = None,
    lesson_title: str | None = None,
) -> LearnAnswerResponse:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": _build_learn_prompt(question, module_title, lesson_title),
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

    return await _ask_ollama(question, request.moduleTitle, request.lessonTitle)


def _build_scenario_explain_prompt(request: ScenarioExplainRequest) -> str:
    holdings_lines = "\n".join(
        f"  - {h.symbol} ({h.name}): about {h.pctRounded}% of portfolio"
        for h in request.portfolioSummary.topHoldings
    ) or "  - (no holdings listed)"

    portfolio_block = f"""
Portfolio snapshot (educational context only):
- Total value (approx): ${request.portfolioSummary.totalValueUsd:,.0f}
- Cash: about {request.portfolioSummary.cashPct}%
- Stocks: about {request.portfolioSummary.stocksPct}%
- Mutual funds: about {request.portfolioSummary.fundsPct}%
- Stated goal: {request.portfolioSummary.goal}
- Risk comfort profile: {request.portfolioSummary.profile}
- Timeline: {request.portfolioSummary.timeline}
- Monthly contribution: ${request.portfolioSummary.monthlyContribution:,.0f}
- Larger positions:
{holdings_lines}
""".strip()

    return f"""
You are the "Clarity AI Tutor," a specialized financial assistant for absolute beginners inside Clarity.
Explain complex portfolio ideas using radical transparency and zero jargon.

CONTEXT:
The user is not market-savvy. They selected a "What-If" scenario and the app already chose a recommended
rebalancing-style plan (plain language). Your job is to explain WHY that plan fits their scenario and profile,
including risks, typical costs, and general tax awareness — without giving personalized tax or legal advice.

SCENARIO (user selected):
- Id: {request.scenarioId}
- Title: {request.scenarioTitle}

{portfolio_block}

RECOMMENDED PLAN FROM THE APP (you must explain THIS plan, not replace it):
{request.suggestedTrade}

CONSTRAINTS:
1. NO JARGON: Do not use terms like Alpha, Beta, Sharpe ratio, or Liquidity. Use plain words
   (e.g. "cash you can access quickly", "money in growth-style investments").
2. PLAIN LANGUAGE: Use at most one short analogy if it helps.
3. SCENARIO FOCUS: Tie everything to the chosen scenario title.
4. THE WHY: Include how the plan connects to their stated goal and timeline.
5. THE RISK: Include what could still go wrong, plus brief plain-language notes on trading costs / fund
   ongoing costs where relevant, and that selling in a regular brokerage account may create taxes on gains
   (tell them to confirm with a tax pro — you do not know their situation).
6. THE MOVE: Clear, ordered next steps that match the app's recommended plan.
7. EDUCATIONAL ONLY: This is not personal financial, tax, or investment advice.

OUTPUT:
Return only valid JSON with exactly these string keys: "theWhy", "theRisk", "theMove".
Each value should be 2-5 short paragraphs or tight bullet-style lines using plain text (no markdown headings).
""".strip()


def _parse_scenario_response(content: str) -> ScenarioExplainResponse:
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

    return ScenarioExplainResponse(
        theWhy=str(parsed.get("theWhy", "")).strip(),
        theRisk=str(parsed.get("theRisk", "")).strip(),
        theMove=str(parsed.get("theMove", "")).strip(),
    )


async def _ask_ollama_scenario(request: ScenarioExplainRequest) -> ScenarioExplainResponse:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": _build_scenario_explain_prompt(request),
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.35,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload)
    except httpx.ConnectError as exc:
        raise HTTPException(
            status_code=503,
            detail="Ollama is not running. Start it with `ollama serve` and try again.",
        ) from exc
    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=503,
            detail="Ollama took too long to respond. Try again or use a smaller model.",
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
            detail="Unexpected Ollama response while generating the scenario explanation.",
        )

    data = response.json()
    content = str(data.get("response", "")).strip()
    if not content:
        raise HTTPException(
            status_code=502,
            detail="Ollama returned an empty response. Please try again.",
        )

    parsed = _parse_scenario_response(content)
    if not parsed.theWhy or not parsed.theRisk or not parsed.theMove:
        raise HTTPException(
            status_code=502,
            detail="The AI response was missing required fields. Please try again.",
        )

    return parsed


@router.post("/scenario-explain", response_model=ScenarioExplainResponse)
async def explain_scenario_adjustment(request: ScenarioExplainRequest) -> ScenarioExplainResponse:
    return await _ask_ollama_scenario(request)


def _build_scenario_simulation_prompt(request: ScenarioSimulationRequest) -> str:
    holdings_lines = "\n".join(
        f"  - {h.symbol} ({h.name}): about {h.pctRounded}% of portfolio"
        for h in request.portfolioSummary.topHoldings
    ) or "  - (no holdings listed)"

    portfolio_block = f"""
Portfolio snapshot:
- Total value: ${request.portfolioSummary.totalValueUsd:,.0f}
- Stocks: {request.portfolioSummary.stocksPct}%
- Mutual funds: {request.portfolioSummary.fundsPct}%
- Cash: {request.portfolioSummary.cashPct}%
- Investor profile: {request.portfolioSummary.profile}
- Timeline: {request.portfolioSummary.timeline}
- Goal: {request.portfolioSummary.goal}
- Monthly contribution: ${request.portfolioSummary.monthlyContribution:,.0f}
- Larger positions:
{holdings_lines}
""".strip()

    return f"""
You are Clarity's market-simulation assistant for beginner investors.

The user will type any what-if scenario. Convert it into an educational portfolio stress test. Do not predict the
future with certainty. Do not recommend a specific security. Do not provide legal, tax, or personal financial advice.

USER SCENARIO:
{request.scenario}

{portfolio_block}

TASK:
1. Give the scenario a concise title.
2. Summarize what the simulation is testing in plain English.
3. Estimate how the scenario might change the portfolio's annual return assumption in percentage points.
   Use "estimatedReturnAdjustmentPp" where -2.5 means subtract 2.5 percentage points from the current annual assumption.
4. Estimate the near-term portfolio impact as a percent of total value using "estimatedPortfolioImpactPct".
   Negative means a drawdown/stress; positive means possible upside.
5. Give confidence as "Low", "Medium", or "High".
6. List 2-5 assumptions, 2-5 recommended moves, and 2-5 risk notes.

Rules:
- Keep every line beginner-friendly and specific to the user's scenario.
- Use conservative estimates. For vague scenarios, choose lower confidence.
- Mention portfolio mix and timeline where relevant.
- Keep actions educational and non-prescriptive: "consider", "review", "stress-test", "keep a cushion".
- Return only valid JSON with exactly these keys:
  "title", "summary", "estimatedReturnAdjustmentPp", "estimatedPortfolioImpactPct", "confidence",
  "assumptions", "recommendedMoves", "riskNotes".
""".strip()


def _parse_scenario_simulation_response(content: str) -> ScenarioSimulationResponse:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.strip("`").removeprefix("json").strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail="The AI simulation could not be parsed. Please try again.",
        ) from exc

    return ScenarioSimulationResponse(
        title=str(parsed.get("title", "")).strip(),
        summary=str(parsed.get("summary", "")).strip(),
        estimatedReturnAdjustmentPp=float(parsed.get("estimatedReturnAdjustmentPp", 0)),
        estimatedPortfolioImpactPct=float(parsed.get("estimatedPortfolioImpactPct", 0)),
        confidence=str(parsed.get("confidence", "Low")).strip(),
        assumptions=[str(item).strip() for item in parsed.get("assumptions", []) if str(item).strip()],
        recommendedMoves=[
            str(item).strip() for item in parsed.get("recommendedMoves", []) if str(item).strip()
        ],
        riskNotes=[str(item).strip() for item in parsed.get("riskNotes", []) if str(item).strip()],
    )


async def _ask_ollama_scenario_simulation(
    request: ScenarioSimulationRequest,
) -> ScenarioSimulationResponse:
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": _build_scenario_simulation_prompt(request),
        "stream": False,
        "format": "json",
        "options": {
            "temperature": 0.45,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(f"{OLLAMA_BASE_URL}/api/generate", json=payload)
    except httpx.ConnectError as exc:
        raise HTTPException(
            status_code=503,
            detail="Ollama is not running. Start it with `ollama serve` and try again.",
        ) from exc
    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=503,
            detail="Ollama took too long to simulate that scenario. Try a shorter prompt.",
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
            detail=f"Ollama could not generate a simulation. Confirm the model is installed with `ollama pull {OLLAMA_MODEL}`.",
        )

    if not response.is_success:
        raise HTTPException(
            status_code=502,
            detail="Unexpected Ollama response while generating the scenario simulation.",
        )

    data = response.json()
    content = str(data.get("response", "")).strip()
    if not content:
        raise HTTPException(
            status_code=502,
            detail="Ollama returned an empty simulation. Please try again.",
        )

    parsed = _parse_scenario_simulation_response(content)
    if (
        not parsed.title
        or not parsed.summary
        or len(parsed.assumptions) < 2
        or len(parsed.recommendedMoves) < 2
        or len(parsed.riskNotes) < 2
    ):
        raise HTTPException(
            status_code=502,
            detail="The AI simulation was missing required fields. Please try again.",
        )

    return parsed


@router.post("/scenario-simulate", response_model=ScenarioSimulationResponse)
async def simulate_user_scenario(
    request: ScenarioSimulationRequest,
) -> ScenarioSimulationResponse:
    scenario = request.scenario.strip()
    if not scenario:
        raise HTTPException(status_code=422, detail="Scenario cannot be empty.")

    return await _ask_ollama_scenario_simulation(
        ScenarioSimulationRequest(
            scenario=scenario,
            portfolioSummary=request.portfolioSummary,
        ),
    )
