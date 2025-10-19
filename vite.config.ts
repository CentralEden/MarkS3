import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}']
	},
	define: {
		// Enable AWS SDK v3 in browser
		global: 'globalThis'
	},
	optimizeDeps: {
		include: ['@aws-sdk/client-s3', '@aws-sdk/client-cognito-identity']
	}
});