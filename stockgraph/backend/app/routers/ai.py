from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.services.ai import AIService, get_ai_service

router = APIRouter(prefix="/ai", tags=["AI Quantitative Assistant"])

class ChatMessage(BaseModel):
    role: str # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str = Field(..., description="User question or query")
    history: List[ChatMessage] = Field(default_factory=list, description="Prior conversation history")

class ExplainRequest(BaseModel):
    chart_type: str = Field(..., description="Chart identifier, e.g. 'candlestick', 'contagion', 'network', 'equity_curve'")
    data_summary: Dict[str, Any] = Field(..., description="Summary data points displayed on the chart")

@router.post("/chat")
async def chat_with_market(
    req: ChatRequest,
    ai: AIService = Depends(get_ai_service)
):
    """
    Stream answers with tool-calling across all analytical services.
    Uses Server-Sent Events (SSE) so text appears in real time.
    """
    raw_history = [{"role": m.role, "content": m.content} for m in req.history]

    async def event_generator():
        async for chunk in ai.stream_chat(req.message, raw_history):
            yield f"data: {chunk}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/explain")
def explain_chart(
    req: ExplainRequest,
    ai: AIService = Depends(get_ai_service)
):
    """
    Generates a plain-English institutional explanation of a chart's current pattern.
    """
    explanation = ai.explain_chart(req.chart_type, req.data_summary)
    return {
        "chart_type": req.chart_type,
        "explanation": explanation
    }

@router.get("/brief")
def get_daily_brief(
    ai: AIService = Depends(get_ai_service)
):
    """
    Returns an institutional executive market brief built from current regime,
    top anomalies, and central hub stocks. Cached in memory for 6 hours.
    """
    return ai.get_market_brief()
