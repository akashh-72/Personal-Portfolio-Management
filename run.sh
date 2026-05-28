#!/bin/bash

# Define Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}================================================================${NC}"
echo -e "${BLUE}        QUANTUM PORTFOLIO SYSTEM - SIMULATED TERMINAL            ${NC}"
echo -e "${BLUE}================================================================${NC}"

# 1. Start React Frontend
echo -e "${GREEN}[+] Booting React Vite Frontend Dev Server...${NC}"
cd frontend
npm run dev -- --port 3000 &
FRONTEND_PID=$!
cd ..

# 2. Check for Python Installation
echo -e "${BLUE}[*] Checking Python environment status...${NC}"
HAS_PYTHON=false

# Check if python3 is installed and isn't just the macOS Xcode stub
if command -v python3 &>/dev/null; then
    # Try running a basic evaluation to check if it triggers developer tools
    python3 -c "import sys; print(sys.version_info[0])" &>/dev/null
    if [ $? -eq 0 ]; then
        HAS_PYTHON=true
    fi
fi

if [ "$HAS_PYTHON" = true ]; then
    echo -e "${GREEN}[+] Python3 installation detected.${NC}"
    
    # Set up Virtual Environment
    if [ ! -d "backend/.venv" ]; then
        echo -e "${YELLOW}[!] Creating Python virtual environment in backend/.venv...${NC}"
        python3 -m venv backend/.venv
    fi
    
    echo -e "${GREEN}[+] Activating virtual environment & installing dependencies...${NC}"
    source backend/.venv/bin/activate
    pip install --upgrade pip
    pip install --no-compile -r backend/requirements.txt
    
    echo -e "${GREEN}[+] Starting FastAPI Backend Server on Port 8000...${NC}"
    cd backend
    uvicorn app:app --host 127.0.0.1 --port 8000 --reload &
    BACKEND_PID=$!
    cd ..
    
    echo -e "${GREEN}================================================================${NC}"
    echo -e "${GREEN}  SUCCESS: Both Frontend and Backend servers are booting up!    ${NC}"
    echo -e "${GREEN}  - Frontend: http://localhost:3000                             ${NC}"
    echo -e "${GREEN}  - Backend API: http://localhost:8000                          ${NC}"
    echo -e "${GREEN}================================================================${NC}"
else
    echo -e "${RED}[!] WARNING: Python3 is not configured or Xcode Developer Tools are missing.${NC}"
    echo -e "${YELLOW}[i] How to configure the Python AI prediction backend:${NC}"
    echo -e "    1. Download and run the official macOS installer from:"
    echo -e "       ${BLUE}https://www.python.org/downloads/mac-osx/${NC}"
    echo -e "       (This avoids the Xcode Developer Tools compilation prompts completely!)"
    echo -e "    2. Once installed, re-run this script: ${GREEN}./run.sh${NC}"
    echo -e ""
    echo -e "${GREEN}[+] Frontend is still running at http://localhost:3000!${NC}"
    echo -e "${GREEN}[+] Open the link to review pages and simulated dashboards instantly.${NC}"
    echo -e "${GREEN}================================================================${NC}"
fi

# Function to handle shutdown of background tasks
cleanup() {
    echo -e "\n${YELLOW}[-] Shutting down active servers...${NC}"
    kill $FRONTEND_PID 2>/dev/null
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    exit
}

trap cleanup SIGINT SIGTERM

# Keep script running to monitor logs
wait
