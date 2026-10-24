import os
import json
from pathlib import Path
from typing import Dict, Any, Optional
import pandas as pd
import numpy as np

from pipeline.ingest import run_ingest, find_project_paths

class DataLoader:
    _instance: Optional["DataLoader"] = None

    def __init__(self):
        self.root_dir, self.raw_dir, self.processed_dir = find_project_paths()
        self.prices_wide: Optional[pd.DataFrame] = None
        self.volume_wide: Optional[pd.DataFrame] = None
        self.returns_wide: Optional[pd.DataFrame] = None
        self.ohlcv_long: Optional[pd.DataFrame] = None
        self.metadata: Optional[pd.DataFrame] = None
        self.pipeline_report: Dict[str, Any] = {}
        
        # Derived cache for ultra-fast API endpoints
        self.market_returns: Optional[pd.Series] = None
        self.market_index: Optional[pd.Series] = None
        self.ticker_set: set = set()
        self.ticker_to_meta: Dict[str, Dict[str, Any]] = {}
        self.ohlcv_by_ticker: Dict[str, pd.DataFrame] = {}
        self.dates_list: list = []

    @classmethod
    def get_instance(cls) -> "DataLoader":
        if cls._instance is None:
            cls._instance = DataLoader()
            cls._instance.load_data()
        return cls._instance

    def ensure_data_exists(self):
        required_files = [
            "ohlcv_long.parquet",
            "prices_wide.parquet",
            "volume_wide.parquet",
            "returns_wide.parquet",
            "metadata.parquet",
            "pipeline_report.json"
        ]
        missing = [f for f in required_files if not (self.processed_dir / f).exists()]
        if missing:
            print(f"[!] Processed data missing ({missing}). Running pipeline automatically...")
            run_ingest()

    def load_data(self):
        self.ensure_data_exists()
        print("[*] Loading processed dataset into memory...")

        self.prices_wide = pd.read_parquet(self.processed_dir / "prices_wide.parquet")
        self.volume_wide = pd.read_parquet(self.processed_dir / "volume_wide.parquet")
        self.returns_wide = pd.read_parquet(self.processed_dir / "returns_wide.parquet")
        self.ohlcv_long = pd.read_parquet(self.processed_dir / "ohlcv_long.parquet")
        self.metadata = pd.read_parquet(self.processed_dir / "metadata.parquet")

        report_path = self.processed_dir / "pipeline_report.json"
        if report_path.exists():
            with open(report_path, "r", encoding="utf-8") as f:
                self.pipeline_report = json.load(f)

        self.dates_list = self.prices_wide.index.tolist()
        self.ticker_set = set(self.prices_wide.columns.tolist())

        # Precompute Equal-Weight Market Index
        self.market_returns = self.returns_wide.mean(axis=1)
        self.market_index = (1.0 + self.market_returns).cumprod() * 100.0

        # Build metadata index
        for _, row in self.metadata.iterrows():
            t = row["ticker"]
            self.ticker_to_meta[t] = {
                "ticker": t,
                "name": row["name"],
                "sector": row["sector"],
                "industry": row["industry"],
                "market_cap": float(row["market_cap"])
            }

        # Partition OHLCV by ticker for instant per-ticker lookups
        print("[*] Indexing OHLCV records by ticker for zero-latency retrieval...")
        grouped = self.ohlcv_long.groupby("ticker")
        for ticker, group in grouped:
            self.ohlcv_by_ticker[ticker] = group.sort_values("date").reset_index(drop=True)

        print(f"[+] Loaded {len(self.ticker_set)} tickers, {len(self.dates_list)} dates into memory.")

    def validate_ticker(self, ticker: str) -> str:
        clean = ticker.upper().strip()
        if clean in self.ticker_set:
            return clean
        # Try dot vs dash alternative (e.g. BRK.B <-> BRK-B)
        alt = clean.replace(".", "-") if "." in clean else clean.replace("-", ".")
        if alt in self.ticker_set:
            return alt
        raise KeyError(f"Ticker '{ticker}' not found in universe of {len(self.ticker_set)} stocks.")

    def get_meta_for_ticker(self, ticker: str) -> Dict[str, Any]:
        valid_t = self.validate_ticker(ticker)
        return self.ticker_to_meta.get(valid_t, {
            "ticker": valid_t,
            "name": valid_t,
            "sector": "Other",
            "industry": "Other",
            "market_cap": 0.0
        })

# Global singleton accessor
def get_data_loader() -> DataLoader:
    return DataLoader.get_instance()
