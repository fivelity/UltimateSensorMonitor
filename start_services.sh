#!/bin/bash

# UltimateSensorMonitor Service Manager
# Manages both frontend (SvelteKit) and backend (FastAPI) services

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# PID files to track running processes
FRONTEND_PID_FILE=".frontend.pid"
BACKEND_PID_FILE=".backend.pid"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[UltimateSensorMonitor]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to check if a process is running
is_process_running() {
    local pid_file=$1
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0  # Process is running
        else
            # PID file exists but process is not running, clean up
            rm -f "$pid_file"
            return 1
        fi
    fi
    return 1  # PID file doesn't exist
}

# Function to start the backend (FastAPI)
start_backend() {
    print_status "Starting backend (FastAPI)..."
    
    if is_process_running "$BACKEND_PID_FILE"; then
        print_warning "Backend is already running (PID: $(cat $BACKEND_PID_FILE))"
        return 0
    fi
    
    # Check if we're in the right directory
    if [ ! -d "server" ]; then
        print_error "Server directory not found. Make sure you're in the project root."
        return 1
    fi
    
    # Check if Python requirements are installed
    if [ ! -f "server/requirements.txt" ]; then
        print_warning "Requirements file not found. Creating basic requirements..."
        cat > server/requirements.txt << EOF
fastapi==0.104.1
uvicorn==0.24.0
websockets==12.0
pydantic==2.5.0
python-multipart==0.0.6
EOF
    fi
    
    # Install Python dependencies if needed
    if [ ! -d "server/venv" ] && [ ! -d "server/.venv" ]; then
        print_status "Setting up Python virtual environment..."
        cd server
        python3 -m venv venv
        source venv/bin/activate
        pip install -r requirements.txt
        cd ..
        print_success "Python environment set up successfully"
    fi
    
    # Start the backend server
    cd server
    if [ -d "venv" ]; then
        source venv/bin/activate
    elif [ -d ".venv" ]; then
        source .venv/bin/activate
    fi
    
    # Start uvicorn in the background
    nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8100 --reload > ../backend.log 2>&1 &
    local backend_pid=$!
    echo $backend_pid > "../$BACKEND_PID_FILE"
    cd ..
    
    # Wait a moment to check if the process started successfully
    sleep 2
    if is_process_running "$BACKEND_PID_FILE"; then
        print_success "Backend started successfully on http://localhost:8100 (PID: $backend_pid)"
        print_status "Backend logs: tail -f backend.log"
    else
        print_error "Failed to start backend. Check backend.log for details."
        return 1
    fi
}

# Function to start the frontend (SvelteKit)
start_frontend() {
    print_status "Starting frontend (SvelteKit)..."
    
    if is_process_running "$FRONTEND_PID_FILE"; then
        print_warning "Frontend is already running (PID: $(cat $FRONTEND_PID_FILE))"
        return 0
    fi
    
    # Check if we're in the right directory
    if [ ! -d "client" ]; then
        print_error "Client directory not found. Make sure you're in the project root."
        return 1
    fi
    
    # Check if Node.js dependencies are installed
    if [ ! -d "client/node_modules" ]; then
        print_status "Installing Node.js dependencies..."
        cd client
        npm install
        cd ..
        print_success "Node.js dependencies installed successfully"
    fi
    
    # Start the frontend server
    cd client
    nohup npm run dev -- --host 0.0.0.0 --port 5501 > ../frontend.log 2>&1 &
    local frontend_pid=$!
    echo $frontend_pid > "../$FRONTEND_PID_FILE"
    cd ..
    
    # Wait a moment to check if the process started successfully
    sleep 3
    if is_process_running "$FRONTEND_PID_FILE"; then
        print_success "Frontend started successfully on http://localhost:5501 (PID: $frontend_pid)"
        print_status "Frontend logs: tail -f frontend.log"
    else
        print_error "Failed to start frontend. Check frontend.log for details."
        return 1
    fi
}

