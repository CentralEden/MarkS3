import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}']
	},
	define: {
		global: 'globalThis'
	},
	resolve: {
		alias: {
			// Polyfill Node.js modules for browser
			stream: 'readable-stream',
			'node:stream': 'readable-stream',
			crypto: 'crypto-browserify',
			buffer: 'buffer',
			process: 'process/browser',
			util: 'util',
			events: 'events'
		}
	},
	optimizeDeps: {
		include: [
			'@aws-sdk/client-s3',
			'@aws-sdk/client-cognito-identity',
			'buffer',
			'process',
			'readable-stream',
			'crypto-browserify',
			'util',
			'events'
		]
	},
	build: {
		target: 'esnext',
		minify: 'terser',
		terserOptions: {
			compress: {
				drop_console: true,
				drop_debugger: true
			}
		},
		rollupOptions: {
			external: [
				// Exclude Node.js specific AWS SDK modules
				/@aws-sdk.*node/,
				/@smithy.*node/,
				/node-http-handler/
			],
			output: {
				manualChunks: (id) => {
					if (id.includes('@aws-sdk')) {
						return 'aws-sdk';
					}
					if (id.includes('node_modules')) {
						return 'vendor';
					}
				}
			}
		}
	}
});