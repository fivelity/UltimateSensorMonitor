---
creation-date: 
document-aliases:
  - PROJECT_OVERVIEW.md
document-revision: 2
project-aliases:
  - Ultimate Sensor Monitor Reimagined
  - Ultimon Reimagined
  - USMR
project-version: 1
---
# UltimateSensorMonitor Reimagined: Project Overview

## 1. Introduction

UltimateSensorMonitor Reimagined aims to be a highly customizable, visually rich, and dynamically animated hardware monitoring application. It allows users to create personalized dashboards to visualize sensor data from their PCs, offering a modern and fluid alternative to existing tools.

The project emphasizes local network accessibility, enabling dashboards to be viewed on various devices within the user's LAN (e.g., Raspberry Pi, secondary monitors, tablets) rather than being designed for public web deployment.

## 2. Core Vision & Goals

The primary goal is to provide users with unparalleled freedom in designing their hardware monitoring dashboards. This involves moving towards a **highly modular, widget-based dashboard system** where:

- **Individual Sensor Items are Fundamental:** Each distinct sensor reading (e.g., "CPU Core 1 Temperature" with its value "57°C") serves as a fundamental, selectable data source.
    
- **Widget-Based Architecture:** Users create individual "widgets" on their dashboard. Each widget is bound to a single, specific sensor item.
    
- **Versatile Gauge Types:** Each widget can display its bound sensor item using a variety of "gauge types," including:
    
    - Simple Text Value
        
    - Radial Gauges
        
    - Linear Gauges/Bars
        
    - Time-Series Graphs
        
    - **Custom User-Uploaded Image Sequences:** A key feature allowing users to define their own visual styles by mapping sensor value ranges to different images in an uploaded sequence.
        
- **Deep Customization per Widget/Gauge:**
    
    - **Common Customizations:**
        
        - Toggle visibility of the sensor label (name).
            
        - Customize the displayed label text (defaults to sensor name).
            
        - Toggle visibility of the sensor metric/unit.
            
        - Customize the displayed metric/unit text.
            
    - **Gauge-Specific Options:** A rich set of options tailored to the chosen gauge type (e.g., stroke thickness, colors, start/end angles for radials; grid lines, line style, colors for graphs; animation parameters for image sequences).
        
- **Enhanced Layout Control & Organization:**
    
    - **Widget Locking:** Users can lock individual widgets in place to prevent accidental movement or resizing.
        
    - **Widget Grouping:** Users can group multiple widgets together, allowing them to be moved and managed as a single unit, maintaining their relative positions.
        
- **Focused Sharing Capabilities:** Enable users to share their creations through:
    
    - **Exportable/Importable Dashboard Presets:** Entire dashboard layouts and styling configurations can be saved and shared.
        
    - **Sharable Widget Groups:** Users can export the configuration of specific widget groups (including member widgets, relative positions, and applied styles) as manageable snippets, which can then be imported by others. This fosters a more targeted form of community contribution around specific, styled data presentations (e.g., a "Steampunk CPU Metrics" group).
        
- **Multiple Sensor Data Sources:** Support for various hardware monitoring tools as data sources, starting with Aida64 (via shared memory), LibreHardwareMonitor, and potentially HWiNFO64.
    

## 3. Technology Stack

- **Backend:**
    
    - **Framework:** FastAPI (Python)
        
    - **Server:** Uvicorn
        
    - **Data Validation/Settings:** Pydantic
        
    - **Real-time Communication:** WebSockets
        
- **Frontend:**
    
    - **Framework:** SvelteKit
        
    - **Language:** TypeScript
        
    - **Styling:** Tailwind CSS
        
    - **Component Development/Testing:** Storybook
        
    - **Linting:** ESLint
        
    - **Formatting:** Prettier
        
    - **Testing:** Vitest (Unit/Component), Playwright (E2E)
        
- **Package Manager (Frontend):** `pnpm`
    

## 4. Development Environment Setup

### Prerequisites:

- Node.js (latest LTS version recommended)
    
- `pnpm` (install via `npm install -g pnpm` or other methods)
    
- Python (3.8+ recommended)
    

### Backend Setup (`ultimon-reimagined/server/`):

1. **Create & Activate Virtual Environment:**
    
    ```
    python -m venv .venv
    source .venv/bin/activate  # Linux/macOS
    # .venv\Scripts\activate    # Windows
    ```
    
2. **Install Dependencies:**
    
    ```
    pip install -r requirements.txt
    ```
    
3. **Run Development Server:**
    
    ```
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
    ```
    
    The backend will be accessible at `http://localhost:8000`.
    

### Frontend Setup (`ultimon-reimagined/client/`):

1. **Install Dependencies:**
    
    ```
    pnpm install
    ```
    
2. **Run Development Server:**
    
    ```
    pnpm dev
    ```
    
    The SvelteKit frontend will be accessible at `http://localhost:5173` (or the next available port).
    