# Function to stop a service
stop_service() {
    local service_name=$1
    local pid_file=$2
    
    if is_process_running "$pid_file"; then
        local pid=$(cat "$pid_file")
        print_status "Stopping $service_name (PID: $pid)..."
        
        # Try graceful shutdown first
        kill "$pid" 2>/dev/null
        
        # Wait up to 10 seconds for graceful shutdown
        local count=0
        while [ $count -lt 10 ] && ps -p "$pid" > /dev/null 2>&1; do
            sleep 1
            count=$((count + 1))
        done
        
        # Force kill if still running
        if ps -p "$pid" > /dev/null 2>&1; then
            print_warning "Force killing $service_name..."
            kill -9 "$pid" 2>/dev/null
        fi
        
        rm -f "$pid_file"
        print_success "$service_name stopped successfully"
    else
        print_warning "$service_name is not running"
    fi
}

# Function to stop all services
stop_all() {
    print_status "Stopping all services..."
    stop_service "Frontend" "$FRONTEND_PID_FILE"
    stop_service "Backend" "$BACKEND_PID_FILE"
    
    # Clean up log files if desired
    # rm -f frontend.log backend.log
}

# Function to show status of services
show_status() {
    print_status "Service Status:"
    echo
    
    if is_process_running "$BACKEND_PID_FILE"; then
        print_success "Backend: Running (PID: $(cat $BACKEND_PID_FILE)) - http://localhost:8100"
    else
        print_error "Backend: Not running"
    fi
    
    if is_process_running "$FRONTEND_PID_FILE"; then
        print_success "Frontend: Running (PID: $(cat $FRONTEND_PID_FILE)) - http://localhost:5501"
    else
        print_error "Frontend: Not running"
    fi
    
    echo
    if is_process_running "$BACKEND_PID_FILE" && is_process_running "$FRONTEND_PID_FILE"; then
        print_success "🚀 Application is ready at http://localhost:5501"
        echo
        echo -e "${BLUE}API Documentation:${NC} http://localhost:8100/docs"
        echo -e "${BLUE}Frontend Logs:${NC} tail -f frontend.log"
        echo -e "${BLUE}Backend Logs:${NC} tail -f backend.log"
    fi
}

# Function to restart services
restart_all() {
    print_status "Restarting all services..."
    stop_all
    sleep 2
    start_all
}

# Function to start all services
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
        print_success "🚀 Open your browser and go to: http://localhost:5501"
        echo
        echo -e "${BLUE}Available endpoints:${NC}"
        echo -e "  Frontend: ${GREEN}http://localhost:5501${NC}"
        echo -e "  Backend API: ${GREEN}http://localhost:8100${NC}"
        echo -e "  API Docs: ${GREEN}http://localhost:8100/docs${NC}"
        echo
        echo -e "${YELLOW}To stop services:${NC} ./start_services.sh stop"
        echo -e "${YELLOW}To view logs:${NC} tail -f frontend.log backend.log"
    else
        print_error "Some services failed to start. Check the logs for details."
        return 1
    fi
}

# Function to show logs
show_logs() {
    if [ -f "frontend.log" ] || [ -f "backend.log" ]; then
        print_status "Showing logs (Ctrl+C to exit)..."
        tail -f frontend.log backend.log 2>/dev/null
    else
        print_warning "No log files found. Services may not be running."
    fi
}

# Main script logic
case "${1:-start}" in
    "start")
        start_all
        ;;
    "stop")
        stop_all
        ;;
    "restart")
        restart_all
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "frontend")
        start_frontend
        ;;
    "backend")
        start_backend
        ;;
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
        echo "  $0 start        # Start all services"
        echo "  $0 stop         # Stop all services"
        echo "  $0 status       # Check status"
        echo "  $0 logs         # View logs"
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for usage information."
        exit 1
        ;;
esac 