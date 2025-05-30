# UltimateSensorMonitor Reimagined

A highly customizable, visually rich, and dynamically animated hardware monitoring application built with SvelteKit and FastAPI. Create personalized dashboards to visualize sensor data from your PC with unprecedented freedom and flexibility.

![Ultimate Sensor Monitor Demo](https://via.placeholder.com/800x400?text=UltimateSensorMonitor+Screenshot)

## 🌟 Features

### ✅ Phase 1 MVP (Completed)
- **Widget-Based Dashboard System**: Create individual widgets bound to specific sensors
- **Multiple Gauge Types**: 
  - Text display for simple values
  - Radial gauges for circular progress visualization  
  - Linear bars for horizontal/vertical progress
  - Time-series graphs for historical data
  - Image sequences for custom animated visualizations
  - **NEW: Glassmorphic gauges** with advanced visual effects
- **Drag & Drop Interface**: Freely position widgets anywhere on the canvas
- **Real-time Data**: Live sensor data updates via WebSocket connection
- **Micro-Grid System**: Precision alignment with optional grid snapping
- **Visual Dimensions**: Global controls for materiality, information density, and animation levels
- **Widget Inspector**: Configure individual widget properties and gauge settings
- **Advanced Theme System**: 6 built-in themes (Professional, Gamer HUD, Cyberpunk, Minimalist, Synthwave, Nature)
- **Widget Locking**: Lock widgets to prevent accidental movement
- **Context Menus**: Right-click actions for widget management
- **Keyboard Shortcuts**: Efficient navigation and selection
- **Enhanced Preset Management**: Import/Export dashboard configurations

### ✅ Phase 2 Features (Completed)
- **Widget Grouping**: Create and manage widget groups for organized layouts
- **Group Import/Export**: Share widget group configurations
- **Backend Preset Storage**: Server-side preset management with file persistence
- **Multiple Sensor Sources**: Support for mock data, LibreHardwareMonitor, and HWiNFO64
- **Advanced Visual Effects**: Glassmorphic effects, blur, shadows, and animations
- **Theme Import/Export**: Share and customize theme configurations

### 🚀 Technology Stack

#### Frontend
- **SvelteKit**: Modern web framework with TypeScript
- **Tailwind CSS**: Utility-first styling with CSS custom properties
- **D3.js**: Data visualization for graphs and advanced gauges
- **Lucide Svelte**: Beautiful icon system

#### Backend  
- **FastAPI**: High-performance Python web framework
- **WebSockets**: Real-time sensor data streaming
- **Pydantic**: Data validation and settings management
- **Uvicorn**: ASGI server for production deployment

## 📋 Prerequisites

- Node.js (v18+ recommended)
- Python 3.8+
- npm or pnpm package manager

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd UltimateSensorMonitor
```

### 2. Backend Setup
```bash
cd server

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend Setup
```bash
cd client

# Install dependencies
npm install --legacy-peer-deps

# Generate SvelteKit configuration
npx svelte-kit sync

# Start development server
npm run dev
```

### 4. Access the Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

## 🎮 Usage Guide

### Getting Started
1. **View Mode**: Browse and observe your sensor widgets
2. **Edit Mode**: Press `Ctrl+E` or use the toggle button to enter edit mode
3. **Add Widgets**: Open the left sidebar to browse available sensors and add widgets
4. **Customize**: Select widgets to modify their properties in the right sidebar
5. **Configure**: Adjust global visual settings using the Visual Dimensions panel
6. **Group Widgets**: Select multiple widgets and create groups in the Groups tab

### Keyboard Shortcuts
- `Ctrl+E`: Toggle between edit and view modes
- `Escape`: Clear selection and close context menus
- `Delete`: Remove selected widgets (edit mode only)
- `Ctrl+A`: Select all widgets (edit mode only)

### Widget Management
- **Drag**: Click and drag widgets to reposition them
- **Resize**: Use the corner and edge handles when selected
- **Lock**: Right-click or use the inspector to lock widgets in place
- **Group**: Select multiple widgets and create groups for coordinated movement
- **Context Menu**: Right-click widgets for quick actions

### Sensor Data Sources
The application supports multiple sensor data sources:
- **Mock Sensors**: Built-in demo data for testing and development
- **LibreHardwareMonitor**: Real-time hardware monitoring via WMI interface
- **HWiNFO64**: Shared memory integration for comprehensive hardware data
- **Future**: Aida64, Custom APIs, and more planned

## 🎨 Customization

### Visual Dimensions
- **Materiality**: Controls glassmorphic effects, depth, and blur intensity
- **Information Density**: Adjusts spacing, content density, and layout compactness
- **Animation Level**: Sets animation intensity, smoothness, and transition speeds

### Gauge Types
1. **Text**: Simple value display with customizable formatting
2. **Radial**: Circular progress gauge with adjustable angles and styling
3. **Linear**: Horizontal/vertical progress bar with customizable orientation
4. **Graph**: Time-series visualization with D3.js integration
5. **Image Sequence**: Custom image animations based on sensor values
6. **Glassmorphic**: Advanced gauges with blur effects and modern styling

### Themes
#### Built-in Themes:
- **Professional**: Clean, minimal, business-focused design
- **Gamer HUD**: Dark theme with neon accents and effects
- **Cyberpunk**: High-tech aesthetic with vibrant colors
- **Minimalist**: Ultra-clean, distraction-free interface
- **Synthwave**: 80s retrowave with purple and pink gradients
- **Nature**: Organic green theme inspired by nature

#### Theme Features:
- **Import/Export**: Share themes as JSON files
- **Custom Colors**: Create your own color schemes
- **Theme Variations**: Generate darker, lighter, or saturation variants
- **Visual Settings**: Each theme includes optimized visual dimension settings

### Widget Groups
- **Group Creation**: Select multiple widgets and group them together
- **Relative Positioning**: Maintains widget relationships within groups
- **Group Export**: Share widget group configurations as JSON files
- **Group Import**: Load widget groups from other users or backups

### Presets
- **Full Dashboard Export**: Save complete dashboard layouts including all widgets, groups, and settings
- **Local Storage**: Automatic saving to browser localStorage
- **File Export**: Download preset configurations as JSON files
- **Server Storage**: Optional backend preset storage and sharing

## 🔧 Configuration

### Sensor Integration
For real hardware monitoring, install and configure:

#### LibreHardwareMonitor:
1. Download and install LibreHardwareMonitor
2. Enable WMI interface in settings
3. Run as administrator for full sensor access
4. Restart UltimateSensorMonitor backend

#### HWiNFO64:
1. Download and install HWiNFO64
2. Enable "Shared Memory Support" in settings
3. Restart UltimateSensorMonitor backend
4. Verify shared memory access in application

### Widget Configuration
Each widget supports extensive customization:

```typescript
interface WidgetConfig {
  id: string;
  sensor_id: string;
  gauge_type: GaugeType;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  gauge_settings: {
    // Gauge-specific settings
    color_primary?: string;
    color_secondary?: string;
    style?: 'radial' | 'linear';
    glow_intensity?: number;
    blur_level?: number;
    // ... more settings
  };
  style_settings: {
    // Visual styling options
    // ... styling properties
  };
  // ... additional properties
}
```

## 🏗️ Development

### Project Structure
```
UltimateSensorMonitor/
├── client/                 # SvelteKit frontend
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/ # Reusable UI components
│   │   │   │   ├── gauges/ # Gauge implementations
│   │   │   │   └── ...     # Other components
│   │   │   ├── services/   # API and WebSocket services
│   │   │   ├── stores/     # Svelte stores for state management
│   │   │   │   ├── index.ts    # Main stores
│   │   │   │   └── themes.ts   # Theme management
│   │   │   ├── types.ts    # TypeScript type definitions
│   │   │   └── demoData.ts # Mock sensor data
│   │   └── routes/         # SvelteKit page routes
├── server/                 # FastAPI backend
│   ├── app/
│   │   ├── sensors/        # Sensor data source modules
│   │   │   ├── mock_sensor.py          # Mock data generator
│   │   │   ├── librehardware_sensor.py # LibreHardwareMonitor integration
│   │   │   ├── hwinfo_sensor.py        # HWiNFO64 integration
│   │   │   └── base.py                 # Sensor base class
│   │   ├── models.py       # Pydantic data models
│   │   ├── websockets.py   # WebSocket management
│   │   ├── config.py       # Application configuration
│   │   └── main.py         # FastAPI application
└── .dev_docs/             # Development documentation
```

### Adding New Gauge Types
1. Create a new component in `client/src/lib/components/gauges/`
2. Import and register it in `WidgetShell.svelte`
3. Add the gauge type to the `GaugeType` enum in `types.ts`
4. Update the widget inspector with gauge-specific settings

### Adding New Sensor Sources
1. Create a new sensor class in `server/app/sensors/`
2. Inherit from `SensorBase` and implement required methods
3. Add the sensor to the `sensor_sources` list in `main.py`
4. Test integration and error handling

### Building for Production
```bash
# Frontend
cd client
npm run build

# Backend - use production ASGI server
cd server
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## 🐛 Troubleshooting

### Common Issues
1. **WebSocket Connection Failed**: Ensure backend server is running on port 8000
2. **No Real Sensor Data**: Install and configure LibreHardwareMonitor or HWiNFO64
3. **Performance Issues**: Reduce animation level and materiality settings
4. **Build Errors**: Clear node_modules and reinstall dependencies with `--legacy-peer-deps`
5. **Import Errors**: Run `npx svelte-kit sync` to regenerate TypeScript configuration

### Debug Mode
Set environment variables for enhanced logging:
```bash
# Frontend
VITE_DEBUG=true npm run dev

# Backend  
DEBUG=true uvicorn app.main:app --reload
```

### Sensor Source Issues
- **LibreHardwareMonitor**: Run as administrator, enable WMI interface
- **HWiNFO64**: Enable shared memory support in settings
- **Windows Security**: Allow applications through Windows Defender/firewall

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for details on:
- Code style and standards (follows project rules in `.cursor/rules.yml`)
- Testing requirements
- Pull request process
- Development environment setup

### Key Development Principles
- **Structured Fluidity**: Emphasize user freedom with precision through micro-grid alignment
- **Contextual Aesthetics**: Visual dimensions that adapt to user preferences
- **Modular Architecture**: Component-based design with clear separation of concerns
- **Performance First**: Smooth animations and efficient rendering
- **Type Safety**: Strict TypeScript usage throughout the application

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Svelte Team**: For the amazing reactive framework
- **FastAPI**: For the high-performance Python backend
- **D3.js**: For powerful data visualization capabilities
- **Tailwind CSS**: For the utility-first CSS framework
- **Hardware Monitoring Community**: For inspiration and sensor data standards
- **LibreHardwareMonitor & HWiNFO64**: For providing excellent hardware monitoring tools

## 🗺️ Roadmap

### Phase 3 (Planned)
- [ ] Undo/Redo functionality with command pattern
- [ ] Advanced snapping modes (edge-to-edge, center alignment)
- [ ] Full visual dimension editor with live preview
- [ ] Community preset marketplace
- [ ] Plugin system for custom sensors and gauges
- [ ] Multi-monitor support with canvas management
- [ ] Mobile companion app for remote monitoring

### Future Enhancements
- [ ] AI-powered layout suggestions
- [ ] Cloud synchronization and backup
- [ ] Advanced data analytics and trends
- [ ] Custom scripting for advanced users
- [ ] Integration with smart home systems
- [ ] Performance profiling and optimization tools

---

**Ultimate Sensor Monitor Reimagined** - Transforming hardware monitoring into a beautiful, customizable experience that adapts to your workflow and aesthetic preferences. 