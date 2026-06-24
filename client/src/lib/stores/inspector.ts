/**
 * Inspector UI state and sensor inventory preferences.
 * Persists sidebar expansion, search queries, recent sensors, and favorites.
 */

import { writable } from "svelte/store";

const INSPECTOR_STATE_KEY = "ultimon_inspector_state";
const SENSOR_INVENTORY_KEY = "ultimon_sensor_inventory";

export type RightSidebarTab = "inspector" | "visual" | "groups";

export interface InspectorState {
  /** Right sidebar active tab */
  activeTab: RightSidebarTab;
  /** Right sidebar width in pixels (optional resize) */
  rightSidebarWidth: number;
  /** Expanded/collapsed state for inspector sections by ID */
  expandedSections: Record<string, boolean>;
  /** Sensor search query used in the inspector sensor picker */
  sensorSearchQuery: string;
  /** Recently used sensor IDs (most recent first) */
  recentSensors: string[];
  /** Favorite sensor IDs */
  favoriteSensors: string[];
  /** Maximum number of recent sensors to retain */
  maxRecentSensors: number;
  /** Maximum number of favorite sensors to retain */
  maxFavoriteSensors: number;
  /** Currently highlighted group ID for canvas group highlight */
  selectedGroupId: string | null;
}

export interface PersistedSensorInventory {
  recentSensors: string[];
  favoriteSensors: string[];
  maxFavoriteSensors: number;
}

const DEFAULT_EXPANDED_SECTIONS: Record<string, boolean> = {
  basic: true,
  display: true,
  layout: true,
  gauge: false,
  style: false,
};

const DEFAULT_INSPECTOR_STATE: InspectorState = {
  activeTab: "inspector",
  rightSidebarWidth: 320,
  expandedSections: { ...DEFAULT_EXPANDED_SECTIONS },
  sensorSearchQuery: "",
  recentSensors: [],
  favoriteSensors: [],
  maxRecentSensors: 10,
  maxFavoriteSensors: 20,
  selectedGroupId: null,
};

function loadInspectorState(): InspectorState {
  if (typeof localStorage === "undefined") return { ...DEFAULT_INSPECTOR_STATE };

  try {
    const raw = localStorage.getItem(INSPECTOR_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<InspectorState>;
      return {
        ...DEFAULT_INSPECTOR_STATE,
        ...parsed,
        expandedSections: {
          ...DEFAULT_EXPANDED_SECTIONS,
          ...(parsed.expandedSections || {}),
        },
      };
    }
  } catch (error) {
    console.warn("[InspectorStore] Failed to load inspector state", error);
  }

  return { ...DEFAULT_INSPECTOR_STATE };
}

function loadSensorInventory(): Pick<
  InspectorState,
  "recentSensors" | "favoriteSensors" | "maxFavoriteSensors"
> {
  if (typeof localStorage === "undefined") {
    return {
      recentSensors: [],
      favoriteSensors: [],
      maxFavoriteSensors: DEFAULT_INSPECTOR_STATE.maxFavoriteSensors,
    };
  }

  try {
    const raw = localStorage.getItem(SENSOR_INVENTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedSensorInventory>;
      return {
        recentSensors: parsed.recentSensors || [],
        favoriteSensors: parsed.favoriteSensors || [],
        maxFavoriteSensors:
          parsed.maxFavoriteSensors ?? DEFAULT_INSPECTOR_STATE.maxFavoriteSensors,
      };
    }
  } catch (error) {
    console.warn("[InspectorStore] Failed to load sensor inventory", error);
  }

  return {
    recentSensors: [],
    favoriteSensors: [],
    maxFavoriteSensors: DEFAULT_INSPECTOR_STATE.maxFavoriteSensors,
  };
}

