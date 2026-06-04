from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import pyotp
import random
import yfinance as yf
from datetime import datetime
from typing import Optional, List
import re
import concurrent.futures
import pandas as pd

from predictor import predict_stock_price, generate_historical_data, STOCK_METADATA

# Import the official Angel One SmartAPI Python bindings
try:
    from SmartApi import SmartConnect
    SMARTAPI_AVAILABLE = True
except ImportError:
    SMARTAPI_AVAILABLE = False
    print("[backend] Warning: smartapi-python library not found. Running in simulated fallback mode.")

# Global active Angel One SmartAPI connection session
ACTIVE_SMARTCONNECT = None
ACTIVE_REFRESH_TOKEN = None

STOCK_TOKENS = {
    "RELIANCE": {"token": "2885", "symbol": "RELIANCE-EQ"},
    "TCS": {"token": "11536", "symbol": "TCS-EQ"},
    "INFY": {"token": "1594", "symbol": "INFY-EQ"},
    "HDFCBANK": {"token": "1333", "symbol": "HDFCBANK-EQ"},
    "ICICIBANK": {"token": "4963", "symbol": "ICICIBANK-EQ"},
    "TATAMOTORS": {"token": "3456", "symbol": "TATAMOTORS-EQ"},
    "SBIN": {"token": "3045", "symbol": "SBIN-EQ"},
}

def safe_int(val) -> int:
    try:
        return int(float(str(val).strip()))
    except Exception:
        return 0

def safe_float(val) -> float:
    try:
        return float(str(val).strip())
    except Exception:
        return 0.0

def scrape_google_finance_price(symbol: str) -> dict:
    gf_symbol = "TMCV" if symbol == "TATAMOTORS" else symbol
    url = f"https://www.google.com/finance/quote/{gf_symbol}:NSE"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        res = requests.get(url, headers=headers, timeout=2.0)
        if res.status_code == 200:
            html = res.text
            price_match = re.search(r'class="N6SYTe"[^>]*>.*?₹?\s*([\d,]+\.\d{2})', html, re.DOTALL)
            if not price_match:
                price_match = re.search(r'class="ujg0He"[^>]*>.*?<span>₹?\s*([\d,]+\.\d{2})', html, re.DOTALL)
            if not price_match:
                price_match = re.search(r'<span[^>]*jsname="Pdsbrc"[^>]*>.*?₹?\s*([\d,]+\.\d{2})', html, re.DOTALL)
                
            if price_match:
                price = float(price_match.group(1).replace(",", ""))
                pct_match = re.search(r'class="[A-Za-z0-9\s]*"[^>]*>([+-]?\d+\.\d+%)', html)
                pct = 0.0
                if pct_match:
                    pct = float(pct_match.group(1).replace("%", ""))
                return {"price": price, "pct": pct}
    except Exception:
        pass
    return None

def scrape_google_finance_index(sym: str) -> dict:
    url = f"https://www.google.com/finance/quote/{sym}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        res = requests.get(url, headers=headers, timeout=2.0)
        if res.status_code == 200:
            html = res.text
            price_match = re.search(r'class="N6SYTe"[^>]*>.*?₹?\s*([\d,]+\.\d{2})', html, re.DOTALL)
            if not price_match:
                price_match = re.search(r'class="ujg0He"[^>]*>.*?<span>₹?\s*([\d,]+\.\d{2})', html, re.DOTALL)
            
            price = "0.00"
            change = "0.00"
            pct = "0.00"
            if price_match:
                price = price_match.group(1).replace(",", "")
                
            change_match = re.search(r'class="[A-Za-z0-9\s]*"[^>]*>([+-][\d,]+\.\d{2})\s*\(([+-]?\d+\.\d+%)\)', html)
            if not change_match:
                change_match = re.search(r'([+-][\d,]+\.\d{2})\s*([+-]?\d+\.\d+%)', html)
            
            if change_match:
                change = change_match.group(1).replace(",", "")
                pct = change_match.group(2).replace("%", "")
            else:
                pct_only = re.search(r'class="[A-Za-z0-9\s]*"[^>]*>([+-]?\d+\.\d+%)', html)
                if pct_only:
                    pct = pct_only.group(1).replace("%", "")
                    pct_val = float(pct)
                    price_val = float(price)
                    change_val = (price_val * pct_val / 100.0) / (1.0 + pct_val / 100.0)
                    change = f"{change_val:+.2f}"
                    
            return {
                "value": float(price),
                "change": float(change),
                "pct": float(pct),
                "isUp": float(change) >= 0
            }
    except Exception:
        pass
    return None

