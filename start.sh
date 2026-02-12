#!/bin/bash

# D&D AI - Start Script
# Runs both backend and frontend in separate terminal windows

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  ${BLUE}Dungeons & Dragons AI - Local Development${NC}              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${YELLOW}Starting Services...${NC}                                 ${GREEN}║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get project directory
PROJECT_DIR="$HOME/projects/dungeons-and-dragons"

# Check if project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo -e "${RED}Error: Project directory not found at $PROJECT_DIR${NC}"
    exit 1
fi

# Function to check if port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t > /dev/null 2>&1 | grep -q .; then
        return 0
    else
        return 1
    fi
}

# Backend
BACKEND_PORT=3000
FRONTEND_PORT=5173

# Check if ports are available
BACKEND_AVAILABLE=$(check_port $BACKEND_PORT)
FRONTEND_AVAILABLE=$(check_port $FRONTEND_PORT)

if [ $BACKEND_AVAILABLE -eq 0 ]; then
    echo -e "${RED}⚠️  Port $BACKEND_PORT (Backend) is already in use!${NC}"
    echo -e "${YELLOW}   Kill existing process or use different port${NC}"
    read -p "Press Enter to continue anyway..."
fi

if [ $FRONTEND_AVAILABLE -eq 0 ]; then
    echo -e "${RED}⚠️  Port $FRONTEND_PORT (Frontend) is already in use!${NC}"
    echo -e "${YELLOW}   Kill existing process or use different port${NC}"
    read -p "Press Enter to continue anyway..."
fi

# Start Backend
echo -e "${BLUE}→ Starting Backend on port $BACKEND_PORT...${NC}"
cd "$PROJECT_DIR/backend"

# Use gnome-terminal or xterm for new terminal
if command -v gnome-terminal >/dev/null 2>&1; then
    gnome-terminal --working-directory="$PROJECT_DIR/backend" -- npm start &
    BACKEND_PID=$!
elif command -v xterm >/dev/null 2>&1; then
    xterm -e "cd $PROJECT_DIR/backend && npm start" &
    BACKEND_PID=$!
else
    # Fallback: Run in background with output to file
    nohup npm start > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    echo -e "${YELLOW}   Note: Running in background. Check logs: tail -f logs/backend.log${NC}"
fi

# Wait for backend to start
sleep 3

# Start Frontend
echo -e "${BLUE}→ Starting Frontend on port $FRONTEND_PORT...${NC}"
cd "$PROJECT_DIR/frontend"

if command -v gnome-terminal >/dev/null 2>&1; then
    gnome-terminal --working-directory="$PROJECT_DIR/frontend" -- npm run dev &
    FRONTEND_PID=$!
elif command -v xterm >/dev/null 2>&1; then
    xterm -e "cd $PROJECT_DIR/frontend && npm run dev" &
    FRONTEND_PID=$!
else
    # Fallback: Run in background with output to file
    nohup npm run dev > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo -e "${YELLOW}   Note: Running in background. Check logs: tail -f logs/frontend.log${NC}"
fi

# Wait for frontend to start
sleep 2

# Display URLs
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║${NC}  ${BLUE}Services Running!${NC}                                       ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${GREEN}Backend:${NC}    ${YELLOW}http://localhost:$BACKEND_PORT${NC}                   ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${GREEN}Frontend:${NC}   ${YELLOW}http://localhost:$FRONTEND_PORT${NC}                    ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${BLUE}API Health:${NC}      ${YELLOW}http://localhost:$BACKEND_PORT/health${NC}                 ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${BLUE}Game Access:${NC}    ${YELLOW}http://localhost:$FRONTEND_PORT${NC}                   ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}  ${YELLOW}Press Ctrl+C in terminal to stop specific service${NC}       ${GREEN}║${NC}"
echo -e "${GREEN}║${NC}                                                              ${GREEN}║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${GREEN}✅ All services started!${NC}"
echo ""
echo -e "${BLUE}Logs:${NC}"
echo -e "  Backend:  tail -f $PROJECT_DIR/logs/backend.log"
echo -e "  Frontend: tail -f $PROJECT_DIR/logs/frontend.log"
echo ""

# Keep script running (Ctrl+C to stop all)
echo -e "${YELLOW}Press Ctrl+C to stop all services...${NC}"

# Function to stop services on exit
cleanup() {
    echo ""
    echo -e "${RED}Stopping services...${NC}"
    
    # Kill backend
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo -e "${GREEN}✓ Backend stopped${NC}"
    fi
    
    # Kill frontend
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo -e "${GREEN}✓ Frontend stopped${NC}"
    fi
    
    echo -e "${GREEN}All services stopped${NC}"
    exit 0
}

# Trap Ctrl+C to run cleanup
trap cleanup SIGINT SIGTERM

# If no terminal emulator available, run in background
if ! command -v gnome-terminal >/dev/null 2>&1 && ! command -v xterm >/dev/null 2>&1; then
    echo -e "${YELLOW}No terminal emulator found (gnome-terminal/xterm)${NC}"
    echo -e "${YELLOW}Starting both in background...${NC}"
    echo -e "${YELLOW}Logs will be written to: logs/backend.log and logs/frontend.log${NC}"
    echo ""
    
    # Start backend in background
    cd "$PROJECT_DIR/backend"
    nohup npm start > "$PROJECT_DIR/logs/backend.log" 2>&1 &
    
    # Start frontend in background
    cd "$PROJECT_DIR/frontend"
    nohup npm run dev > "$PROJECT_DIR/logs/frontend.log" 2>&1 &
    
    echo -e "${GREEN}✅ Services started in background${NC}"
    echo ""
    echo -e "${BLUE}To view logs:${NC}"
    echo -e "  tail -f $PROJECT_DIR/logs/backend.log"
    echo -e "  tail -f $PROJECT_DIR/logs/frontend.log"
    echo ""
    echo -e "${BLUE}To stop services:${NC}"
    echo -e "  pkill -f 'node npm start'"
    echo -e "  pkill -f 'node npm run dev'"
    
    # Keep script running to monitor
    wait
fi
