import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		port: 5501,
		proxy: {
			'/api': {
				target: 'http://localhost:8100',
				changeOrigin: true,
			},
			'/ws': {
				target: 'ws://localhost:8100',
				ws: true,
			},
		},
	}
});