app = FastAPI(title="QUANTUM PORTFOLIO Real-Time API", version="1.0.0")

# Enable CORS for the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FIREBASE_URL = "https://stock-market-13e36-default-rtdb.firebaseio.com"

# --- Models ---
class LoginRequest(BaseModel):
    clientId: str
    password: str
    totpKey: str
    apiKey: str
    isDemo: bool = False

class TradeRequest(BaseModel):
    clientId: str
    symbol: str
    qty: int
    price: float
    action: str # "BUY" or "SELL"

class PredictRequest(BaseModel):
    symbol: str
    horizonDays: int = 30

# --- Helper Functions ---
def get_db_url(path: str) -> str:
    return f"{FIREBASE_URL}/{path}.json"

def fetch_user_holdings(client_id: str) -> dict:
    url = get_db_url(f"users/{client_id}/holdings")
    response = requests.get(url, timeout=5.0)
    if response.status_code == 200:
        return response.json() or {}
    return {}

def save_user_holdings(client_id: str, holdings: dict):
    url = get_db_url(f"users/{client_id}/holdings")
    response = requests.put(url, json=holdings, timeout=5.0)
    return response.status_code == 200

def add_transaction(client_id: str, transaction: dict):
    url = get_db_url(f"users/{client_id}/transactions")
    response = requests.post(url, json=transaction, timeout=5.0)
    return response.status_code == 200

# --- Sample Seeding ---
def seed_initial_portfolio(client_id: str):
    """
    Backup portfolio in case broker authentication is simulated or fails.
    """
    initial_holdings = {
        "RELIANCE": {
            "symbol": "RELIANCE",
            "name": "Reliance Industries Ltd.",
            "qty": 45,
            "avgPrice": 2720.50,
            "sector": "Energy & Conglomerate"
        },
        "TCS": {
            "symbol": "TCS",
            "name": "Tata Consultancy Services Ltd.",
            "qty": 20,
            "avgPrice": 3690.00,
            "sector": "Information Technology"
        },
        "HDFCBANK": {
            "symbol": "HDFCBANK",
            "name": "HDFC Bank Ltd.",
            "qty": 80,
            "avgPrice": 1495.20,
            "sector": "Financial Services"
        },
        "TATAMOTORS": {
            "symbol": "TATAMOTORS",
            "name": "Tata Motors Ltd.",
            "qty": 110,
            "avgPrice": 840.40,
            "sector": "Automotive"
        }
    }
    save_user_holdings(client_id, initial_holdings)
    
    seed_txs = [
        {"symbol": "RELIANCE", "qty": 45, "price": 2720.50, "action": "BUY", "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")},
        {"symbol": "TCS", "qty": 20, "price": 3690.00, "action": "BUY", "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")},
        {"symbol": "HDFCBANK", "qty": 80, "price": 1495.20, "action": "BUY", "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")},
        {"symbol": "TATAMOTORS", "qty": 110, "price": 840.40, "action": "BUY", "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
    ]
    # Optimize: Batch all transactions into a single PUT request (1 round-trip instead of 4 sequential blocking POSTs)
    seed_txs_payload = {}
    for i, tx in enumerate(seed_txs):
        key = f"seed_tx_{i}"
        seed_txs_payload[key] = tx
        
    requests.put(get_db_url(f"users/{client_id}/transactions"), json=seed_txs_payload, timeout=5.0)

# --- Routes ---
@app.get("/")
def read_root():
    return {"status": "healthy", "service": "Quantum Portfolio Real-Time Engine", "timestamp": datetime.now()}

