from fastapi import APIRouter, Depends, Query
from app.schemas import NetworkResponse
from app.dependencies import get_loader
from app.services.data_loader import DataLoader
from app.services.network import build_correlation_network

router = APIRouter(prefix="", tags=["Network Graph"])

@router.get("/network", response_model=NetworkResponse)
def get_network(
    threshold: float = Query(0.6, ge=0.1, le=0.95, description="Correlation threshold for creating edges"),
    sector: str = Query("All", description="Sector filter, or 'All'"),
    limit: int = Query(80, ge=10, le=250, description="Maximum number of nodes to include"),
    loader: DataLoader = Depends(get_loader)
):
    return build_correlation_network(
        data_loader=loader,
        threshold=threshold,
        sector=sector,
        limit=limit
    )
