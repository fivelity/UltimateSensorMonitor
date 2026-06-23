#!/bin/bash

# UltimateSensorMonitor Service Manager
# Manages both frontend (SvelteKit) and backend (FastAPI) services.
#
# Designed for Linux, macOS, and WSL. On native Windows use
# start_ultimon_full.ps1 or start_backend.py instead.
#
# Usage:
#   ./start_services.sh [start|stop|restart|status|logs|frontend|backend|help]

# Configuration
BACKEND_PORT=8100
FRONTEND_PORT=5501

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# PID files to track running processes
FRONTEND_PID_FILE=".frontend.pid"
BACKEND_PID_FILE=".backend.pid"

# Resolve the project root (this script's directory)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_status()  { echo -e "${BLUE}[UltimateSensorMonitor]${NC} $1"; }
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error()   { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }

# Check if a process is running
is_process_running() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$pid_file"
            return 1
        fi
    fi
    return 1
}

# Locate the Python executable from a virtual environment.
# Search order: <root>/.venv, <root>/server/.venv, <root>/server/venv
find_venv_python() {
    local candidates=(
        "$PROJECT_ROOT/.venv/bin/python"
        "$PROJECT_ROOT/server/.venv/bin/python"
        "$PROJECT_ROOT/server/venv/bin/python"
    )
    for p in "${candidates[@]}"; do
        if [ -x "$p" ]; then
            echo "$p"
            return 0
        fi
    done
    return 1
}

# Start the backend (FastAPI)
start_backend() {
    print_status "Starting backend (FastAPI)..."

    if is_process_running "$BACKEND_PID_FILE"; then
        print_warning "Backend is already running (PID: $(cat $BACKEND_PID_FILE))"
        return 0
    fi

    if [ ! -d "$PROJECT_ROOT/server" ]; then
        print_error "Server directory not found at $PROJECT_ROOT/server"
        return 1
    fi

    local python_cmd
    python_cmd=$(find_venv_python) || {
        print_warning "No virtual environment found, using system python3"
        python_cmd="python3"
    }

    # Start uvicorn in the background from the server directory
    cd "$PROJECT_ROOT/server"
    nohup "$python_cmd" -m uvicorn app.main:app \
        --host 0.0.0.0 --port "$BACKEND_PORT" --reload \
        > "$PROJECT_ROOT/backend.log" 2>&1 &
    local backend_pid=$!
    echo "$backend_pid" > "$PROJECT_ROOT/$BACKEND_PID_FILE"
    cd "$PROJECT_ROOT"

    sleep 2
    if is_process_running "$BACKEND_PID_FILE"; then
        print_success "Backend started on http://localhost:$BACKEND_PORT (PID: $backend_pid)"
        print_status "Backend logs: tail -f backend.log"
    else
        print_error "Failed to start backend. Check backend.log for details."
        return 1
    fi
}

# Start the frontend (SvelteKit)
start_frontend() {
    print_status "Starting frontend (SvelteKit)..."

    if is_process_running "$FRONTEND_PID_FILE"; then
        print_warning "Frontend is already running (PID: $(cat $FRONTEND_PID_FILE))"
        return 0
    fi

    if [ ! -d "$PROJECT_ROOT/client" ]; then
        print_error "Client directory not found at $PROJECT_ROOT/client"
        return 1
    fi

    if [ ! -d "$PROJECT_ROOT/client/node_modules" ]; then
        print_status "Installing Node.js dependencies..."
        cd "$PROJECT_ROOT/client"
        npm install
        cd "$PROJECT_ROOT"
        print_success "Node.js dependencies installed"
    fi

    cd "$PROJECT_ROOT/client"
    nohup npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT" \
        > "$PROJECT_ROOT/frontend.log" 2>&1 &
    local frontend_pid=$!
    echo "$frontend_pid" > "$PROJECT_ROOT/$FRONTEND_PID_FILE"
    cd "$PROJECT_ROOT"

    sleep 3
    if is_process_running "$FRONTEND_PID_FILE"; then
        print_success "Frontend started on http://localhost:$FRONTEND_PORT (PID: $frontend_pid)"
        print_status "Frontend logs: tail -f frontend.log"
    else
        print_error "Failed to start frontend. Check frontend.log for details."
        return 1
    fi
}