@app.post("/api/login")
def login(request: LoginRequest):
    """
    Logs into Angel One securely using official SmartAPI bindings.
    Syncs real holdings into Firebase Realtime Database in real-time.
    Falls back gracefully to simulated portfolios if offline or during credentials refresh.
    """
    global ACTIVE_SMARTCONNECT, ACTIVE_REFRESH_TOKEN
    client_id = request.clientId
    
    # 1. Handle Demo Mode instantly (explicitly clear any previous active real sessions)
    if request.isDemo:
        ACTIVE_SMARTCONNECT = None
        ACTIVE_REFRESH_TOKEN = None
        
        holdings = fetch_user_holdings(client_id)
        if not holdings:
            seed_initial_portfolio(client_id)
            holdings = fetch_user_holdings(client_id)
        return {
            "success": True,
            "clientId": client_id,
            "realBrokerActive": False,
            "message": "Demo Mode Sync Active",
            "holdings": holdings
        }

    # 2. Try Connecting to Real Angel One Account via SmartAPI
    real_broker_active = False
    message = "Simulated Fallback Mode"
    holdings = {}

    if not SMARTAPI_AVAILABLE:
        raise HTTPException(
            status_code=400,
            detail="Angel One SmartAPI Python library (smartapi-python) is not installed on this system. Real broker logins are disabled."
        )

    if not request.apiKey or not request.totpKey or not request.password:
        raise HTTPException(
            status_code=400,
            detail="API Key, TOTP Key, and Password/PIN are required for Secure Login."
        )

    try:
        # Clean spaces from keys
        clean_api_key = request.apiKey.strip()
        clean_totp_key = request.totpKey.strip()
        clean_client_id = request.clientId.strip()
        clean_password = request.password.strip()

        # Initialize SmartConnect Session
        smart_connect = SmartConnect(api_key=clean_api_key)
        
        # Generate programmatic 6-digit 2FA OTP
        totp_code = pyotp.TOTP(clean_totp_key).now()
        
        # Authenticate
        session_data = smart_connect.generateSession(clean_client_id, clean_password, totp_code)
        
        if session_data.get("status") == True:
            ACTIVE_SMARTCONNECT = smart_connect
            ACTIVE_REFRESH_TOKEN = session_data.get("data", {}).get("refreshToken")
            real_broker_active = True
            message = "Live Angel One SmartAPI Connection Established"
            
            # Fetch actual account holdings
            raw_holdings = smart_connect.holding()
            
            # Check if holdings returned successfully
            if raw_holdings.get("status") == True and "data" in raw_holdings:
                # Map Angel One holdings schema to our Firebase holdings standard
                real_holdings = {}
                holdings_data = raw_holdings.get("data") or []
                for item in holdings_data:
                    trading_symbol = item.get("tradingsymbol", "")
                    symbol = trading_symbol.split("-")[0] # e.g. RELIANCE-EQ -> RELIANCE
                    
                    real_holdings[symbol] = {
                        "symbol": symbol,
                        "name": item.get("symbolname", trading_symbol),
                        "qty": safe_int(item.get("quantity", 0)),
                        "avgPrice": safe_float(item.get("averageprice", 0.0)),
                        "sector": STOCK_METADATA.get(symbol, {}).get("sector", "NSE Equity")
                    }
                
                save_user_holdings(client_id, real_holdings)
                holdings = real_holdings
            else:
                holdings = {}
        else:
            err_msg = session_data.get("message") or "Auth failed"
            print(f"[backend] SmartAPI Auth fail: {err_msg}. Throwing error.")
            raise HTTPException(
                status_code=400,
                detail=f"Angel One SmartAPI Authentication Failed: {err_msg}. Please check your Client ID, Password/PIN, or API Key."
            )
            
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        err_msg = str(e)
        if "Non-base32 digit found" in err_msg:
            user_msg = "Invalid TOTP Key format. Please ensure you enter the valid 2FA Secret Key (Base32, e.g. 'JBSWY3DPEHPK3PXP') provided by Angel One settings, not a UUID."
        else:
            user_msg = err_msg
        print(f"[backend] Exception during SmartAPI connection: {err_msg}. Throwing error.")
        raise HTTPException(
            status_code=400,
            detail=f"SmartAPI Connection Error: {user_msg}"
        )

    # 3. Seed portfolio ONLY if we are in demo/simulated mode AND the database node is completely empty
    if not real_broker_active and not holdings:
        seed_initial_portfolio(client_id)
        holdings = fetch_user_holdings(client_id)

  # Save Session parameters in Firebase RTDB
    session_data = {
        "clientId": client_id,
        "apiKey": request.apiKey or "simulated-api",
        "lastLogin": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "realBrokerActive": real_broker_active,
        "connectionMessage": message
    }
    requests.put(get_db_url(f"users/{client_id}/session"), json=session_data, timeout=5.0)

    return {
        "success": True,
        "clientId": client_id,
        "realBrokerActive": real_broker_active,
        "message": message,
        "holdings": holdings
    }

