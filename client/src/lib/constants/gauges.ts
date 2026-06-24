/**
 * Gauge type metadata and defaults shared by the inspector, wizard, and sidebar.
 */
import type { GaugeSettings, GaugeType, StyleSettings } from "$lib/types";

export interface GaugeTypeMetadata {
  id: GaugeType;
  label: string;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultSettings: GaugeSettings;
  defaultStyleOverrides: StyleSettings;
}

export const gaugeTypeMetadata: Record<GaugeType, GaugeTypeMetadata> = {
  text: {
    id: "text",
    label: "Text Value",
    description: "Simple numeric or text display",
    defaultWidth: 200,
    defaultHeight: 120,
    defaultSettings: {
      color_primary: "var(--theme-primary)",
      color_secondary: "var(--theme-secondary)",
      stroke_width: 2,
    },
    defaultStyleOverrides: {},
  },
  radial: {
    id: "radial",
    label: "Radial Gauge",
    description: "Circular progress gauge",
    defaultWidth: 220,
    defaultHeight: 220,
    defaultSettings: {
      color_primary: "var(--theme-primary)",
      color_secondary: "var(--theme-secondary)",
      stroke_width: 8,
      start_angle: 0,
      end_angle: 270,
      inner_radius: 0.7,
      min_value: 0,
      max_value: 100,
    },
    defaultStyleOverrides: {},
  },
  linear: {
    id: "linear",
    label: "Linear Bar",
    description: "Horizontal or vertical bar gauge",
    defaultWidth: 240,
    defaultHeight: 80,
    defaultSettings: {
      color_primary: "var(--theme-primary)",
      color_secondary: "var(--theme-secondary)",
      stroke_width: 4,
      orientation: "horizontal",
      show_scale: true,
      min_value: 0,
      max_value: 100,
    },
    defaultStyleOverrides: {},
  },
  graph: {
    id: "graph",
    label: "Time Graph",
    description: "Historical data line chart",
    defaultWidth: 320,
    defaultHeight: 180,
    defaultSettings: {
      color_primary: "var(--theme-primary)",
      color_secondary: "var(--theme-secondary)",
      line_color: "var(--theme-primary)",
      fill_area: true,
      show_points: false,
      time_range: 60,
      stroke_width: 2,
    },
    defaultStyleOverrides: {},
  },
  image: {
    id: "image",
    label: "Image Sequence",
    description: "Custom image animation based on value",
    defaultWidth: 200,
    defaultHeight: 200,
    defaultSettings: {
      image_sequence: [],
      animation_speed: 1,
    },
    defaultStyleOverrides: {},
  },
  glassmorphic: {
    id: "glassmorphic",
    label: "Glassmorphic",
    description: "Modern glass effect gauge",
    defaultWidth: 220,
    defaultHeight: 140,
    defaultSettings: {
      color_primary: "var(--theme-primary)",
      color_secondary: "var(--theme-secondary)",
      glow_intensity: 0.8,
      blur_level: 8,
      transparency: 0.2,
      style: "radial",
    },
    defaultStyleOverrides: {},
  },
  segmented_arc: {
    id: "segmented_arc",
    label: "Segmented Arc",
    description: "Multi-segment arc gauge with configurable gaps and colors",
    defaultWidth: 220,
    defaultHeight: 220,
    defaultSettings: {
      color_primary: "var(--theme-primary)",
      color_secondary: "var(--theme-secondary)",
      min_value: 0,
      max_value: 100,
      segment_count: 24,
      segment_gap: 3,
      color_mode: "single",
      color_start: "var(--theme-success)",
      color_end: "var(--theme-danger)",
      corner_radius: 2,
      stroke_width: 10,
      start_angle: -135,
      end_angle: 135,
    },
    defaultStyleOverrides: {},
  },
  speed_dial: {
    id: "speed_dial",
    label: "Speed Dial",
    description: "Speedometer-style gauge with needle and zone colors",
    defaultWidth: 240,
    defaultHeight: 240,
    defaultSettings: {
      color_primary: "var(--theme-primary)",
      color_secondary: "var(--theme-secondary)",
      min_value: 0,
      max_value: 100,
      start_angle: -135,
      end_angle: 135,
      zone_low: 33,
      zone_high: 66,
      show_ticks: true,
      tick_count: 10,
      needle_color: "var(--theme-text)",
      stroke_width: 12,
    },
    defaultStyleOverrides: {},
  },
  spark_bar: {
    id: "spark_bar",
    label: "Spark Bar",
    description: "Compact sparkline bar chart with live value and trend",
    defaultWidth: 280,
    defaultHeight: 80,
    defaultSettings: {
      color_primary: "var(--theme-primary)",
      color_secondary: "var(--theme-secondary)",
      min_value: 0,
      max_value: 100,
      bar_count: 32,
      bar_color: "var(--theme-primary)",
      show_trend: true,
    },
    defaultStyleOverrides: {},
  },
  donut_ring: {
    id: "donut_ring",
    label: "Donut Ring",
    description: "Smooth thin donut gauge with gradient and inner glow",
    defaultWidth: 220,
    defaultHeight: 220,
    defaultSettings: {
      color_primary: "var(--theme-primary)",
      color_secondary: "var(--theme-secondary)",
      min_value: 0,
      max_value: 100,
      start_angle: -135,
      end_angle: 135,
      ring_thickness: 0.12,
      glow_color: "var(--theme-primary)",
      use_gradient: false,
      gradient_end_color: "var(--theme-danger)",
      corner_radius: 4,
    },
    defaultStyleOverrides: {},
  },
};

