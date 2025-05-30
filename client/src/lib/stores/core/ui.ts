/**
 * UI State Management Store
 * Handles application UI state like edit mode, selection, context menus, etc.
 */

import { writable, derived } from 'svelte/store';
import type { EditMode, Selection, ContextMenuState, DragState } from '$lib/types';

// Core UI state
export const editMode = writable<EditMode>('view');
export const selectedWidgets = writable<Selection>({ type: 'widget', ids: [] });
export const contextMenu = writable<ContextMenuState>({
  show: false,
  x: 0,
  y: 0
});

// Drag and drop state
export const dragState = writable<DragState>({
  isDragging: false,
  startPos: { x: 0, y: 0 },
  currentPos: { x: 0, y: 0 }
});

// Sidebar state
export const showLeftSidebar = writable<boolean>(false);
export const showRightSidebar = writable<boolean>(false);

// Modal and overlay state
export const activeModal = writable<string | null>(null);
export const isLoading = writable<boolean>(false);
export const loadingMessage = writable<string>('');

// Derived states
export const hasSelection = derived(
  selectedWidgets,
  ($selectedWidgets) => $selectedWidgets.ids.length > 0
);

export const isEditMode = derived(
  editMode,
  ($editMode) => $editMode === 'edit'
);

export const selectedWidgetCount = derived(
  selectedWidgets,
  ($selectedWidgets) => $selectedWidgets.ids.length
);

// UI utility functions
export const uiUtils = {
  // Edit mode management
  toggleEditMode: () => {
    editMode.update(mode => mode === 'edit' ? 'view' : 'edit');
  },
  
  setEditMode: (mode: EditMode) => {
    editMode.set(mode);
  },
  
  // Selection management
  selectWidget: (id: string, multiSelect = false) => {
    selectedWidgets.update(selection => {
      if (multiSelect && selection.type === 'widget') {
        const ids = selection.ids.includes(id)
          ? selection.ids.filter(wid => wid !== id)
          : [...selection.ids, id];
        return { type: 'widget', ids };
      } else {
        return { type: 'widget', ids: [id] };
      }
    });
  },
  
  selectGroup: (id: string) => {
    selectedWidgets.set({ type: 'group', ids: [id] });
  },
  
  clearSelection: () => {
    selectedWidgets.set({ type: 'widget', ids: [] });
  },
  
  addToSelection: (id: string) => {
    selectedWidgets.update(selection => {
      if (selection.type === 'widget' && !selection.ids.includes(id)) {
        return { ...selection, ids: [...selection.ids, id] };
      }
      return selection;
    });
  },
  
  removeFromSelection: (id: string) => {
    selectedWidgets.update(selection => {
      if (selection.type === 'widget') {
        return { ...selection, ids: selection.ids.filter(wid => wid !== id) };
      }
      return selection;
    });
  },
  
  // Context menu management
  showContextMenu: (x: number, y: number, target?: { type: 'widget' | 'group' | 'canvas'; id?: string }) => {
    contextMenu.set({
      show: true,
      x,
      y,
      target
    });
  },
  
  hideContextMenu: () => {
    contextMenu.update(menu => ({
      ...menu,
      show: false
    }));
  },
  
  // Drag state management
  startDrag: (startPos: { x: number; y: number }, widgetId?: string, groupId?: string) => {
    dragState.set({
      isDragging: true,
      startPos,
      currentPos: startPos,
      widgetId,
      groupId
    });
  },
  
  updateDrag: (currentPos: { x: number; y: number }) => {
    dragState.update(state => ({
      ...state,
      currentPos
    }));
  },
  
  endDrag: () => {
    dragState.set({
      isDragging: false,
      startPos: { x: 0, y: 0 },
      currentPos: { x: 0, y: 0 }
    });
  },
  
  // Sidebar management
  toggleLeftSidebar: () => {
    showLeftSidebar.update(show => !show);
  },
  
  toggleRightSidebar: () => {
    showRightSidebar.update(show => !show);
  },
  
  setLeftSidebar: (show: boolean) => {
    showLeftSidebar.set(show);
  },
  
  setRightSidebar: (show: boolean) => {
    showRightSidebar.set(show);
  },
  
  // Modal management
  openModal: (modalId: string) => {
    activeModal.set(modalId);
  },
  
  closeModal: () => {
    activeModal.set(null);
  },
  
  // Loading state
  setLoading: (loading: boolean, message = '') => {
    isLoading.set(loading);
    loadingMessage.set(message);
  },
  
  // Bulk UI reset
  resetUI: () => {
    selectedWidgets.set({ type: 'widget', ids: [] });
    contextMenu.set({ show: false, x: 0, y: 0 });
    activeModal.set(null);
    isLoading.set(false);
    loadingMessage.set('');
    dragState.set({
      isDragging: false,
      startPos: { x: 0, y: 0 },
      currentPos: { x: 0, y: 0 }
    });
  }
}; 