@app.post("/api/logout")
def logout():
    """
    Explicitly terminates and clears the active broker session and tokens from memory.
    """
    global ACTIVE_SMARTCONNECT, ACTIVE_REFRESH_TOKEN
    ACTIVE_SMARTCONNECT = None
    ACTIVE_REFRESH_TOKEN = None
    return {"success": True, "message": "Broker session cleared from memory successfully."}

@app.get("/api/profile")
def get_user_profile(clientId: str = "ANGEL-DEMO-99"):
    """
    Fetches user profile information in real-time from Angel One API
    or falls back to a highly realistic, customized demo profile.
    """
    global ACTIVE_SMARTCONNECT, ACTIVE_REFRESH_TOKEN
    
    # If a live Angel One session is active AND the requested client is not the demo simulator, fetch real info
    if ACTIVE_SMARTCONNECT is not None and clientId != "ANGEL-DEMO-99":
        try:
            profile_res = ACTIVE_SMARTCONNECT.getProfile(ACTIVE_REFRESH_TOKEN)
            if profile_res.get("status") == True and "data" in profile_res:
                data = profile_res["data"]
                return {
                    "isLive": True,
                    "clientId": data.get("clientcode", clientId),
                    "name": data.get("name", "Akash Patil"),
                    "email": data.get("email", "akash.patil@quantumportfolio.io"),
                    "mobile": data.get("mobileno", "+91 98765 43210"),
                    "pan": data.get("pan", "ABCDE1234F"),
                    "dpId": data.get("dpid", "1208160012345678"),
                    "broker": "Angel One Securities Ltd.",
                    "status": "Active (Live API Connected)",
                    "accountType": "Individual Resident",
                    "exchanges": data.get("exchanges", ["NSE", "BSE", "NFO"]),
                    "lastLogin": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                }
        except Exception as e:
            print(f"[backend] Profile fetch from Angel One failed: {e}")
            
    # Mock / Demo Profile fallback
    return {
        "isLive": False,
        "clientId": clientId,
        "name": "Akash Patil" if clientId == "ANGEL-DEMO-99" else f"Trader {clientId}",
        "email": "akash.patil@quantumportfolio.io" if clientId == "ANGEL-DEMO-99" else f"trader.{clientId.lower()}@quantumportfolio.io",
        "mobile": "+91 98765 43210" if clientId == "ANGEL-DEMO-99" else "+91 90123 45678",
        "pan": "ABCDE1234F" if clientId == "ANGEL-DEMO-99" else "PQRMN5678Z",
        "dpId": "1208160012345678" if clientId == "ANGEL-DEMO-99" else "1208160098765432",
        "broker": "Simulated Paper Broker",
        "status": "Active (Demo Account)",
        "accountType": "Simulated Individual",
        "exchanges": ["NSE (Equities)", "NSE (Futures & Options)", "BSE (Equities)"],
        "lastLogin": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }

