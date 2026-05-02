from typing import Literal

import yfinance as yf
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(tags=["stocks"])

HistoryPeriod = Literal["1d", "5d", "1mo", "3mo", "6mo", "1y"]
HistoryInterval = Literal["1d", "1h"]
VALID_PERIODS: set[str] = {"1d", "5d", "1mo", "3mo", "6mo", "1y"}
VALID_INTERVALS: set[str] = {"1d", "1h"}


def _round_number(value: object, decimals: int = 2) -> float | int | None:
    if value is None:
        return None

    try:
        number = float(value)
    except (TypeError, ValueError):
        return None

    if number != number:
        return None

    return round(number, decimals)


def _stock_not_found(ticker: str) -> HTTPException:
    return HTTPException(
        status_code=404,
        detail=f"Stock ticker '{ticker.upper()}' was not found.",
    )


def _metadata_for_stock(stock: yf.Ticker) -> dict[str, object]:
    try:
        return stock.get_info()
    except Exception:
        return {}


def _quote_from_history(
    symbol: str,
    history,
    info: dict[str, object] | None = None,
) -> dict[str, object]:
    if history.empty or "Close" not in history:
        raise _stock_not_found(symbol)

    closes = history["Close"].dropna()
    if closes.empty:
        raise _stock_not_found(symbol)

    price = float(closes.iloc[-1])
    previous_close = float(closes.iloc[-2]) if len(closes) > 1 else price
    metadata = info or {}
    metadata_previous_close = _round_number(
        metadata.get("previousClose") or metadata.get("regularMarketPreviousClose"),
        decimals=6,
    )
    previous_close = float(metadata_previous_close or previous_close or price)
    change = price - previous_close
    change_percent = (change / previous_close * 100) if previous_close else 0

    volume = None
    if "Volume" in history and not history["Volume"].dropna().empty:
        volume = int(history["Volume"].dropna().iloc[-1])

    return {
        "ticker": symbol,
        "name": metadata.get("longName") or metadata.get("shortName") or symbol,
        "price": _round_number(price),
        "change": _round_number(change),
        "changePercent": _round_number(change_percent),
        "previousClose": _round_number(previous_close),
        "dayHigh": _round_number(metadata.get("dayHigh") or metadata.get("regularMarketDayHigh")),
        "dayLow": _round_number(metadata.get("dayLow") or metadata.get("regularMarketDayLow")),
        "marketCap": metadata.get("marketCap"),
        "volume": metadata.get("volume") or volume,
    }


def fetch_stock_quote(ticker: str) -> dict[str, object]:
    symbol = ticker.strip().upper()
    if not symbol:
        raise _stock_not_found(ticker)

    stock = yf.Ticker(symbol)

    try:
        history = stock.history(period="5d", interval="1d")
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to fetch quote data for '{symbol}'.",
        ) from exc

    if history.empty or "Close" not in history:
        raise _stock_not_found(symbol)

    return _quote_from_history(symbol, history, _metadata_for_stock(stock))


@router.get("/stock/{ticker}")
def get_stock(ticker: str) -> dict[str, object]:
    return fetch_stock_quote(ticker)


@router.get("/stock/{ticker}/history")
def get_stock_history(
    ticker: str,
    period: HistoryPeriod = Query(default="1mo"),
    interval: HistoryInterval = Query(default="1d"),
) -> list[dict[str, object]]:
    symbol = ticker.strip().upper()
    if period not in VALID_PERIODS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid period '{period}'. Valid values are: {', '.join(sorted(VALID_PERIODS))}.",
        )
    if interval not in VALID_INTERVALS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid interval '{interval}'. Valid values are: {', '.join(sorted(VALID_INTERVALS))}.",
        )
    if interval == "1h" and period not in {"1d", "5d"}:
        raise HTTPException(
            status_code=422,
            detail="Hourly history is only available for 1d and 5d periods.",
        )

    stock = yf.Ticker(symbol)

    history_period = period
    history_interval = interval
    if period == "1d" and interval == "1d":
        history_period = "5d"

    try:
        history = stock.history(period=history_period, interval=history_interval)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Unable to fetch history data for '{symbol}'.",
        ) from exc

    if history.empty or "Close" not in history:
        raise _stock_not_found(symbol)

    if period == "1d" and interval == "1d":
        history = history.tail(2)

    return [
        {
            "date": index.isoformat() if interval == "1h" else index.strftime("%Y-%m-%d"),
            "open": _round_number(row["Open"]) if "Open" in row else None,
            "high": _round_number(row["High"]) if "High" in row else None,
            "low": _round_number(row["Low"]) if "Low" in row else None,
            "close": _round_number(row["Close"]),
            "volume": int(row["Volume"]) if "Volume" in row and row["Volume"] == row["Volume"] else None,
        }
        for index, row in history.dropna(subset=["Close"]).iterrows()
    ]


@router.get("/stocks/batch")
def get_stock_batch(
    tickers: str = Query(..., description="Comma-separated tickers, e.g. AAPL,GOOGL,TSLA"),
) -> list[dict[str, object]]:
    symbols = [ticker.strip().upper() for ticker in tickers.split(",") if ticker.strip()]

    if not symbols:
        raise HTTPException(
            status_code=422,
            detail="At least one ticker is required.",
        )

    try:
        downloaded = yf.download(
            tickers=" ".join(symbols),
            period="5d",
            interval="1d",
            group_by="ticker",
            threads=True,
            progress=False,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Unable to fetch batch quote data.",
        ) from exc

    ticker_collection = yf.Tickers(" ".join(symbols))
    quotes: list[dict[str, object]] = []

    for symbol in symbols:
        try:
            if len(symbols) == 1:
                history = downloaded
            else:
                history = downloaded[symbol]

            stock = ticker_collection.tickers[symbol]
            quotes.append(_quote_from_history(symbol, history, _metadata_for_stock(stock)))
        except KeyError as exc:
            raise _stock_not_found(symbol) from exc

    return quotes
