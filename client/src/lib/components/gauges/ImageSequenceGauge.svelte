<script lang="ts">
  import type { WidgetConfig, SensorData } from '$lib/types';

  const { widget, sensorData }: { widget: WidgetConfig; sensorData: SensorData | undefined } = $props();

  let currentImageIndex = $state(0);
  let images: HTMLImageElement[] = $state([]);
  let imagesLoaded = $state(false);

  // Image sequence settings with defaults
  const imageSequence = $derived(widget.gauge_settings.image_sequence ?? []);
  const animationSpeed = $derived(widget.gauge_settings.animation_speed ?? 1); // frames per second
  const minValue = $derived(widget.gauge_settings.min_value ?? sensorData?.min_value ?? 0);
  const maxValue = $derived(widget.gauge_settings.max_value ?? sensorData?.max_value ?? 100);

  const sensorName = $derived(widget.custom_label || sensorData?.name || 'Unknown Sensor');
  const unit = $derived(widget.custom_unit || sensorData?.unit || '');
  const displayValue = $derived(sensorData?.value ?? '--');

  // Calculate current image based on sensor value
  $effect(() => {
    if (imagesLoaded && imageSequence.length > 0 && typeof displayValue === 'number') {
      const normalizedValue = Math.max(0, Math.min(1, (displayValue - minValue) / (maxValue - minValue)));
      currentImageIndex = Math.floor(normalizedValue * (imageSequence.length - 1));
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
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  });

  async function loadImages() {
    imagesLoaded = false;
    images = [];

    try {
      const loadPromises = imageSequence.map((imageSrc: string) => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = imageSrc;
        });
      });

      images = await Promise.all(loadPromises);
      imagesLoaded = true;
    } catch (error) {
      console.error('Failed to load image sequence:', error);
      imagesLoaded = false;
    }
  }

  function handleImageUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      const imageUrls = files.map(file => URL.createObjectURL(file));

      // Update widget settings with new image sequence
      // Note: In a real app, you'd want to upload these to a server
      // For now, we'll use object URLs which will work in the current session
      widget.gauge_settings = {
        ...widget.gauge_settings,
        image_sequence: imageUrls
      };
    }
  }
</script>

<div class="gauge-container">
  <!-- Title -->
  {#if widget.show_label}
    <div class="text-center text-xs font-medium text-[var(--theme-text-muted)] mb-1 truncate">
      {sensorName}
    </div>
  {/if}

  <!-- Image Display Area -->
  <div class="image-display flex-1 flex items-center justify-center relative">
    {#if imageSequence.length === 0}
      <!-- Upload prompt -->
      <div class="upload-prompt text-center p-4">
        <div class="text-[var(--theme-text-muted)] mb-2">
          <svg class="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          No image sequence
        </div>
        <label class="btn-upload cursor-pointer inline-block px-3 py-1 bg-[var(--theme-primary)] text-white rounded text-xs hover:opacity-80">
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
        <svg class="w-6 h-6 mx-auto mb-2 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <div class="text-xs">Loading images...</div>
      </div>
    {:else if images[currentImageIndex]}
      <!-- Current image -->
      <img
        src={images[currentImageIndex].src}
        alt="Sensor visualization"
        class="max-w-full max-h-full object-contain"
      />

      <!-- Progress indicator -->
      <div class="absolute bottom-1 left-1 right-1">
        <div class="bg-black bg-opacity-30 rounded-full h-1 overflow-hidden">
          <div
            class="h-full bg-[var(--theme-primary)] transition-all duration-300"
            style="width: {((currentImageIndex + 1) / imageSequence.length) * 100}%"
          ></div>
        </div>
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
      <label class="btn-settings cursor-pointer p-1 bg-black bg-opacity-30 rounded text-white hover:bg-opacity-50 transition-all">
        <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
        </svg>
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
