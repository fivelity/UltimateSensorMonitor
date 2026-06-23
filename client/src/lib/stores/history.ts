import { writable } from "svelte/store";
import type { WidgetConfig, WidgetGroup } from "$lib/types";

// Command interface for the Command pattern
export interface Command {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  execute(): void;
  undo(): void;
}

// History state interface
interface HistoryState {
  commands: Command[];
  currentIndex: number;
  maxHistory: number;
}

// Create the history store
function createHistoryStore() {
  const initialState: HistoryState = {
    commands: [],
    currentIndex: -1,
    maxHistory: 50,
  };

  const { subscribe, set, update } = writable(initialState);

  return {
    subscribe,

    // Execute a command and add it to history
    executeCommand: (command: Command) => {
      update((state) => {
        // Execute the command
        command.execute();

        // Remove any commands after current index (if we're in the middle of history)
        const newCommands = state.commands.slice(0, state.currentIndex + 1);

        // Add new command
        newCommands.push(command);

        // Maintain max history limit
        if (newCommands.length > state.maxHistory) {
          newCommands.shift();
        }

        return {
          ...state,
          commands: newCommands,
          currentIndex: newCommands.length - 1,
        };
      });
    },

    // Undo the last command
    undo: () => {
      update((state) => {
        if (state.currentIndex >= 0) {
          const command = state.commands[state.currentIndex];
          command.undo();

          return {
            ...state,
            currentIndex: state.currentIndex - 1,
          };
        }
        return state;
      });
    },

    // Redo the next command
    redo: () => {
      update((state) => {
        if (state.currentIndex < state.commands.length - 1) {
          const nextIndex = state.currentIndex + 1;
          const command = state.commands[nextIndex];
          command.execute();

          return {
            ...state,
            currentIndex: nextIndex,
          };
        }
        return state;
      });
    },

    // Check if undo is available
    canUndo: () => {
      let result = false;
      update((state) => {
        result = state.currentIndex >= 0;
        return state;
      });
      return result;
    },

    // Check if redo is available
    canRedo: () => {
      let result = false;
      update((state) => {
        result = state.currentIndex < state.commands.length - 1;
        return state;
      });
      return result;
    },

    // Clear history
    clear: () => {
      set(initialState);
    },

    // Get history info
    getInfo: () => {
      let info = { commandCount: 0, currentIndex: -1 };
      update((state) => {
        info = {
          commandCount: state.commands.length,
          currentIndex: state.currentIndex,
        };
        return state;
      });
      return info;
    },
  };
}

export const historyStore = createHistoryStore();

// Command implementations for different operations
export class MoveWidgetCommand implements Command {
  id: string;
  type = "move";
  description: string;
  timestamp: number;

  constructor(
    private widgetId: string,
    private oldPos: { x: number; y: number },
    private newPos: { x: number; y: number },
    private updateWidgetFn: (
      id: string,
      updates: Partial<WidgetConfig>,
    ) => void,
  ) {
    this.id = `move_${widgetId}_${Date.now()}`;
    this.description = `Move widget to (${newPos.x}, ${newPos.y})`;
    this.timestamp = Date.now();
  }

  execute() {
    this.updateWidgetFn(this.widgetId, {
      pos_x: this.newPos.x,
      pos_y: this.newPos.y,
    });
  }

  undo() {
    this.updateWidgetFn(this.widgetId, {
      pos_x: this.oldPos.x,
      pos_y: this.oldPos.y,
    });
  }
}

export class ResizeWidgetCommand implements Command {
  id: string;
  type = "resize";
  description: string;
  timestamp: number;

  constructor(
    private widgetId: string,
    private oldSize: { width: number; height: number },
    private newSize: { width: number; height: number },
    private updateWidgetFn: (
      id: string,
      updates: Partial<WidgetConfig>,
    ) => void,
  ) {
    this.id = `resize_${widgetId}_${Date.now()}`;
    this.description = `Resize widget to ${newSize.width}x${newSize.height}`;
    this.timestamp = Date.now();
  }

