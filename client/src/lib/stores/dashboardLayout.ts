import { writable } from 'svelte/store';
import type { DashboardLayout } from '$lib/types';

export const dashboardLayout = writable<DashboardLayout>({
  canvas_width: 1920,
  canvas_height: 1080,
  background_type: 'solid',
  background_settings: {
    color: '#f8fafc'
  }
}); 