@app.get("/api/stocks")
def get_stocks():
    """
    Returns actual live NSE stock prices, fetching from Angel One SmartAPI if active,
    or falling back to real-time Google Finance scraping concurrently.
    """
    global ACTIVE_SMARTCONNECT
    stocks_list = []
    
    # 1. Try to fetch from active Angel One session first
    if ACTIVE_SMARTCONNECT is not None:
        try:
            for k, v in STOCK_METADATA.items():
                if k == "NIFTY50":
                    continue
                token_info = STOCK_TOKENS.get(k)
                if token_info:
                    token = token_info["token"]
                    trading_symbol = token_info["symbol"]
                    ltp_res = ACTIVE_SMARTCONNECT.ltpData(exchange="NSE", tradingsymbol=trading_symbol, symboltoken=token)
                    if ltp_res.get("status") == True and "data" in ltp_res and ltp_res["data"] is not None:
                        data = ltp_res["data"]
                        current = float(data.get("ltp", v["base_price"]))
                        close = float(data.get("close", current))
                        change = current - close
                        change_pct = (change / close) * 100 if close > 0 else 0.0
                        
                        stocks_list.append({
                            "symbol": k,
                            "name": v["name"],
                            "sector": v["sector"],
                            "basePrice": round(close, 2),
                            "currentPrice": round(current, 2),
                            "change": round(change, 2),
                            "changePct": round(change_pct, 2)
                        })
            if len(stocks_list) > 0:
                return stocks_list
        except Exception as e:
            print(f"[backend] Angel One LTP error: {e}. Falling back to Google Finance.")
    
    # 2. Fallback: Concurrent Google Finance scraping with individual robust fallbacks
    symbols_to_scrape = [k for k in STOCK_METADATA.keys() if k != "NIFTY50"]
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=len(symbols_to_scrape)) as executor:
            scrape_results = list(executor.map(scrape_google_finance_price, symbols_to_scrape))
            
        for k, res in zip(symbols_to_scrape, scrape_results):
            v = STOCK_METADATA[k]
            if res is not None:
                current = res["price"]
                pct = res["pct"]
                prev_close = current / (1.0 + pct / 100.0)
                change = current - prev_close
                
                stocks_list.append({
                    "symbol": k,
                    "name": v["name"],
                    "sector": v["sector"],
                    "basePrice": round(prev_close, 2),
                    "currentPrice": round(current, 2),
                    "change": round(change, 2),
                    "changePct": round(pct, 2)
                })
            else:
                # Try getting last price via yfinance as a single-stock live fallback
                print(f"[backend] Google Finance scrape returned None for {k}. Trying yfinance fallback.")
                try:
                    yf_sym = f"{k}.NS"
                    yf_df = yf.download(yf_sym, period="2d", progress=False)
                    if not yf_df.empty:
                        if isinstance(yf_df.columns, pd.MultiIndex):
                            yf_df.columns = [col[0] for col in yf_df.columns]
                        current = float(yf_df["Close"].iloc[-1])
                        prev_close = float(yf_df["Close"].iloc[-2]) if len(yf_df) > 1 else current
                        change = current - prev_close
                        change_pct = (change / prev_close) * 100 if prev_close > 0 else 0.0
                        
                        stocks_list.append({
                            "symbol": k,
                            "name": v["name"],
                            "sector": v["sector"],
                            "basePrice": round(prev_close, 2),
                            "currentPrice": round(current, 2),
                            "change": round(change, 2),
                            "changePct": round(change_pct, 2)
                        })
                        continue
                except Exception as yf_err:
                    print(f"[backend] yfinance fallback failed for {k}: {yf_err}")
                
                # Dynamic simulated quote fallback for this specific stock
                print(f"[backend] Falling back to simulated quote for {k}")
                base = v["base_price"]
                current = base * (1 + random.uniform(-0.005, 0.005))
                prev_close = base
                change = current - prev_close
                change_pct = (change / prev_close) * 100
                stocks_list.append({
                    "symbol": k,
                    "name": v["name"],
                    "sector": v["sector"],
                    "basePrice": round(prev_close, 2),
                    "currentPrice": round(current, 2),
                    "change": round(change, 2),
                    "changePct": round(change_pct, 2)
                })
        if len(stocks_list) > 0:
            return stocks_list
    except Exception as e:
        print(f"[backend] Google Finance scraping failed: {e}. Falling back to simulated quotes.")
        
    # 3. Last resort: Simulated Quotes using historical daily last closed
    stocks_list = []
    for k, v in STOCK_METADATA.items():
        if k == "NIFTY50":
            continue
        try:
            hist = generate_historical_data(k, days=365)
            current = float(hist["Close"].iloc[-1])
            prev_close = float(hist["Close"].iloc[-2])
            current = current * (1 + random.uniform(-0.0003, 0.0003))
            change = current - prev_close
            change_pct = (change / prev_close) * 100
        except Exception:
            base = v["base_price"]
            current = base
            prev_close = base * 0.99
            change = current - prev_close
            change_pct = 1.00
            
        stocks_list.append({
            "symbol": k,
            "name": v["name"],
            "sector": v["sector"],
            "basePrice": round(prev_close, 2),
            "currentPrice": round(current, 2),
            "change": round(change, 2),
            "changePct": round(change_pct, 2)
        })
    return stocks_list

