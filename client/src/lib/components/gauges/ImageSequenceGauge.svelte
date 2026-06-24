<script lang="ts">
  import type { SensorData, WidgetConfig } from "$lib/types";
  import { logger } from "$lib/utils/logger";
  import { ImagePlus, Loader2, Settings2 } from "@lucide/svelte";

  const {
    widget,
    sensorData,
  }: { widget: WidgetConfig; sensorData: SensorData | undefined } = $props();

  let currentImageIndex = $state(0);
  let images: (HTMLImageElement | null)[] = $state([]);
  let imagesLoaded = $state(false);

  // Image sequence settings with defaults
  const imageSequence = $derived(widget.gauge_settings.image_sequence ?? []);
  const minValue = $derived(
    widget.gauge_settings.min_value ?? sensorData?.min_value ?? 0,
  );
  const maxValue = $derived(
    widget.gauge_settings.max_value ?? sensorData?.max_value ?? 100,
  );

  const sensorName = $derived(
    widget.custom_label || sensorData?.name || "Unknown Sensor",
  );
  const unit = $derived(widget.custom_unit || sensorData?.unit || "");
  const displayValue = $derived(sensorData?.value ?? "--");
  const currentImage = $derived(images[currentImageIndex] ?? null);

  // Calculate current image based on sensor value
  $effect(() => {
    if (
      imagesLoaded &&
      imageSequence.length > 0 &&
      typeof displayValue === "number"
    ) {
      const normalizedValue = Math.max(
        0,
        Math.min(1, (displayValue - minValue) / (maxValue - minValue)),
      );
      currentImageIndex = Math.floor(
        normalizedValue * (imageSequence.length - 1),
      );
    }
  });

  // Load images when image sequence changes
  $effect(() => {
    if (imageSequence.length > 0) {
      loadImages();
    }
    // Cleanup object URLs when component is destroyed
    return () => {
      imageSequence.forEach((url: string) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  });

  async function loadImages() {
    imagesLoaded = false;
    images = [];

    const results = await Promise.allSettled(
      imageSequence.map((imageSrc: string) => {
        const trimmed = imageSrc.trim();
        if (!trimmed) {
          return Promise.reject(new Error("Empty image URL"));
        }
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () =>
            reject(new Error(`Failed to load image: ${trimmed}`));
          img.src = trimmed;
        });
      }),
    );

    images = results.map((result) =>
      result.status === "fulfilled" ? result.value : null,
    );
    imagesLoaded = true;

    const failedCount = results.filter(
      (result) => result.status === "rejected",
    ).length;
    if (failedCount > 0) {
      logger.warn(`${failedCount} image(s) failed to load in sequence`);
    }
  }

  function handleImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      const imageUrls = files.map((file) => URL.createObjectURL(file));

      // Update widget settings with new image sequence
      // Note: In a real app, you'd want to upload these to a server
      // For now, we'll use object URLs which will work in the current session
      widget.gauge_settings = {
        ...widget.gauge_settings,
        image_sequence: imageUrls,
      };
    }
  }
</script>

<div class="gauge-container">
  <!-- Title -->
  {#if widget.show_label}
    <div
      class="text-center text-xs font-medium text-[var(--theme-text-muted)] mb-1 truncate"
    >
      {sensorName}
    </div>
  {/if}

  <!-- Image Display Area -->
  <div class="image-display flex-1 flex items-center justify-center relative">
    {#if imageSequence.length === 0}
      <!-- Upload prompt -->
      <div class="upload-prompt text-center p-4">
        <div class="text-[var(--theme-text-muted)] mb-2">
          <ImagePlus size={32} class="mx-auto mb-2" />
          No image sequence
        </div>
        <label
          class="cursor-pointer inline-block px-3 py-1 bg-[var(--theme-primary)] text-[var(--theme-background)] rounded text-xs hover:opacity-80 transition-opacity focus-within:ring-2 focus-within:ring-[var(--theme-primary)]"
        >
          Upload Images
          <input
            type="file"
            multiple
            accept="image/*"
            class="hidden"
            onchange={handleImageUpload}
          />
        </label>
      </div>
    {:else if !imagesLoaded}
      <!-- Loading indicator -->
      <div class="text-center text-[var(--theme-text-muted)]">
        <Loader2 size={24} class="mx-auto mb-2 animate-spin" />
        <div class="text-xs">Loading images...</div>
      </div>
    {:else if currentImage}
      <!-- Current image -->
      <img
        src={currentImage.src}
        alt="Sensor visualization"
        class="max-w-full max-h-full object-contain"
      />

      <!-- Progress indicator -->
      <div class="absolute bottom-1 left-1 right-1">
        <div
          class="bg-[var(--theme-text-muted)]/30 rounded-full h-1 overflow-hidden"
        >
          <div
            class="h-full bg-[var(--theme-primary)] transition-all duration-300"
            style="width: {((currentImageIndex + 1) / imageSequence.length) *
              100}%"
          ></div>
        </div>
      </div>
    {:else}
      <!-- Image failed to load or unavailable -->
      <div class="text-center text-[var(--theme-text-muted)]">
        <ImagePlus size={24} class="mx-auto mb-2" />
        <div class="text-xs">Image unavailable</div>
      </div>
    {/if}
  </div>

  <!-- Value Display -->
  <div class="text-center mt-2">
    <div class="text-sm font-semibold text-[var(--theme-text)]">
      {displayValue}
      {#if widget.show_unit && unit}
        <span class="text-xs text-[var(--theme-text-muted)] ml-1">{unit}</span>
      {/if}
    </div>

    {#if imageSequence.length > 0}
      <div class="text-xs text-[var(--theme-text-muted)] mt-1">
        Frame {currentImageIndex + 1} of {imageSequence.length}
      </div>
    {/if}
  </div>

  <!-- Settings overlay in edit mode -->
  {#if imageSequence.length > 0}
    <div class="absolute top-1 right-1">
      <label
        class="cursor-pointer p-1 bg-[var(--theme-surface)]/60 rounded text-[var(--theme-text)] hover:bg-[var(--theme-surface)] transition-all border border-[var(--theme-border)] focus-within:ring-2 focus-within:ring-[var(--theme-primary)]"
      >
        <Settings2 size={12} />
        <input
          type="file"
          multiple
          accept="image/*"
          class="hidden"
          onchange={handleImageUpload}
        />
      </label>
    </div>
  {/if}
</div>

<style>
  .gauge-container {
    width: 100%;
    height: 100%;
    padding: 8px;
    display: flex;
    flex-direction: column;
    position: relative;
  }

  .image-display {
    min-height: 0; /* Allow flex item to shrink */
    border: 1px dashed var(--theme-border);
    border-radius: 4px;
    overflow: hidden;
  }

  .upload-prompt {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
</style>
