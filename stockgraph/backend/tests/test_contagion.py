import pytest
from app.services.data_loader import DataLoader
from app.services.contagion import run_contagion_simulation
from app.schemas import ContagionRequest

@pytest.fixture(scope="module")
def data_loader():
    return DataLoader.get_instance()

def test_contagion_simulation(data_loader):
    req = ContagionRequest(
        seed_ticker="AAPL",
        shock=-0.05,
        hops=3,
        threshold=0.35,
        damping=0.70
    )
    res = run_contagion_simulation(data_loader, req)

    assert res.seed_ticker == "AAPL"
    assert res.initial_shock == -5.0
    assert len(res.hop_details) <= 3
    assert len(res.ranked_impact) > 0
    # Seed should be present in ranked impact with initial shock
    seed_item = next(item for item in res.ranked_impact if item.ticker == "AAPL")
    assert seed_item.total_impact_pct == -5.0
    assert seed_item.hop_reached == 0

    # Sector summary should contain technology
    sectors = [s["sector"] for s in res.sector_impact_summary]
    assert "Technology" in sectors
