import asyncio
import json
import time
from typing import Set, Dict, Any, List, Optional
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, HTTPException

from app.services.live_feed import LiveMarketFeed, get_live_feed
from app.services.data_loader import DataLoader, get_data_loader

router = APIRouter(prefix="/live", tags=["Live Market Feed"])

@router.get("/status")
def get_status(feed: LiveMarketFeed = Depends(get_live_feed)):
    """Returns live feed connectivity, market open/closed status, throughput, and subscribed symbols."""
    return feed.get_status()

@router.get("/candles/{ticker}")
def get_live_candles(
    ticker: str,
    timeframe: str = Query("1m", pattern="^(1m|5m)$"),
    limit: int = Query(300, ge=10, le=2000),
    feed: LiveMarketFeed = Depends(get_live_feed)
):
    """Returns in-memory live 1m or 5m candles aggregated from incoming trade ticks."""
    candles = feed.get_candles(ticker, timeframe=timeframe, limit=limit)
    return {
        "ticker": ticker.upper(),
        "timeframe": timeframe,
        "count": len(candles),
        "candles": candles
    }

@router.websocket("/stream")
async def live_stream_websocket(websocket: WebSocket):
    """
    WebSocket endpoint pushing real-time price updates and forming candles to browser clients.
    Batches updates into frames at most every 250 ms (max 4 frames per second).
    """
    await websocket.accept()
    feed = get_live_feed()
    client_queue = asyncio.Queue(maxsize=1000)
    feed.register_client(client_queue)

    subscribed_tickers: Set[str] = set()

    # Task to read incoming client control messages (subscribe/unsubscribe)
    async def client_reader():
        try:
            while True:
                text = await websocket.receive_text()
                try:
                    data = json.loads(text)
                    action = data.get("action")
                    tickers = [t.upper().strip() for t in data.get("tickers", [])]
                    
                    if action == "subscribe":
                        for t in tickers:
                            subscribed_tickers.add(t)
                            feed.subscribe_symbol(t)
                        # Send ack
                        await websocket.send_text(json.dumps({
                            "type": "subscribed",
                            "tickers": list(subscribed_tickers)
                        }))

                    elif action == "unsubscribe":
                        for t in tickers:
                            subscribed_tickers.discard(t)
                        await websocket.send_text(json.dumps({
                            "type": "unsubscribed",
                            "tickers": list(subscribed_tickers)
                        }))

                    elif action == "ping":
                        await websocket.send_text(json.dumps({"type": "pong", "time": time.time()}))

                except Exception as e:
                    await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        except WebSocketDisconnect:
            pass
        except Exception:
            pass

    reader_task = asyncio.create_task(client_reader())

    try:
        # Batching loop: sends at most every 250 ms (<= 4 frames per second)
        BATCH_INTERVAL = 0.250 # 250 ms

        while True:
            t_start = time.time()
            pending_updates: Dict[str, Dict[str, Any]] = {}

            # Drain queue items available right now
            while not client_queue.empty():
                try:
                    tick = client_queue.get_nowait()
                    sym = tick.get("ticker")
                    # If client has specific subscriptions, only send subscribed; else send all active
                    if not subscribed_tickers or sym in subscribed_tickers:
                        pending_updates[sym] = tick # keep latest per symbol in this 250ms batch
                except asyncio.QueueEmpty:
                    break

            if pending_updates:
                frame_payload = {
                    "type": "frame",
                    "timestamp": time.time(),
                    "count": len(pending_updates),
                    "updates": list(pending_updates.values())
                }
                await websocket.send_text(json.dumps(frame_payload))

            elapsed = time.time() - t_start
            sleep_duration = max(0.01, BATCH_INTERVAL - elapsed)
            await asyncio.sleep(sleep_duration)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WS client disconnected: {e}")
    finally:
        feed.unregister_client(client_queue)
        reader_task.cancel()
