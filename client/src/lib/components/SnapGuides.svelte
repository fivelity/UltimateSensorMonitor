<script lang="ts">
  import { visualSettings, widgets } from '$lib/stores';
  import type { WidgetConfig } from '$lib/types';

  interface Props {
    activeWidget: WidgetConfig | null;
    isDragging: boolean;
  }

  const { activeWidget, isDragging }: Props = $props();

  interface SnapGuide {
    type: 'horizontal' | 'vertical';
    position: number;
    widgets: string[];
    color: string;
  }

  let snapGuides = $state<SnapGuide[]>([]);
  const snapDistance = 10; // pixels

  $effect(() => {
    if (activeWidget && isDragging && $visualSettings.snap_to_grid) {
      calculateSnapGuides();
    } else {
      snapGuides = [];
    }
  });

  function calculateSnapGuides() {
    if (!activeWidget) return;

    const guides: SnapGuide[] = [];
    const allWidgets = Object.values($widgets).filter(w => w.id !== activeWidget.id);
    
    // Calculate horizontal guides (Y positions)
    const yPositions = new Map<number, string[]>();
    
    allWidgets.forEach(widget => {
      // Top edge
      addToPositionMap(yPositions, widget.pos_y, widget.id);
      // Bottom edge
      addToPositionMap(yPositions, widget.pos_y + widget.height, widget.id);
      // Center
      addToPositionMap(yPositions, widget.pos_y + widget.height / 2, widget.id);
    });

    // Calculate vertical guides (X positions)
    const xPositions = new Map<number, string[]>();
    
    allWidgets.forEach(widget => {
      // Left edge
      addToPositionMap(xPositions, widget.pos_x, widget.id);
      // Right edge
      addToPositionMap(xPositions, widget.pos_x + widget.width, widget.id);
      // Center
      addToPositionMap(xPositions, widget.pos_x + widget.width / 2, widget.id);
    });

    // Create horizontal guides
    yPositions.forEach((widgetIds, y) => {
      if (isNearPosition(activeWidget.pos_y, y) || 
          isNearPosition(activeWidget.pos_y + activeWidget.height, y) ||
          isNearPosition(activeWidget.pos_y + activeWidget.height / 2, y)) {
        guides.push({
          type: 'horizontal',
          position: y,
          widgets: widgetIds,
          color: getGuideColor(widgetIds.length)
        });
      }
    });

    // Create vertical guides
    xPositions.forEach((widgetIds, x) => {
      if (isNearPosition(activeWidget.pos_x, x) || 
          isNearPosition(activeWidget.pos_x + activeWidget.width, x) ||
          isNearPosition(activeWidget.pos_x + activeWidget.width / 2, x)) {
        guides.push({
          type: 'vertical',
          position: x,
          widgets: widgetIds,
          color: getGuideColor(widgetIds.length)
        });
      }
    });

    snapGuides = guides;
  }

  function addToPositionMap(map: Map<number, string[]>, position: number, widgetId: string) {
    const rounded = Math.round(position);
    if (!map.has(rounded)) {
      map.set(rounded, []);
    }
    map.get(rounded)!.push(widgetId);
  }

  function isNearPosition(pos1: number, pos2: number): boolean {
    return Math.abs(pos1 - pos2) <= snapDistance;
  }

  function getGuideColor(widgetCount: number): string {
    if (widgetCount >= 3) return '#ef4444'; // Red for multiple alignments
    if (widgetCount === 2) return '#f59e0b'; // Yellow for pair alignment
    return '#3b82f6'; // Blue for single alignment
  }

  // Snap calculation function that can be called from parent
  export function calculateSnap(newX: number, newY: number): { x: number; y: number } {
    if (!activeWidget || !$visualSettings.snap_to_grid) {
      return { x: newX, y: newY };
    }

    let snappedX = newX;
    let snappedY = newY;

    const allWidgets = Object.values($widgets).filter(w => w.id !== activeWidget.id);

    // Check for X-axis snapping
    for (const widget of allWidgets) {
      const snapPoints = [
        widget.pos_x, // Left edge
        widget.pos_x + widget.width, // Right edge
        widget.pos_x + widget.width / 2 // Center
      ];

      for (const snapPoint of snapPoints) {
        if (isNearPosition(newX, snapPoint)) {
          snappedX = snapPoint;
          break;
        }
        if (isNearPosition(newX + activeWidget.width, snapPoint)) {
          snappedX = snapPoint - activeWidget.width;
          break;
        }
        if (isNearPosition(newX + activeWidget.width / 2, snapPoint)) {
          snappedX = snapPoint - activeWidget.width / 2;
          break;
        }
      }
    }

    // Check for Y-axis snapping
    for (const widget of allWidgets) {
      const snapPoints = [
        widget.pos_y, // Top edge
        widget.pos_y + widget.height, // Bottom edge
        widget.pos_y + widget.height / 2 // Center
      ];

      for (const snapPoint of snapPoints) {
        if (isNearPosition(newY, snapPoint)) {
          snappedY = snapPoint;
          break;
        }
        if (isNearPosition(newY + activeWidget.height, snapPoint)) {
          snappedY = snapPoint - activeWidget.height;
          break;
        }
        if (isNearPosition(newY + activeWidget.height / 2, snapPoint)) {
          snappedY = snapPoint - activeWidget.height / 2;
          break;
        }
      }
    }

    return { x: snappedX, y: snappedY };
  }
</script>

{#if snapGuides.length > 0 && isDragging}
  <div class="snap-guides">
    {#each snapGuides as guide}
      {#if guide.type === 'horizontal'}
        <div 
          class="guide guide-horizontal"
          style="
            top: {guide.position}px;
            border-color: {guide.color};
            box-shadow: 0 0 4px {guide.color}40;
          "
        ></div>
      {:else}
        <div 
          class="guide guide-vertical"
          style="
            left: {guide.position}px;
            border-color: {guide.color};
            box-shadow: 0 0 4px {guide.color}40;
          "
        ></div>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .snap-guides {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1000;
    overflow: hidden;
  }

  .guide {
    position: absolute;
    border-style: dashed;
    border-width: 1px;
    opacity: 0.8;
    animation: fadeIn 0.2s ease-out;
  }

  .guide-horizontal {
    left: 0;
    right: 0;
    height: 0;
    border-top-width: 1px;
    border-left: none;
    border-right: none;
    border-bottom: none;
  }

  .guide-vertical {
    top: 0;
    bottom: 0;
    width: 0;
    border-left-width: 1px;
    border-top: none;
    border-right: none;
    border-bottom: none;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 0.8;
    }
  }

  /* Visual feedback for different guide types */
  .guide:before {
    content: '';
    position: absolute;
    background: currentColor;
    border-radius: 2px;
    opacity: 0.6;
  }

  .guide-horizontal:before {
    left: 50%;
    top: -2px;
    width: 4px;
    height: 4px;
    transform: translateX(-50%);
  }

  .guide-vertical:before {
    top: 50%;
    left: -2px;
    width: 4px;
    height: 4px;
    transform: translateY(-50%);
  }
</style>