function createInspectorStore() {
  const inventory = loadSensorInventory();
  const initialState: InspectorState = {
    ...loadInspectorState(),
    ...inventory,
  };

  const { subscribe, set: _set, update } = writable<InspectorState>(initialState);

  function persistState(state: InspectorState) {
    if (typeof localStorage === "undefined") return;

    try {
      localStorage.setItem(
        INSPECTOR_STATE_KEY,
        JSON.stringify({
          activeTab: state.activeTab,
          rightSidebarWidth: state.rightSidebarWidth,
          expandedSections: state.expandedSections,
          sensorSearchQuery: state.sensorSearchQuery,
        }),
      );

      localStorage.setItem(
        SENSOR_INVENTORY_KEY,
        JSON.stringify({
          recentSensors: state.recentSensors,
          favoriteSensors: state.favoriteSensors,
          maxFavoriteSensors: state.maxFavoriteSensors,
        }),
      );
    } catch (error) {
      console.warn("[InspectorStore] Failed to persist state", error);
    }
  }

  return {
    subscribe,

    /** Set the active right sidebar tab */
    setActiveTab: (tab: RightSidebarTab) => {
      update((state) => {
        const next = { ...state, activeTab: tab };
        persistState(next);
        return next;
      });
    },

    /** Set the right sidebar width (optional resize) */
    setRightSidebarWidth: (width: number) => {
      update((state) => {
        const next = { ...state, rightSidebarWidth: Math.max(280, Math.min(480, width)) };
        persistState(next);
        return next;
      });
    },

    /** Toggle an inspector section expanded/collapsed */
    toggleSection: (sectionId: string) => {
      update((state) => {
        const next = {
          ...state,
          expandedSections: {
            ...state.expandedSections,
            [sectionId]: !state.expandedSections[sectionId],
          },
        };
        persistState(next);
        return next;
      });
    },

    /** Set the sensor search query in the inspector sensor picker */
    setSensorSearchQuery: (query: string) => {
      update((state) => {
        const next = { ...state, sensorSearchQuery: query };
        persistState(next);
        return next;
      });
    },

    /** Add a sensor ID to the recent list (moves to front if already present) */
    addRecentSensor: (sensorId: string) => {
      update((state) => {
        const recent = [
          sensorId,
          ...state.recentSensors.filter((id) => id !== sensorId),
        ].slice(0, state.maxRecentSensors);
        const next = { ...state, recentSensors: recent };
        persistState(next);
        return next;
      });
    },

    /** Toggle favorite status for a sensor ID */
    toggleFavoriteSensor: (sensorId: string) => {
      update((state) => {
        const isFavorite = state.favoriteSensors.includes(sensorId);
        const favorites = isFavorite
          ? state.favoriteSensors.filter((id) => id !== sensorId)
          : [...state.favoriteSensors, sensorId].slice(0, state.maxFavoriteSensors);
        const next = { ...state, favoriteSensors: favorites };
        persistState(next);
        return next;
      });
    },

    /** Set the maximum number of favorite sensors (truncates if needed) */
    setMaxFavoriteSensors: (max: number) => {
      update((state) => {
        const next = {
          ...state,
          maxFavoriteSensors: Math.max(1, max),
          favoriteSensors: state.favoriteSensors.slice(0, Math.max(1, max)),
        };
        persistState(next);
        return next;
      });
    },

    /** Set the currently highlighted group ID */
    setSelectedGroupId: (groupId: string | null) => {
      update((state) => ({ ...state, selectedGroupId: groupId }));
    },

    /** Reset inspector UI state while preserving sensor inventory */
    resetUIState: () => {
      update((state) => {
        const next = {
          ...state,
          activeTab: DEFAULT_INSPECTOR_STATE.activeTab,
          rightSidebarWidth: DEFAULT_INSPECTOR_STATE.rightSidebarWidth,
          expandedSections: { ...DEFAULT_EXPANDED_SECTIONS },
          sensorSearchQuery: "",
          selectedGroupId: null,
        };
        persistState(next);
        return next;
      });
    },

    /** Reset all sensor inventory preferences */
    clearSensorInventory: () => {
      update((state) => {
        const next = {
          ...state,
          recentSensors: [],
          favoriteSensors: [],
        };
        persistState(next);
        return next;
      });
    },
  };
}

export const inspectorStore = createInspectorStore();
