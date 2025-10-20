import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}']
	},
	// Configure base URL for S3 hosting - use relative paths
	base: '',
	define: {
		global: 'globalThis',
		'process.env': {},
		// Define process for AWS SDK compatibility
		'process.version': JSON.stringify('v18.0.0'),
		'process.platform': JSON.stringify('browser'),
		'process.browser': true
	},
	resolve: {
		alias: {
			// Enhanced polyfills for Node.js modules in browser
			stream: 'readable-stream',
			'node:stream': 'readable-stream',
			'stream/web': 'readable-stream',
			crypto: 'crypto-browserify',
			'node:crypto': 'crypto-browserify',
			buffer: 'buffer',
			'node:buffer': 'buffer',
			process: 'process/browser',
			'node:process': 'process/browser',
			util: 'util',
			'node:util': 'util',
			events: 'events',
			'node:events': 'events',
			// Additional polyfills for AWS SDK
			path: 'path-browserify',
			'node:path': 'path-browserify',
			os: 'os-browserify/browser',
			'node:os': 'os-browserify/browser',
			url: 'url',
			'node:url': 'url',
			querystring: 'querystring-es3',
			'node:querystring': 'querystring-es3',
			// Exclude Node.js specific modules by providing empty modules
			fs: resolve('./src/lib/polyfills/fs'),
			'node:fs': resolve('./src/lib/polyfills/fs'),
			'fs/promises': resolve('./src/lib/polyfills/fs/promises.js'),
			http: resolve('./src/lib/polyfills/http.js'),
			'node:http': resolve('./src/lib/polyfills/http.js'),
			https: resolve('./src/lib/polyfills/http.js'),
			'node:https': resolve('./src/lib/polyfills/http.js'),
			http2: resolve('./src/lib/polyfills/empty.js'),
			'node:http2': resolve('./src/lib/polyfills/empty.js'),
			zlib: resolve('./src/lib/polyfills/empty.js'),
			'node:zlib': resolve('./src/lib/polyfills/empty.js'),
			vm: resolve('./src/lib/polyfills/empty.js'),
			'node:vm': resolve('./src/lib/polyfills/empty.js'),
			async_hooks: resolve('./src/lib/polyfills/empty.js'),
			'node:async_hooks': resolve('./src/lib/polyfills/empty.js'),
			child_process: resolve('./src/lib/polyfills/child_process.js'),
			'node:child_process': resolve('./src/lib/polyfills/child_process.js')
		}
	},
	optimizeDeps: {
		include: [
			// AWS SDK browser-compatible modules
			'@aws-sdk/client-s3',
			'@aws-sdk/client-cognito-identity',
			'@aws-sdk/client-cognito-identity-provider',
			'@aws-sdk/credential-providers',
			'@aws-sdk/types',
			// Essential polyfills
			'buffer',
			'process/browser',
			'readable-stream',
			'crypto-browserify',
			'util',
			'events',
			'path-browserify',
			'os-browserify/browser',
			'url',
			'querystring-es3'
		],
		exclude: [
			// Exclude Node.js specific AWS SDK modules
			'@aws-sdk/node-http-handler',
			'@aws-sdk/hash-node',
			'@aws-sdk/credential-provider-node',
			'@aws-sdk/credential-provider-ini',
			'@aws-sdk/credential-provider-process',
			'@aws-sdk/credential-provider-sso',
			'@aws-sdk/credential-provider-ec2',
			'@aws-sdk/credential-provider-ecs',
			'@aws-sdk/credential-provider-env',
			'@smithy/node-http-handler',
			'@smithy/hash-node'
		]
	},
	build: {
		// Browser-specific build target for modern browsers
		target: ['es2020', 'edge88', 'firefox78', 'chrome87', 'safari14'],
		// Optimize for production
		minify: 'esbuild',
		sourcemap: false,
		// Enhanced chunk splitting and optimization
		rollupOptions: {
			output: {
				// Optimized manual chunking strategy
				manualChunks: (id) => {
					// Skip Node.js specific modules entirely
					if (id.includes('@smithy/node-http-handler') || 
						id.includes('@aws-sdk/node-http-handler') ||
						id.includes('@smithy/hash-node') ||
						id.includes('@aws-sdk/hash-node')) {
						return undefined;
					}
					
					// AWS SDK gets its own chunk for better caching
					if (id.includes('@aws-sdk/client-s3')) {
						return 'aws-s3';
					}
					if (id.includes('@aws-sdk/client-cognito')) {
						return 'aws-cognito';
					}
					if (id.includes('@aws-sdk/credential-providers')) {
						return 'aws-credentials';
					}
					if (id.includes('@aws-sdk')) {
						return 'aws-sdk-core';
					}
					// Milkdown editor in separate chunk
					if (id.includes('@milkdown')) {
						return 'milkdown';
					}
					// Polyfills in separate chunk
					if (id.includes('crypto-browserify') || 
						id.includes('buffer') || 
						id.includes('readable-stream') ||
						id.includes('process/browser') ||
						id.includes('path-browserify') ||
						id.includes('os-browserify')) {
						return 'polyfills';
					}
					// Other vendor libraries
					if (id.includes('node_modules')) {
						return 'vendor';
					}
				},
				// Optimize chunk sizes and ensure relative paths for S3
				chunkFileNames: `assets/[name]-[hash].js`,
				entryFileNames: `assets/[name]-[hash].js`,
				assetFileNames: `assets/[name]-[hash].[ext]`,
				// Ensure proper format for static hosting
				format: 'es',
				// Generate relative imports for better S3 compatibility
				generatedCode: {
					constBindings: true
				}
			},
			// Enhanced external configuration for static hosting
			external: (id) => {
				// Externalize Node.js specific modules that shouldn't be bundled
				if (id.includes('@smithy/node-http-handler') || 
					id.includes('@aws-sdk/node-http-handler') ||
					id.includes('@smithy/hash-node') ||
					id.includes('@aws-sdk/hash-node')) {
					return true;
				}
				return false;
			},
			// Ensure proper import resolution for static files
			preserveEntrySignatures: 'strict'
		},
		// Additional optimizations
		assetsInlineLimit: 4096, // Inline small assets
		chunkSizeWarningLimit: 1000, // Warn for chunks larger than 1MB
		// Ensure proper asset handling for S3
		assetsDir: 'assets',
		emptyOutDir: true,
		// Enhanced static hosting configuration
		cssCodeSplit: true, // Split CSS for better caching
		reportCompressedSize: false // Disable for faster builds
	},
	server: {
		fs: {
			// Allow serving files from one level up to the project root
			allow: ['..']
		}
	},
	// Enhanced esbuild configuration for better browser compatibility
	esbuild: {
		target: 'es2020',
		supported: {
			'top-level-await': false // Disable top-level await for better compatibility
		}
	}
});