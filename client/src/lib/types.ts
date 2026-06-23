/**
 * Type definitions for Ultimate Sensor Monitor Reimagined
 */

export interface SensorData {
  id: string;
  name: string;
  value: number | string;
  unit: string;
  min_value?: number;
  max_value?: number;
  source: string;
  category: string;
  parent?: string;
  timestamp?: string;
}

export interface WidgetConfig {
  id: string;
  sensor_id: string;
  gauge_type: GaugeType;

  // Position and size
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  rotation: number;
  z_index: number;

  // Widget behavior
  is_locked: boolean;
  group_id?: string;

  // Display options
  show_label: boolean;
  custom_label?: string;
  show_unit: boolean;
  custom_unit?: string;

  // Gauge-specific settings
  gauge_settings: GaugeSettings;

  // Visual styling — open-ended bag of style overrides; values are primitives or string arrays
  style_settings: StyleSettings;
}

export interface WidgetGroup {
  id: string;
  name: string;
  description?: string;
  widgets: string[];
  relative_positions: Record<string, { x: number; y: number }>;
  created_at?: string;
}

export interface VisualSettings {
  // Core visual dimensions (0-1 range)
  materiality: number;
  information_density: number;
  animation_level: number;

  // Color scheme
  color_scheme: string;
  custom_colors: Record<string, string>;

  // Typography
  font_family: string;
  font_scale: number;

  // Effects
  enable_blur_effects: boolean;
  enable_animations: boolean;
  reduce_motion: boolean;

  // Grid and layout
  grid_size: number;
  snap_to_grid: boolean;
  show_grid: boolean;
}

export interface DashboardLayout {
  canvas_width: number;
  canvas_height: number;
  background_type: string;
  background_settings: Record<string, unknown>;
}

export interface DashboardPreset {
  id?: string;
  name: string;
  description?: string;
  widgets: WidgetConfig[];
  widget_groups: WidgetGroup[];
  layout: DashboardLayout;
  visual_settings: VisualSettings;
  created_at?: string;
  updated_at?: string;
  version: string;
}

export interface SensorSource {
  id: string;
  name: string;
  active: boolean;
  sensors: SensorData[];
  last_update?: string;
  error_message?: string;
}

// NEW TYPE for individual sensor listings
export interface SensorInfo {
  id: string;
  name: string;
  category: string;
  unit: string;
  source: string;
  min_value?: number;
  max_value?: number;
}

// NEW TYPE for the structure received from the /api/sensors backend for a single source
// where 'sensors' is an object of SensorData items, keyed by sensor ID
export interface SensorSourceFromAPI {
  id: string;
  name: string;
  active: boolean;
  sensors: Record<string, SensorData>;
  last_update?: string;
  error_message?: string;
}

export type GaugeType =
  | "text"
  | "radial"
  | "linear"
  | "graph"
  | "image"
  | "glassmorphic";

export type EditMode = "view" | "edit";

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DragState {
  isDragging: boolean;
  startPos: Point;
  currentPos: Point;
  widgetId?: string;
  groupId?: string;
}

export interface ResizeState {
  isResizing: boolean;
  handle: ResizeHandle;
  startPos: Point;
  startSize: Size;
  widgetId: string;
}

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export interface Selection {
  type: "widget" | "group";
  ids: string[];
}

export interface ContextMenuState {
  show: boolean;
  x: number;
  y: number;
  target?: {
    type: "widget" | "group" | "canvas";
    id?: string;
  };
}

export interface WebSocketMessage {
  type: string;
  timestamp: string;
  data?: Record<string, unknown>;
  content?: Record<string, unknown>;
  message?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** Open-ended bag of per-widget style overrides driven by Visual Dimensions. */
export type StyleSettings = Record<string, string | number | boolean>;

export interface GaugeSettings {
  // Common settings
  color_primary?: string;
  color_secondary?: string;
  stroke_width?: number;
  min_value?: number;
  max_value?: number;

  // Radial gauge specific
  start_angle?: number;
  end_angle?: number;
  inner_radius?: number;

  // Linear gauge specific
  orientation?: "horizontal" | "vertical";
  show_scale?: boolean;

  // Graph specific
  line_color?: string;
  fill_area?: boolean;
  show_points?: boolean;
  time_range?: number; // seconds

  // Image sequence specific
  images?: string[];
  image_sequence?: string[];
  animation_speed?: number;

  // Glassmorphic gauge specific
  glow_intensity?: number;
  blur_level?: number;
  transparency?: number;
  style?: "radial" | "linear" | "ring";
}

export interface ColorScheme {
  id: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    border: string;
    text: string;
    text_muted: string;
    danger: string;
    success: string;
    warning: string;
  };
}

export interface ThemePreset {
  id: string;
  name: string;
  description: string;
  visual_settings: Partial<VisualSettings>;
  color_scheme: ColorScheme;
}

// Event types for widget interaction
export interface WidgetEvent {
  type:
    | "select"
    | "deselect"
    | "move"
    | "resize"
    | "lock"
    | "unlock"
    | "delete";
  widget_id: string;
  data?: Record<string, unknown>;
}

export interface GroupEvent {
  type: "create" | "update" | "delete" | "select" | "move";
  group_id: string;
  data?: Record<string, unknown>;
}

/** Hardware node as returned by the /api/sensors/hardware-tree endpoint */
export interface ApiHardwareNode {
  id: string;
  name: string;
  type?: string;
  sensors?: SensorData[];
  sub_hardware?: ApiHardwareNode[];
  [key: string]: unknown;
}
