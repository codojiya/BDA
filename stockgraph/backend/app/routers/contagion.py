from fastapi import APIRouter, Depends, HTTPException
from app.schemas import ContagionRequest, ContagionResponse
from app.dependencies import get_loader
from app.services.data_loader import DataLoader
from app.services.contagion import run_contagion_simulation

router = APIRouter(prefix="", tags=["Contagion Simulator"])

@router.post("/simulate/contagion", response_model=ContagionResponse)
def simulate_contagion(
    req: ContagionRequest,
    loader: DataLoader = Depends(get_loader)
):
    try:
        loader.validate_ticker(req.seed_ticker)
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Seed ticker '{req.seed_ticker}' not found.")

    return run_contagion_simulation(data_loader=loader, req=req)