export const gaugeTypeOptions: GaugeType[] = [
  "text",
  "radial",
  "linear",
  "graph",
  "image",
  "glassmorphic",
  "segmented_arc",
  "speed_dial",
  "spark_bar",
  "donut_ring",
];

export const gaugeSettingsSchema: Record<
  GaugeType,
  { fields: GaugeSettingsField[] }
> = {
  text: {
    fields: [
      { key: "color_primary", type: "color", label: "Primary Color" },
      { key: "color_secondary", type: "color", label: "Secondary Color" },
      { key: "stroke_width", type: "number", label: "Stroke Width", min: 0, max: 20 },
    ],
  },
  radial: {
    fields: [
      { key: "color_primary", type: "color", label: "Primary Color" },
      { key: "color_secondary", type: "color", label: "Secondary Color" },
      { key: "stroke_width", type: "number", label: "Stroke Width", min: 1, max: 50 },
      { key: "min_value", type: "number", label: "Minimum Value" },
      { key: "max_value", type: "number", label: "Maximum Value" },
      { key: "start_angle", type: "number", label: "Start Angle", min: 0, max: 360 },
      { key: "end_angle", type: "number", label: "End Angle", min: 0, max: 360 },
      { key: "inner_radius", type: "number", label: "Inner Radius", min: 0, max: 1, step: 0.05 },
    ],
  },
  linear: {
    fields: [
      { key: "color_primary", type: "color", label: "Primary Color" },
      { key: "color_secondary", type: "color", label: "Secondary Color" },
      { key: "stroke_width", type: "number", label: "Stroke Width", min: 1, max: 50 },
      { key: "min_value", type: "number", label: "Minimum Value" },
      { key: "max_value", type: "number", label: "Maximum Value" },
      { key: "orientation", type: "select", label: "Orientation", options: ["horizontal", "vertical"] },
      { key: "show_scale", type: "boolean", label: "Show Scale" },
    ],
  },
  graph: {
    fields: [
      { key: "color_primary", type: "color", label: "Primary Color" },
      { key: "color_secondary", type: "color", label: "Secondary Color" },
      { key: "line_color", type: "color", label: "Line Color" },
      { key: "stroke_width", type: "number", label: "Stroke Width", min: 0, max: 20 },
      { key: "fill_area", type: "boolean", label: "Fill Area" },
      { key: "show_points", type: "boolean", label: "Show Points" },
      { key: "time_range", type: "number", label: "Time Range (seconds)", min: 5, max: 3600 },
    ],
  },
  image: {
    fields: [
      { key: "image_sequence", type: "textarea", label: "Image URLs (comma-separated)" },
      { key: "animation_speed", type: "number", label: "Animation Speed", min: 0, max: 10, step: 0.1 },
    ],
  },
  glassmorphic: {
    fields: [
      { key: "color_primary", type: "color", label: "Primary Color" },
      { key: "color_secondary", type: "color", label: "Secondary Color" },
      { key: "glow_intensity", type: "number", label: "Glow Intensity", min: 0, max: 1, step: 0.05 },
      { key: "blur_level", type: "number", label: "Blur Level", min: 0, max: 32, step: 1 },
      { key: "transparency", type: "number", label: "Transparency", min: 0, max: 1, step: 0.05 },
      { key: "style", type: "select", label: "Style", options: ["radial", "linear", "ring", "arc"] },
    ],
  },
  segmented_arc: {
    fields: [
      { key: "color_primary", type: "color", label: "Primary Color" },
      { key: "color_secondary", type: "color", label: "Track Color" },
      { key: "min_value", type: "number", label: "Minimum Value" },
      { key: "max_value", type: "number", label: "Maximum Value" },
      { key: "segment_count", type: "number", label: "Segment Count", min: 4, max: 72, step: 1 },
      { key: "segment_gap", type: "number", label: "Segment Gap (°)", min: 0, max: 10, step: 0.5 },
      { key: "color_mode", type: "select", label: "Color Mode", options: ["single", "gradient", "zone"] },
      { key: "color_start", type: "color", label: "Gradient Start / Zone Low" },
      { key: "color_end", type: "color", label: "Gradient End / Zone High" },
      { key: "corner_radius", type: "number", label: "Corner Radius", min: 0, max: 8, step: 1 },
      { key: "stroke_width", type: "number", label: "Arc Thickness", min: 4, max: 40, step: 1 },
      { key: "start_angle", type: "number", label: "Start Angle (°)", min: -180, max: 0 },
      { key: "end_angle", type: "number", label: "End Angle (°)", min: 0, max: 180 },
    ],
  },
  speed_dial: {
    fields: [
      { key: "min_value", type: "number", label: "Minimum Value" },
      { key: "max_value", type: "number", label: "Maximum Value" },
      { key: "start_angle", type: "number", label: "Start Angle (°)", min: -180, max: 0 },
      { key: "end_angle", type: "number", label: "End Angle (°)", min: 0, max: 180 },
      { key: "zone_low", type: "number", label: "Zone Low (%)", min: 0, max: 100, step: 1 },
      { key: "zone_high", type: "number", label: "Zone High (%)", min: 0, max: 100, step: 1 },
      { key: "show_ticks", type: "boolean", label: "Show Ticks" },
      { key: "tick_count", type: "number", label: "Tick Count", min: 4, max: 20, step: 1 },
      { key: "needle_color", type: "color", label: "Needle Color" },
      { key: "stroke_width", type: "number", label: "Arc Thickness", min: 4, max: 40, step: 1 },
    ],
  },
  spark_bar: {
    fields: [
      { key: "color_primary", type: "color", label: "Primary Color" },
      { key: "bar_color", type: "color", label: "Bar Color" },
      { key: "min_value", type: "number", label: "Minimum Value" },
      { key: "max_value", type: "number", label: "Maximum Value" },
      { key: "bar_count", type: "number", label: "Bar Count", min: 8, max: 64, step: 1 },
      { key: "show_trend", type: "boolean", label: "Show Trend Arrow" },
    ],
  },
  donut_ring: {
    fields: [
      { key: "color_primary", type: "color", label: "Primary Color" },
      { key: "glow_color", type: "color", label: "Glow Color" },
      { key: "min_value", type: "number", label: "Minimum Value" },
      { key: "max_value", type: "number", label: "Maximum Value" },
      { key: "start_angle", type: "number", label: "Start Angle (°)", min: -180, max: 0 },
      { key: "end_angle", type: "number", label: "End Angle (°)", min: 0, max: 180 },
      { key: "ring_thickness", type: "number", label: "Ring Thickness (0–0.5)", min: 0.04, max: 0.5, step: 0.01 },
      { key: "use_gradient", type: "boolean", label: "Use Gradient" },
      { key: "gradient_end_color", type: "color", label: "Gradient End Color" },
      { key: "corner_radius", type: "number", label: "Corner Radius", min: 0, max: 12, step: 1 },
    ],
  },
};

