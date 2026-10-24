from fastapi import APIRouter, Depends, Query
from app.schemas import AnomaliesResponse
from app.dependencies import get_loader
from app.services.data_loader import DataLoader
from app.services.anomalies import compute_market_anomalies

router = APIRouter(prefix="", tags=["Anomalies"])

@router.get("/anomalies", response_model=AnomaliesResponse)
def get_anomalies(
    limit: int = Query(50, ge=1, le=500, description="Max anomaly events to return"),
    loader: DataLoader = Depends(get_loader)
):
    return compute_market_anomalies(loader, limit=limit)