@app.get("/api/market-trends")
def get_market_trends():
    """
    Returns actual live index prices and daily trends from Google Finance concurrently,
    or falls back to simulated indexes on error.
    """
    global ACTIVE_SMARTCONNECT
    indices_data = {}
    
    # 1. Try to fetch indices from active Angel One session first
    if ACTIVE_SMARTCONNECT is not None:
        try:
            tokens_map = {
                "NIFTY50": ("NIFTY", "26000"),
                "BANKNIFTY": ("NIFTY BANK", "26009"),
            }
            for name, (tsym, token) in tokens_map.items():
                ltp_res = ACTIVE_SMARTCONNECT.ltpData(exchange="NSE", tradingsymbol=tsym, symboltoken=token)
                if ltp_res.get("status") == True and "data" in ltp_res and ltp_res["data"] is not None:
                    data = ltp_res["data"]
                    current = float(data.get("ltp", 0.0))
                    close = float(data.get("close", current))
                    change = current - close
                    pct = (change / close) * 100 if close > 0 else 0.0
                    indices_data[name] = {
                        "value": round(current, 2),
                        "change": round(change, 2),
                        "pct": round(pct, 2),
                        "isUp": change >= 0
                    }
        except Exception as e:
            print(f"[backend] Angel One index fetch error: {e}")
            
    # For BSE SENSEX and NIFTY_IT, Google Finance is cleaner, or we can use it for all
    indices_to_scrape = {
        "NIFTY50": "NIFTY_50:INDEXNSE",
        "SENSEX": "SENSEX:INDEXBOM",
        "BANKNIFTY": "NIFTY_BANK:INDEXNSE",
        "NIFTY_IT": "NIFTY_IT:INDEXNSE"
    }
    
    missing_keys = [k for k in indices_to_scrape.keys() if k not in indices_data]
    if missing_keys:
        try:
            syms_to_scrape = [indices_to_scrape[k] for k in missing_keys]
            with concurrent.futures.ThreadPoolExecutor(max_workers=len(missing_keys)) as executor:
                scrape_results = list(executor.map(scrape_google_finance_index, syms_to_scrape))
                
            for k, res in zip(missing_keys, scrape_results):
                if res is not None:
                    indices_data[k] = res
        except Exception as e:
            print(f"[backend] Google Finance index scraping error: {e}")
            
    # Fill in any missing or failed keys with simulated defaults
    defaults = {
        "NIFTY50": {"value": 23907.15, "base": 23565.45},
        "SENSEX": {"value": 75867.80, "base": 74783.44},
        "NIFTY_IT": {"value": 28906.70, "base": 28493.54},
        "BANKNIFTY": {"value": 54853.85, "base": 54069.84}
    }
    for name, d in defaults.items():
        if name not in indices_data:
            current = d["value"] * (1 + random.uniform(-0.0003, 0.0003))
            change = current - d["base"]
            pct = (change / d["base"]) * 100
            indices_data[name] = {
                "value": round(current, 2),
                "change": round(change, 2),
                "pct": round(pct, 2),
                "isUp": change >= 0
            }
            
    return indices_data

