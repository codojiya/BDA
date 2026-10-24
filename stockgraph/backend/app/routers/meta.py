from fastapi import APIRouter, Depends
from app.schemas import MetaResponse, DateRange
from app.dependencies import get_loader
from app.services.data_loader import DataLoader
from app.services.analytics import calculate_cagr, calculate_annualized_volatility, calculate_sharpe_ratio

router = APIRouter(prefix="", tags=["Metadata"])

@router.get("/meta", response_model=MetaResponse)
def get_meta(loader: DataLoader = Depends(get_loader)):
    dates = loader.dates_list
    sectors = sorted(loader.metadata["sector"].unique().tolist())
    
    # Market summary stats
    market_cagr = calculate_cagr(loader.market_index)
    market_vol = calculate_annualized_volatility(loader.market_returns)
    market_sharpe = calculate_sharpe_ratio(market_cagr, market_vol)

    return MetaResponse(
        dataset="S&P 500 Daily Market Data (2013-2018)",
        source_badge="real",
        ticker_count=len(loader.ticker_set),
        date_range=DateRange(
            start=dates[0],
            end=dates[-1],
            total_trading_days=len(dates)
        ),
        sectors=sectors,
        pipeline_report=loader.pipeline_report,
        market_summary={
            "market_cagr": round(market_cagr * 100.0, 2),
            "market_annualized_volatility": round(market_vol * 100.0, 2),
            "market_sharpe": round(market_sharpe, 3),
            "total_trading_days": len(dates),
            "start_date": dates[0],
            "end_date": dates[-1]
        }
    )