export interface GaugeSettingsField {
  key: keyof GaugeSettings;
  type: "number" | "color" | "boolean" | "select" | "textarea";
  label: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
}

/**
 * Suggest a default gauge type for a sensor category.
 */
export function getDefaultGaugeType(category: string): GaugeType {
  const map: Record<string, GaugeType> = {
    temperature: "segmented_arc",
    usage: "segmented_arc",
    load: "speed_dial",
    power: "linear",
    frequency: "text",
    clock: "text",
    fan: "speed_dial",
    voltage: "text",
    memory: "donut_ring",
    throughput: "spark_bar",
  };
  return map[category.toLowerCase()] || "text";
}

/**
 * Build a default GaugeSettings object for a given gauge type, merging with
 * category defaults where appropriate.
 */
export function getDefaultGaugeSettings(gaugeType: GaugeType): GaugeSettings {
  return { ...gaugeTypeMetadata[gaugeType].defaultSettings };
}

/**
 * Build a default widget size for a gauge type.
 */
export function getDefaultGaugeSize(gaugeType: GaugeType): {
  width: number;
  height: number;
} {
  return {
    width: gaugeTypeMetadata[gaugeType].defaultWidth,
    height: gaugeTypeMetadata[gaugeType].defaultHeight,
  };
}

/**
 * Parse a comma-separated string into an array of trimmed image URLs.
 */
export function parseImageSequenceInput(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Serialize an image sequence array into a comma-separated string.
 */
export function serializeImageSequenceInput(images: string[] | undefined): string {
  return (images || []).join(", ");
}