# Stop a service
stop_service() {
    local service_name=$1
    local pid_file=$2

    if is_process_running "$pid_file"; then
        local pid=$(cat "$pid_file")
        print_status "Stopping $service_name (PID: $pid)..."

        kill "$pid" 2>/dev/null

        local count=0
        while [ $count -lt 10 ] && ps -p "$pid" > /dev/null 2>&1; do
            sleep 1
            count=$((count + 1))
        done

        if ps -p "$pid" > /dev/null 2>&1; then
            print_warning "Force killing $service_name..."
            kill -9 "$pid" 2>/dev/null
        fi

        rm -f "$pid_file"
        print_success "$service_name stopped"
    else
        print_warning "$service_name is not running"
    fi
}

stop_all() {
    print_status "Stopping all services..."
    stop_service "Frontend" "$FRONTEND_PID_FILE"
    stop_service "Backend" "$BACKEND_PID_FILE"
}

show_status() {
    print_status "Service Status:"
    echo

    if is_process_running "$BACKEND_PID_FILE"; then
        print_success "Backend:  Running (PID: $(cat $BACKEND_PID_FILE)) - http://localhost:$BACKEND_PORT"
    else
        print_error "Backend:  Not running"
    fi

    if is_process_running "$FRONTEND_PID_FILE"; then
        print_success "Frontend: Running (PID: $(cat $FRONTEND_PID_FILE)) - http://localhost:$FRONTEND_PORT"
    else
        print_error "Frontend: Not running"
    fi

    echo
    if is_process_running "$BACKEND_PID_FILE" && is_process_running "$FRONTEND_PID_FILE"; then
        print_success "🚀 Application ready at http://localhost:$FRONTEND_PORT"
        echo
        echo -e "${BLUE}API Docs:${NC}      http://localhost:$BACKEND_PORT/docs"
        echo -e "${BLUE}Frontend Logs:${NC} tail -f frontend.log"
        echo -e "${BLUE}Backend Logs:${NC}  tail -f backend.log"
    fi
}

restart_all() {
    print_status "Restarting all services..."
    stop_all
    sleep 2
    start_all
}

start_all() {
    print_status "Starting UltimateSensorMonitor services..."
    echo

    start_backend
    echo
    start_frontend
    echo

    if is_process_running "$BACKEND_PID_FILE" && is_process_running "$FRONTEND_PID_FILE"; then
        print_success "🎉 All services started successfully!"
        echo
        print_success "🚀 Open your browser: http://localhost:$FRONTEND_PORT"
        echo
        echo -e "${BLUE}Endpoints:${NC}"
        echo -e "  Frontend:    ${GREEN}http://localhost:$FRONTEND_PORT${NC}"
        echo -e "  Backend API: ${GREEN}http://localhost:$BACKEND_PORT${NC}"
        echo -e "  API Docs:    ${GREEN}http://localhost:$BACKEND_PORT/docs${NC}"
        echo
        echo -e "${YELLOW}Stop:${NC} ./start_services.sh stop"
        echo -e "${YELLOW}Logs:${NC} ./start_services.sh logs"
    else
        print_error "Some services failed to start. Check the logs for details."
        return 1
    fi
}

show_logs() {
    if [ -f "frontend.log" ] || [ -f "backend.log" ]; then
        print_status "Showing logs (Ctrl+C to exit)..."
        tail -f frontend.log backend.log 2>/dev/null
    else
        print_warning "No log files found. Services may not be running."
    fi
}

# Main dispatch
case "${1:-start}" in
    "start")    start_all ;;
    "stop")     stop_all ;;
    "restart")  restart_all ;;
    "status")   show_status ;;
    "logs")     show_logs ;;
    "frontend") start_frontend ;;
    "backend")  start_backend ;;
    "help"|"-h"|"--help")
        echo "UltimateSensorMonitor Service Manager"
        echo
        echo "Usage: $0 [command]"
        echo
        echo "Commands:"
        echo "  start     Start all services (default)"
        echo "  stop      Stop all services"
        echo "  restart   Restart all services"
        echo "  status    Show service status"
        echo "  logs      Show live logs"
        echo "  frontend  Start only frontend"
        echo "  backend   Start only backend"
        echo "  help      Show this help message"
        echo
        echo "Examples:"
        echo "  $0              # Start all services"
        echo "  $0 stop         # Stop all services"
        echo "  $0 status       # Check status"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for usage information."
        exit 1
        ;;
esac