3. **Run Storybook (for component development):**
    
    ```
    pnpm storybook
    ```
    
    Storybook will be accessible at `http://localhost:6006`.
    

## 5. Project Structure (High-Level)

- **`ultimon-reimagined/`**
    
    - **`.dev/documentation/`**: Contains project documentation files (like this one).
        
    - **`server/`**: FastAPI backend application.
        
        - `app/`: Core application code.
            
            - `main.py`: FastAPI app initialization, main routes, WebSocket endpoint.
                
            - `config.py`: Pydantic-based configuration settings.
                
            - `websockets.py`: WebSocket connection management and data broadcasting.
                
            - `sensors/`: Sensor data source modules.
                
                - `base.py`: Abstract base class for sensor modules.
                    
                - `mock_sensor.py`: Mock sensor data provider for development.
                    
        - `requirements.txt`: Python dependencies.
            
    - **`client/`**: SvelteKit frontend application.
        
        - `src/`: Source code.
            
            - `lib/`: Libraries, components, services.
                
                - `components/`: Reusable Svelte components (e.g., `SensorDisplay.svelte`).
                    
                - `services/`: Application services (e.g., `websocketService.ts`).
                    
            - `routes/`: SvelteKit page routes.
                
            - `stories/`: Storybook story definitions.
                
        - `static/`: Static assets.
            
        - `package.json`, `pnpm-lock.yaml`: Frontend dependencies and project configuration.
            
        - `svelte.config.js`, `vite.config.ts`, `tailwind.config.js`: Build and tooling configurations.
            

## 6. Current State & Work Done (as of 2025-05-26 - _Note: This section reflects prior status and will be updated via PROGRESS_LOG.md_)

- **Backend**: Initial FastAPI server setup is complete. It includes a WebSocket endpoint (`/ws`) and a mock sensor data generator (`MockSensor`). Sensor data is successfully broadcast to connected clients.
    
- **Frontend**: SvelteKit project is initialized with TypeScript, Tailwind CSS, and Storybook. A `websocketService` handles WebSocket connections and stores incoming sensor data in a Svelte store (`sensorDataStore`).
    
    - A basic `SensorDisplay.svelte` component shows all received sensor data in a raw format (primarily for initial testing).
        
    - Development of core components for the widget-based dashboard system is underway:
        
        - `SensorSourceList.svelte`: This component is intended to display all available individual sensor readings from the `sensorDataStore`, making them selectable for widget creation. Initial implementation encountered some technical challenges (parsing/TypeScript errors) which have been resolved by simplifying the component to a minimal working state. It is now ready to be incrementally rebuilt with its intended functionality.
            
- **Documentation**: This `PROJECT_OVERVIEW.md` and a `PROGRESS_LOG.md` have been established and are being kept up-to-date.
    

## 7. Future Development Phases (Widget-Based System)

The development will proceed in phases, focusing on incrementally building out the features outlined in the "Ultimon Reimagined: Phased Implementation Plan & Risk Mitigation" document. Key capabilities to be developed include:

- **Phase 1: Core Layout & Basic Customization (MVP)**
    
    - Application shell with main dashboard canvas and basic top bar (mode toggle).
        
    - Fundamental `WidgetShell.svelte` component displaying sensor name and live value.
        
    - Drag-and-drop for widgets with basic micro-grid snapping.
        
    - Collapsible Left Sidebar with `SensorSourceList.svelte` for adding widgets.
        
    - Initial global visual dimension controls (colors, fonts) in a stubbed Right Sidebar.
        
    - Local preset system (save/load layouts and visual settings via `localStorage`).
        
- **Phase 2: Enhanced Styling & Widget Functionality**
    
    - Expanded visual dimension controls in the Right Sidebar (materiality, basic animations).
        
    - Development of versatile gauge types (e.g., linear bar, simple radial) renderable within `WidgetShell.svelte`.
        
    - Initial `WidgetInspector.svelte` panel in the Right Sidebar for widget-specific configurations (gauge type, labels).
        
    - Backend preset storage (FastAPI) with modal popups for preset management.
        
- **Phase 3: Advanced Layout, Rich Interactivity & Full Customization**
    
    - **Widget Locking:** Mechanism to lock/unlock widgets.
        
    - **Widget Grouping:** Ability to group widgets for unified movement and management.
        
    - **Sharable Widget Groups:** Basic export/import functionality for widget group configurations (JSON snippets).
        
    - Advanced snapping modes (widget-to-widget) and dynamic alignment guidelines.
        
    - Context Menus on widgets for quick actions (including lock/unlock, group/ungroup).
        
    - Full implementation of visual dimension controls in the Right Sidebar, potentially with advanced editor modals.
        
    - Comprehensive dashboard preset sharing (robust JSON export/import) and Top Bar enhancements like Undo/Redo.
        

This phased approach ensures foundational elements are built first, followed by progressive enhancements to styling, interactivity, and customization depth.