@app.get("/api/stocks/search")
def search_stock(symbol: str):
    """
    Searches for a stock symbol on NSE and retrieves its live quote.
    """
    symbol = symbol.strip().upper()
    if not symbol:
        raise HTTPException(status_code=400, detail="Symbol cannot be empty.")
        
    global ACTIVE_SMARTCONNECT
    
    # 1. If Angel One session is active, try searching and fetching LTP
    if ACTIVE_SMARTCONNECT is not None:
        try:
            search_res = ACTIVE_SMARTCONNECT.searchScrip(exchange="NSE", searchscrip=symbol)
            if search_res.get("status") == True and "data" in search_res and len(search_res["data"]) > 0:
                eq_matches = [x for x in search_res["data"] if x.get("symbol", "").endswith("-EQ") or x.get("symbol", "") == symbol]
                match = eq_matches[0] if eq_matches else search_res["data"][0]
                
                token = match["token"]
                trading_symbol = match["symbol"]
                name = match.get("name", symbol)
                
                ltp_res = ACTIVE_SMARTCONNECT.ltpData(exchange="NSE", tradingsymbol=trading_symbol, symboltoken=token)
                if ltp_res.get("status") == True and "data" in ltp_res and ltp_res["data"] is not None:
                    data = ltp_res["data"]
                    current = float(data.get("ltp", 0.0))
                    close = float(data.get("close", current))
                    change = current - close
                    pct = (change / close) * 100 if close > 0 else 0.0
                    
                    return {
                        "symbol": symbol,
                        "name": name,
                        "currentPrice": round(current, 2),
                        "basePrice": round(close, 2),
                        "change": round(change, 2),
                        "changePct": round(pct, 2),
                        "sector": "NSE Equity",
                        "token": token,
                        "tradingSymbol": trading_symbol
                    }
        except Exception as e:
            print(f"[backend] Angel One search failed: {e}. Falling back to Google Finance.")

    # 2. Scrape from Google Finance
    res = scrape_google_finance_price(symbol)
    if res is not None:
        current = res["price"]
        pct = res["pct"]
        prev_close = current / (1.0 + pct / 100.0)
        change = current - prev_close
        
        name = f"{symbol} Ltd."
        try:
            gf_url = f"https://www.google.com/finance/quote/{symbol}:NSE"
            gf_res = requests.get(gf_url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}, timeout=2.0)
            if gf_res.status_code == 200:
                title_match = re.search(r'<title>([^<]+)\s+\([A-Z0-9_-]+\)\s+Stock Price', gf_res.text)
                if title_match:
                    name = title_match.group(1).replace("&amp;", "&").strip()
        except Exception:
            pass
            
        return {
            "symbol": symbol,
            "name": name,
            "currentPrice": round(current, 2),
            "basePrice": round(prev_close, 2),
            "change": round(change, 2),
            "changePct": round(pct, 2),
            "sector": "NSE Equity"
        }
    
    raise HTTPException(status_code=404, detail=f"Stock symbol {symbol} not found on NSE.")

@app.post("/api/predict")
def get_prediction(request: PredictRequest):
    """
    Invokes the custom regression-Fourier model running on REAL NSE stock histories.
    """
    global ACTIVE_SMARTCONNECT
    token_info = None
    
    # Dynamic stock metadata support
    if request.symbol not in STOCK_METADATA:
        name = f"{request.symbol} Ltd."
        if ACTIVE_SMARTCONNECT is not None:
            try:
                search_res = ACTIVE_SMARTCONNECT.searchScrip(exchange="NSE", searchscrip=request.symbol)
                if search_res.get("status") == True and "data" in search_res and len(search_res["data"]) > 0:
                    eq_matches = [x for x in search_res["data"] if x.get("symbol", "").endswith("-EQ") or x.get("symbol", "") == request.symbol]
                    match = eq_matches[0] if eq_matches else search_res["data"][0]
                    name = match.get("name", name)
                    token_info = {
                        "token": match["token"],
                        "symbol": match["symbol"]
                    }
            except Exception:
                pass
                
        # Set dynamic base price using actual live price if available
        live_price = 200.00
        try:
            live_quote = search_stock(request.symbol)
            live_price = live_quote["currentPrice"]
            name = live_quote["name"]
        except Exception:
            pass
            
        STOCK_METADATA[request.symbol] = {
            "name": name,
            "base_price": live_price,
            "sector": "NSE Equity",
            "beta": 1.00
        }
    else:
        # Resolve token info for predefined stocks if active session exists
        if ACTIVE_SMARTCONNECT is not None:
            predef = STOCK_TOKENS.get(request.symbol)
            if predef:
                token_info = predef
        
    try:
        # Fetch latest live price for real-time predictor alignment
        live_price = None
        if ACTIVE_SMARTCONNECT is not None:
            try:
                token_to_use = token_info or STOCK_TOKENS.get(request.symbol)
                if token_to_use:
                    ltp_res = ACTIVE_SMARTCONNECT.ltpData(
                        exchange="NSE", 
                        tradingsymbol=token_to_use["symbol"], 
                        symboltoken=token_to_use["token"]
                    )
                    if ltp_res.get("status") == True and "data" in ltp_res and ltp_res["data"] is not None:
                        live_price = float(ltp_res["data"].get("ltp", 0.0))
            except Exception as e:
                print(f"[backend] Angel One LTP fetch error during prediction: {e}")

        if live_price is None:
            try:
                live_res = scrape_google_finance_price(request.symbol)
                if live_res:
                    live_price = live_res["price"]
            except Exception as e:
                print(f"[backend] Google Finance scrape error during prediction: {e}")

        if live_price is None:
            try:
                yf_sym = f"{request.symbol}.NS" if request.symbol != "NIFTY50" else "^NSEI"
                live_df = yf.download(yf_sym, period="1d", progress=False)
                if not live_df.empty:
                    if isinstance(live_df.columns, pd.MultiIndex):
                        live_df.columns = [col[0] for col in live_df.columns]
                    live_price = float(live_df["Close"].iloc[-1])
            except Exception as e:
                print(f"[backend] yfinance live price fetch error during prediction: {e}")

        prediction_results = predict_stock_price(
            request.symbol, 
            request.horizonDays, 
            smart_connect=ACTIVE_SMARTCONNECT, 
            token_info=token_info,
            live_price=live_price
        )
        
        # Sync results to Firebase
        requests.put(get_db_url(f"market_data/predictions/{request.symbol}"), json=prediction_results, timeout=5.0)
        
        return prediction_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction algorithm error: {str(e)}")

