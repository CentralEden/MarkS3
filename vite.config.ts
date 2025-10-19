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
	},
	build: {
		rollupOptions: {
			output: {
				manualChunks: {
					// Separate AWS SDK into its own chunk
					'aws-sdk': ['@aws-sdk/client-s3', '@aws-sdk/client-cognito-identity', '@aws-sdk/credential-providers'],
					// Separate Milkdown editor into its own chunk
					'editor': ['@milkdown/core', '@milkdown/preset-commonmark', '@milkdown/plugin-listener'],
					// Separate utility libraries
					'utils': ['dompurify']
				}
			}
		},
		// Enable code splitting
		target: 'esnext',
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: true,
				drop_debugger: true
			}
		}
	}
});