  execute() {
    this.updateWidgetFn(this.widgetId, {
      width: this.newSize.width,
      height: this.newSize.height,
    });
  }

  undo() {
    this.updateWidgetFn(this.widgetId, {
      width: this.oldSize.width,
      height: this.oldSize.height,
    });
  }
}

export class AddWidgetCommand implements Command {
  id: string;
  type = "add";
  description: string;
  timestamp: number;

  constructor(
    private widget: WidgetConfig,
    private addWidgetFn: (widget: WidgetConfig) => void,
    private removeWidgetFn: (id: string) => void,
  ) {
    this.id = `add_${widget.id}_${Date.now()}`;
    this.description = `Add widget "${widget.custom_label || "Unnamed"}"`;
    this.timestamp = Date.now();
  }

  execute() {
    this.addWidgetFn(this.widget);
  }

  undo() {
    this.removeWidgetFn(this.widget.id);
  }
}

export class RemoveWidgetCommand implements Command {
  id: string;
  type = "remove";
  description: string;
  timestamp: number;

  constructor(
    private widget: WidgetConfig,
    private addWidgetFn: (widget: WidgetConfig) => void,
    private removeWidgetFn: (id: string) => void,
  ) {
    this.id = `remove_${widget.id}_${Date.now()}`;
    this.description = `Remove widget "${widget.custom_label || "Unnamed"}"`;
    this.timestamp = Date.now();
  }

  execute() {
    this.removeWidgetFn(this.widget.id);
  }

  undo() {
    this.addWidgetFn(this.widget);
  }
}

export class UpdateWidgetCommand implements Command {
  id: string;
  type = "update";
  description: string;
  timestamp: number;

  constructor(
    private widgetId: string,
    private oldValues: Partial<WidgetConfig>,
    private newValues: Partial<WidgetConfig>,
    private updateWidgetFn: (
      id: string,
      updates: Partial<WidgetConfig>,
    ) => void,
  ) {
    this.id = `update_${widgetId}_${Date.now()}`;
    this.description = `Update widget properties`;
    this.timestamp = Date.now();
  }

  execute() {
    this.updateWidgetFn(this.widgetId, this.newValues);
  }

  undo() {
    this.updateWidgetFn(this.widgetId, this.oldValues);
  }
}

export class GroupWidgetsCommand implements Command {
  id: string;
  type = "group";
  description: string;
  timestamp: number;

  constructor(
    private group: WidgetGroup,
    private widgetIds: string[],
    private addGroupFn: (group: WidgetGroup) => void,
    private removeGroupFn: (id: string) => void,
    private updateWidgetFn: (
      id: string,
      updates: Partial<WidgetConfig>,
    ) => void,
  ) {
    this.id = `group_${group.id}_${Date.now()}`;
    this.description = `Group ${widgetIds.length} widgets`;
    this.timestamp = Date.now();
  }

  execute() {
    this.addGroupFn(this.group);
    this.widgetIds.forEach((id) => {
      this.updateWidgetFn(id, { group_id: this.group.id });
    });
  }

  undo() {
    this.removeGroupFn(this.group.id);
    this.widgetIds.forEach((id) => {
      this.updateWidgetFn(id, { group_id: undefined });
    });
  }
}

export class BatchCommand implements Command {
  id: string;
  type = "batch";
  description: string;
  timestamp: number;

  constructor(
    private commands: Command[],
    description?: string,
  ) {
    this.id = `batch_${Date.now()}`;
    this.description =
      description || `Batch operation (${commands.length} commands)`;
    this.timestamp = Date.now();
  }

  execute() {
    this.commands.forEach((cmd) => cmd.execute());
  }

  undo() {
    // Undo in reverse order
    this.commands
      .slice()
      .reverse()
      .forEach((cmd) => cmd.undo());
  }
}
