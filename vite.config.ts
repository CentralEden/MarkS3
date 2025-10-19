import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}']
	},
	define: {
		global: 'globalThis',
		'process.env': {}
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
			'@aws-sdk/client-cognito-identity-provider',
			'@aws-sdk/credential-providers',
			'buffer',
			'process',
			'readable-stream',
			'crypto-browserify',
			'util',
			'events'
		],
		exclude: [
			// Exclude Node.js specific modules
			'@aws-sdk/node-http-handler',
			'@aws-sdk/hash-node',
			'@aws-sdk/credential-provider-node'
		]
	},
	build: {
		target: 'esnext',
		rollupOptions: {
			output: {
				manualChunks: (id) => {
					// Group AWS SDK modules together
					if (id.includes('@aws-sdk')) {
						return 'aws-sdk';
					}
					// Group other vendor modules
					if (id.includes('node_modules')) {
						return 'vendor';
					}
				}
			}
		}
	},
	server: {
		fs: {
			// Allow serving files from one level up to the project root
			allow: ['..']
		}
	}
});