@app.post("/api/trade")
def execute_trade(request: TradeRequest):
    """
    Executes a stock trade order.
    Dynamically recalculates holdings, updates Realtime Database, and saves transaction log.
    If a real broker session is active, orders can also be piped to Angel One's placeOrder endpoint.
    """
    if request.action not in ["BUY", "SELL"]:
        raise HTTPException(status_code=400, detail="Action must be BUY or SELL.")
        
    if request.symbol not in STOCK_METADATA:
        # Dynamic registration on-demand for wishlist/searched stocks
        name = f"{request.symbol} Ltd."
        try:
            live_quote = search_stock(request.symbol)
            name = live_quote["name"]
        except Exception:
            pass
        STOCK_METADATA[request.symbol] = {
            "name": name,
            "base_price": request.price,
            "sector": "NSE Equity",
            "beta": 1.00
        }
        
    if request.qty <= 0:
        raise HTTPException(status_code=400, detail="Quantity must be greater than zero.")
        
    holdings = fetch_user_holdings(request.clientId)
    symbol = request.symbol
    current_holding = holdings.get(symbol)
    
    if request.action == "BUY":
        if current_holding:
            total_qty = current_holding["qty"] + request.qty
            total_cost = (current_holding["qty"] * current_holding["avgPrice"]) + (request.qty * request.price)
            avg_price = total_cost / total_qty
            
            holdings[symbol]["qty"] = total_qty
            holdings[symbol]["avgPrice"] = round(avg_price, 2)
        else:
            holdings[symbol] = {
                "symbol": symbol,
                "name": STOCK_METADATA[symbol]["name"],
                "qty": request.qty,
                "avgPrice": round(request.price, 2),
                "sector": STOCK_METADATA[symbol]["sector"]
            }
    else: # SELL
        if not current_holding:
            raise HTTPException(status_code=400, detail=f"No holdings of {symbol} found to sell.")
            
        if current_holding["qty"] < request.qty:
            raise HTTPException(status_code=400, detail=f"Insufficient positions. You own {current_holding['qty']} shares but tried to sell {request.qty}.")
            
        if current_holding["qty"] == request.qty:
            del holdings[symbol]
        else:
            holdings[symbol]["qty"] -= request.qty
            
    # Save to Firebase Realtime Database
    save_user_holdings(request.clientId, holdings)
    
    # Save transaction log
    transaction = {
        "symbol": symbol,
        "qty": request.qty,
        "price": request.price,
        "action": request.action,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    add_transaction(request.clientId, transaction)
    
    return {
        "success": True,
        "action": request.action,
        "symbol": symbol,
        "qty": request.qty,
        "price": request.price,
        "updatedHoldings": holdings
    }
