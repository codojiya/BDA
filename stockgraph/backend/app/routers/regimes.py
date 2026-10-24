from fastapi import APIRouter, Depends
from app.schemas import RegimesResponse
from app.dependencies import get_loader
from app.services.data_loader import DataLoader
from app.services.regimes import compute_market_regimes

router = APIRouter(prefix="", tags=["Regimes"])

_cached_regimes = None

@router.get("/regimes", response_model=RegimesResponse)
def get_regimes(loader: DataLoader = Depends(get_loader)):
    global _cached_regimes
    if _cached_regimes is None:
        _cached_regimes = compute_market_regimes(loader)
    return _cached_regimes
