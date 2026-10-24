from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import networkx as nx
from networkx.algorithms.community import greedy_modularity_communities

from app.schemas import NetworkResponse, NetworkNode, NetworkEdge, NetworkStats
from app.services.data_loader import DataLoader

def build_correlation_network(
    data_loader: DataLoader,
    threshold: float = 0.6,
    sector: str = "All",
    limit: int = 80,
    window_days: int = 252
) -> NetworkResponse:
    metadata_df = data_loader.metadata.copy()

    # Filter by sector if specified
    if sector and sector.lower() != "all":
        metadata_df = metadata_df[metadata_df["sector"].str.lower() == sector.lower()]

    if metadata_df.empty:
        return NetworkResponse(
            nodes=[],
            edges=[],
            stats=NetworkStats(density=0.0, average_clustering=0.0, num_communities=0, num_nodes=0, num_edges=0),
            threshold=threshold,
            sector_filter=sector
        )

    # Sort by market capitalization to pick leading representative stocks
    selected_meta = metadata_df.sort_values("market_cap", ascending=False).head(limit)
    selected_tickers = [t for t in selected_meta["ticker"].tolist() if t in data_loader.ticker_set]

    # Calculate returns correlation over recent window
    returns_slice = data_loader.returns_wide[selected_tickers].iloc[-window_days:]
    corr_matrix = returns_slice.corr()

    # Build NetworkX graph
    G = nx.Graph()

    meta_lookup = {row["ticker"]: row for _, row in selected_meta.iterrows()}
    for ticker in selected_tickers:
        row = meta_lookup.get(ticker, {})
        G.add_node(
            ticker,
            name=str(row.get("name", ticker)),
            sector=str(row.get("sector", "Other"))
        )

    edges_list: List[NetworkEdge] = []
    n = len(selected_tickers)
    for i in range(n):
        for j in range(i + 1, n):
            t1, t2 = selected_tickers[i], selected_tickers[j]
            c = float(corr_matrix.loc[t1, t2])
            if c >= threshold:
                G.add_edge(t1, t2, weight=round(c, 4))
                edges_list.append(NetworkEdge(source=t1, target=t2, weight=round(c, 4)))

    # Compute metrics
    degrees = dict(G.degree())
    try:
        betweenness = nx.betweenness_centrality(G)
    except Exception:
        betweenness = {t: 0.0 for t in selected_tickers}

    # Community detection via greedy modularity
    communities = list(greedy_modularity_communities(G))
    node_community_map = {}
    for comm_idx, comm in enumerate(communities):
        for node in comm:
            node_community_map[node] = comm_idx

    # Build nodes list
    nodes_list: List[NetworkNode] = []
    for ticker in selected_tickers:
        meta_info = meta_lookup.get(ticker, {})
        nodes_list.append(
            NetworkNode(
                id=ticker,
                ticker=ticker,
                label=ticker,
                name=str(meta_info.get("name", ticker)),
                sector=str(meta_info.get("sector", "Other")),
                degree=int(degrees.get(ticker, 0)),
                betweenness_centrality=round(float(betweenness.get(ticker, 0.0)), 5),
                community_id=int(node_community_map.get(ticker, 0))
            )
        )

    # Compute graph statistics
    try:
        density = round(float(nx.density(G)), 4)
    except Exception:
        density = 0.0

    try:
        avg_clustering = round(float(nx.average_clustering(G)), 4)
    except Exception:
        avg_clustering = 0.0

    stats = NetworkStats(
        density=density,
        average_clustering=avg_clustering,
        num_communities=len(communities),
        num_nodes=len(nodes_list),
        num_edges=len(edges_list)
    )

    return NetworkResponse(
        nodes=nodes_list,
        edges=edges_list,
        stats=stats,
        threshold=threshold,
        sector_filter=sector
    )
