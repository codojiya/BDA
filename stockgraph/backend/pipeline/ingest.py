import os
import sys
import time
import json
import psutil
from pathlib import Path
import pandas as pd
import numpy as np

def get_memory_usage_mb():
    try:
        process = psutil.Process(os.getpid())
        return round(process.memory_info().rss / (1024 * 1024), 2)
    except Exception:
        return 0.0

def find_project_paths():
    """
    Locate stockgraph root and data directories reliably regardless of CWD.
    """
    current_file = Path(__file__).resolve()
    # current_file is stockgraph/backend/pipeline/ingest.py
    # parent.parent.parent is stockgraph/
    candidate_root = current_file.parent.parent.parent
    if (candidate_root / "data" / "raw").exists():
        root_dir = candidate_root
    elif (Path.cwd() / "data" / "raw").exists():
        root_dir = Path.cwd()
    elif (Path.cwd() / "stockgraph" / "data" / "raw").exists():
        root_dir = Path.cwd() / "stockgraph"
    else:
        root_dir = candidate_root

    raw_dir = root_dir / "data" / "raw"
    processed_dir = root_dir / "data" / "processed"
    return root_dir, raw_dir, processed_dir

def run_ingest(chunksize: int = 200000, coverage_threshold: float = 0.90) -> dict:
    t_start = time.perf_counter()
    timings = {}
    peak_memory = get_memory_usage_mb()

    root_dir, raw_dir, processed_dir = find_project_paths()
    processed_dir.mkdir(parents=True, exist_ok=True)

    prices_path = raw_dir / "prices.csv"
    companies_path = raw_dir / "companies.csv"

    if not prices_path.exists():
        raise FileNotFoundError(f"Missing raw prices file at {prices_path}")
    if not companies_path.exists():
        raise FileNotFoundError(f"Missing raw companies file at {companies_path}")

    print("=" * 60)
    print("STARTING STOCKGRAPH DATA INGESTION PIPELINE")
    print(f"Prices input: {prices_path}")
    print(f"Companies input: {companies_path}")
    print(f"Processed output: {processed_dir}")
    print("=" * 60)

    # STEP 1: Read prices in chunks
    t_step_start = time.perf_counter()
    chunks = []
    total_raw_rows = 0
    chunk_idx = 0
    print(f"[*] Reading {prices_path.name} in chunks of {chunksize:,} rows...")
    for chunk in pd.read_csv(prices_path, chunksize=chunksize):
        chunk_idx += 1
        total_raw_rows += len(chunk)
        chunks.append(chunk)
        curr_mem = get_memory_usage_mb()
        peak_memory = max(peak_memory, curr_mem)
        print(f"    Chunk {chunk_idx}: loaded {len(chunk):,} rows (Total: {total_raw_rows:,} rows, RSS: {curr_mem} MB)")

    df_raw = pd.concat(chunks, ignore_index=True)
    timings["read_raw_chunks"] = round(time.perf_counter() - t_step_start, 3)
    print(f"[+] Loaded raw dataset: {len(df_raw):,} rows in {timings['read_raw_chunks']}s")

    # Standardize column names
    # Expected: ['date', 'open', 'high', 'low', 'close', 'volume', 'Name']
    df_raw = df_raw.rename(columns={"Name": "ticker"})
    if "date" not in df_raw.columns:
        date_col = [c for c in df_raw.columns if "date" in c.lower()][0]
        df_raw = df_raw.rename(columns={date_col: "date"})

    # STEP 2: Clean, parse dates, sort, remove duplicates
    t_step_start = time.perf_counter()
    print("[*] Cleaning, parsing dates, sorting and deduplicating...")
    df_raw["date"] = pd.to_datetime(df_raw["date"]).dt.strftime("%Y-%m-%d")
    df_raw = df_raw.drop_duplicates(subset=["date", "ticker"]).sort_values(["ticker", "date"])

    initial_tickers = sorted(df_raw["ticker"].dropna().unique().tolist())
    all_dates = sorted(df_raw["date"].unique().tolist())
    total_calendar_days = len(all_dates)
    print(f"    Unique trading dates in dataset: {total_calendar_days} ({all_dates[0]} to {all_dates[-1]})")
    print(f"    Initial unique tickers: {len(initial_tickers)}")

    # Check coverage per ticker
    ticker_counts = df_raw.groupby("ticker")["date"].nunique()
    min_required_days = int(np.ceil(total_calendar_days * coverage_threshold))
    kept_tickers = ticker_counts[ticker_counts >= min_required_days].index.tolist()
    dropped_tickers = ticker_counts[ticker_counts < min_required_days].index.tolist()

    print(f"    Coverage threshold: {coverage_threshold*100:.0f}% ({min_required_days}/{total_calendar_days} days)")
    print(f"    Tickers kept: {len(kept_tickers)} | Tickers dropped: {len(dropped_tickers)}")
    if dropped_tickers:
        print(f"    Sample dropped tickers: {dropped_tickers[:10]}")

    df_filtered = df_raw[df_raw["ticker"].isin(kept_tickers)].copy()

    # Forward fill within each ticker across the full trading date grid
    full_index = pd.MultiIndex.from_product([kept_tickers, all_dates], names=["ticker", "date"])
    df_indexed = df_filtered.set_index(["ticker", "date"]).reindex(full_index)

    # Forward fill prices, back fill if ticker started slightly late within 90% threshold
    price_cols = ["open", "high", "low", "close"]
    for col in price_cols:
        df_indexed[col] = df_indexed.groupby(level="ticker")[col].ffill().bfill()

    # Fill volume with 0 if missing
    df_indexed["volume"] = df_indexed.groupby(level="ticker")["volume"].ffill().fillna(0).astype(np.int64)

    df_cleaned_long = df_indexed.reset_index()
    timings["clean_and_filter"] = round(time.perf_counter() - t_step_start, 3)
    print(f"[+] Cleaned long dataset: {len(df_cleaned_long):,} rows in {timings['clean_and_filter']}s")

    # STEP 3: Pivot to wide format (dates x tickers)
    t_step_start = time.perf_counter()
    print("[*] Pivoting wide format tables (dates x tickers)...")
    prices_wide = df_cleaned_long.pivot(index="date", columns="ticker", values="close")
    prices_wide.index.name = "date"

    volume_wide = df_cleaned_long.pivot(index="date", columns="ticker", values="volume")
    volume_wide.index.name = "date"

    # Compute daily percentage returns wide table for rapid analytics
    returns_wide = prices_wide.pct_change().fillna(0.0)

    timings["pivot_wide_tables"] = round(time.perf_counter() - t_step_start, 3)
    print(f"[+] Pivoted tables shaped {prices_wide.shape} in {timings['pivot_wide_tables']}s")

    # STEP 4: Process Metadata and Join
    t_step_start = time.perf_counter()
    print(f"[*] Processing metadata from {companies_path.name}...")
    df_comp_raw = pd.read_csv(companies_path)
    
    # Map columns
    # Companies file: Symbol, Shortname, Longname, Sector, Industry, Marketcap, etc.
    comp_cols = {c.lower(): c for c in df_comp_raw.columns}
    symbol_col = comp_cols.get("symbol", "Symbol")
    sector_col = comp_cols.get("sector", "Sector")
    short_name_col = comp_cols.get("shortname", "Shortname")
    long_name_col = comp_cols.get("longname", "Longname")
    industry_col = comp_cols.get("industry", "Industry")
    market_cap_col = comp_cols.get("marketcap", "Marketcap")

    metadata_list = []
    comp_dict = df_comp_raw.set_index(symbol_col).to_dict(orient="index")

    for ticker in kept_tickers:
        info = comp_dict.get(ticker, {})
        # If not exact match, try dot vs dash (e.g. BRK-B vs BRK.B)
        if not info:
            alt_ticker = ticker.replace(".", "-") if "." in ticker else ticker.replace("-", ".")
            info = comp_dict.get(alt_ticker, {})

        sector = info.get(sector_col, "Other")
        if pd.isna(sector) or str(sector).strip() == "":
            sector = "Other"

        name = info.get(short_name_col) or info.get(long_name_col) or ticker
        industry = info.get(industry_col, "Other")
        if pd.isna(industry):
            industry = "Other"
        
        market_cap = info.get(market_cap_col, 0)
        if pd.isna(market_cap):
            market_cap = 0

        metadata_list.append({
            "ticker": ticker,
            "name": str(name),
            "sector": str(sector),
            "industry": str(industry),
            "market_cap": float(market_cap)
        })

    df_metadata = pd.DataFrame(metadata_list)
    timings["metadata_join"] = round(time.perf_counter() - t_step_start, 3)
    print(f"[+] Joined metadata for {len(df_metadata)} tickers in {timings['metadata_join']}s")
    print(f"    Sectors breakdown:\n{df_metadata['sector'].value_counts().to_string()}")

    # Also join sector and company name to long OHLCV table
    ticker_to_sector = dict(zip(df_metadata["ticker"], df_metadata["sector"]))
    ticker_to_name = dict(zip(df_metadata["ticker"], df_metadata["name"]))
    df_cleaned_long["sector"] = df_cleaned_long["ticker"].map(ticker_to_sector)
    df_cleaned_long["company_name"] = df_cleaned_long["ticker"].map(ticker_to_name)

    # STEP 5: Save processed Parquet files
    t_step_start = time.perf_counter()
    print("[*] Saving parquet files to disk...")

    ohlcv_path = processed_dir / "ohlcv_long.parquet"
    prices_path_out = processed_dir / "prices_wide.parquet"
    volume_path_out = processed_dir / "volume_wide.parquet"
    returns_path_out = processed_dir / "returns_wide.parquet"
    metadata_path_out = processed_dir / "metadata.parquet"

    df_cleaned_long.to_parquet(ohlcv_path, index=False)
    prices_wide.to_parquet(prices_path_out)
    volume_wide.to_parquet(volume_path_out)
    returns_wide.to_parquet(returns_path_out)
    df_metadata.to_parquet(metadata_path_out, index=False)

    timings["save_parquet"] = round(time.perf_counter() - t_step_start, 3)
    print(f"[+] Parquet files written to {processed_dir}")

    total_time = round(time.perf_counter() - t_start, 3)
    timings["total"] = total_time
    curr_mem = get_memory_usage_mb()
    peak_memory = max(peak_memory, curr_mem)

    # STEP 6: Write pipeline_report.json
    report = {
        "status": "success",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "rows_raw": int(total_raw_rows),
        "rows_cleaned": int(len(df_cleaned_long)),
        "tickers_raw": int(len(initial_tickers)),
        "tickers_kept": int(len(kept_tickers)),
        "tickers_dropped": int(len(dropped_tickers)),
        "dropped_tickers": dropped_tickers,
        "date_range": {
            "start": all_dates[0],
            "end": all_dates[-1],
            "total_trading_days": int(total_calendar_days)
        },
        "sectors": sorted(df_metadata["sector"].unique().tolist()),
        "step_timings_seconds": timings,
        "memory_usage_mb": {
            "peak_rss": peak_memory,
            "current_rss": curr_mem
        },
        "files_generated": [
            str(ohlcv_path.name),
            str(prices_path_out.name),
            str(volume_path_out.name),
            str(returns_path_out.name),
            str(metadata_path_out.name)
        ]
    }

    report_path = processed_dir / "pipeline_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"[+] Pipeline report saved to {report_path}")
    print("=" * 60)
    print(f"PIPELINE COMPLETED SUCCESSFULLY IN {total_time} SECONDS")
    print(f"Kept: {len(kept_tickers)} tickers, {total_calendar_days} days, {len(df_cleaned_long):,} records")
    print(f"Memory: Peak {peak_memory} MB, Current {curr_mem} MB")
    print("=" * 60)

    return report

if __name__ == "__main__":
    run_ingest()
