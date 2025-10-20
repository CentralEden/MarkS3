import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { visualizer } from 'rollup-plugin-visualizer';
import { analyzer } from 'vite-bundle-analyzer';

export default defineConfig({
	plugins: [
		sveltekit(),
		// Bundle analyzer for development
		process.env.ANALYZE && analyzer({
			analyzerMode: 'server',
			analyzerPort: 8888,
			openAnalyzer: true,
		}),
		// Bundle visualizer for production builds
		process.env.NODE_ENV === 'production' && visualizer({
			filename: 'dist/bundle-analysis.html',
			open: false,
			gzipSize: true,
			brotliSize: true,
			template: 'treemap', // 'treemap', 'sunburst', 'network'
		}),
	].filter(Boolean),
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}']
	},
	// Configure base URL for S3 hosting - use relative paths
	base: '',
	define: {
		global: 'globalThis',
		// Define process for AWS SDK compatibility - use more compatible approach
		'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
		'process.browser': true,
		// Additional Node.js compatibility defines
		'__dirname': JSON.stringify('/'),
		'__filename': JSON.stringify('/')
	},
	resolve: {
		alias: {
			// Enhanced polyfills for Node.js modules in browser
			stream: 'readable-stream',
			'node:stream': 'readable-stream',
			'stream/web': 'readable-stream',
			'stream/promises': 'readable-stream',
			crypto: 'crypto-browserify',
			'node:crypto': 'crypto-browserify',
			buffer: 'buffer',
			'node:buffer': 'buffer',
			process: 'process',
			'node:process': 'process',
			'process/browser': 'process',
			'process/browser/': 'process',
			util: 'util',
			'node:util': 'util',
			events: 'events',
			'node:events': 'events',
			// Additional comprehensive polyfills for AWS SDK
			path: 'path-browserify',
			'node:path': 'path-browserify',
			os: 'os-browserify/browser',
			'node:os': 'os-browserify/browser',
			url: 'url',
			'node:url': 'url',
			querystring: 'querystring-es3',
			'node:querystring': 'querystring-es3',
			assert: 'assert',
			'node:assert': 'assert',
			vm: 'vm-browserify',
			'node:vm': 'vm-browserify',
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
			async_hooks: resolve('./src/lib/polyfills/empty.js'),
			'node:async_hooks': resolve('./src/lib/polyfills/empty.js'),
			child_process: resolve('./src/lib/polyfills/child_process.js'),
			'node:child_process': resolve('./src/lib/polyfills/child_process.js'),
			// Redirect Node.js specific AWS SDK modules to empty modules
			'@aws-sdk/node-http-handler': resolve('./src/lib/polyfills/empty.js'),
			'@aws-sdk/hash-node': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/hash-node': resolve('./src/lib/polyfills/empty.js'),
			'@aws-sdk/credential-provider-node': resolve('./src/lib/polyfills/empty.js'),
			'@aws-sdk/credential-provider-ini': resolve('./src/lib/polyfills/empty.js'),
			'@aws-sdk/credential-provider-process': resolve('./src/lib/polyfills/empty.js'),
			'@aws-sdk/credential-provider-sso': resolve('./src/lib/polyfills/empty.js'),
			'@aws-sdk/credential-provider-ec2': resolve('./src/lib/polyfills/empty.js'),
			'@aws-sdk/credential-provider-ecs': resolve('./src/lib/polyfills/empty.js'),
			'@aws-sdk/credential-provider-env': resolve('./src/lib/polyfills/empty.js'),
			// Additional Smithy Node.js modules that need to be excluded
			'@smithy/node-config-provider': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/credential-provider-imds': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/shared-ini-file-loader': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/property-provider': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/abort-controller': resolve('./src/lib/polyfills/empty.js'),
			// Additional comprehensive Smithy Node.js exclusions
			'@smithy/config-resolver': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/credential-provider-env': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/credential-provider-process': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/credential-provider-sso': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/credential-provider-web-identity': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/node-http-handler': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/util-config-provider': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/util-credentials': resolve('./src/lib/polyfills/empty.js'),
			// Additional Smithy modules that might be problematic
			'@smithy/util-defaults-mode-node': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/util-defaults-mode-browser': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/util-user-agent-node': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/util-user-agent-browser': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/middleware-user-agent': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/middleware-retry': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/util-retry': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/service-error-classification': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/util-body-length-node': resolve('./src/lib/polyfills/empty.js'),
			'@smithy/util-body-length-browser': resolve('./src/lib/polyfills/empty.js')
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
			// Smithy browser-compatible modules
			'@smithy/fetch-http-handler',
			'@smithy/protocol-http',
			'@smithy/types',
			// Essential polyfills for Node.js APIs
			'buffer',
			'process/browser',
			'readable-stream',
			'crypto-browserify',
			'util',
			'events',
			'path-browserify',
			'os-browserify/browser',
			'url',
			'querystring-es3',
			'assert',
			'vm-browserify'
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
			// Exclude all Smithy Node.js specific modules
			'@smithy/node-http-handler',
			'@smithy/hash-node',
			'@smithy/node-config-provider',
			'@smithy/credential-provider-imds',
			'@smithy/shared-ini-file-loader',
			'@smithy/property-provider',
			'@smithy/abort-controller',
			'@smithy/config-resolver',
			'@smithy/credential-provider-env',
			'@smithy/credential-provider-process',
			'@smithy/credential-provider-sso',
			'@smithy/credential-provider-web-identity',
			'@smithy/util-config-provider',
			'@smithy/util-credentials'
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
				// Enhanced manual chunking strategy for optimal code splitting
				manualChunks: (id) => {
					// Skip Node.js specific modules entirely
					if (id.includes('@smithy/node-http-handler') || 
						id.includes('@aws-sdk/node-http-handler') ||
						id.includes('@smithy/hash-node') ||
						id.includes('@aws-sdk/hash-node') ||
						id.includes('@smithy/node-config-provider') ||
						id.includes('@smithy/credential-provider-imds') ||
						id.includes('@smithy/shared-ini-file-loader') ||
						id.includes('@smithy/property-provider') ||
						id.includes('@smithy/abort-controller') ||
						id.includes('@smithy/config-resolver') ||
						id.includes('@smithy/credential-provider-env') ||
						id.includes('@smithy/credential-provider-process') ||
						id.includes('@smithy/credential-provider-sso') ||
						id.includes('@smithy/credential-provider-web-identity') ||
						id.includes('@smithy/util-config-provider') ||
						id.includes('@smithy/util-credentials')) {
						return undefined;
					}
					
					// AWS SDK - Split into logical chunks for better caching
					if (id.includes('@aws-sdk/client-s3')) {
						return 'aws-s3';
					}
					if (id.includes('@aws-sdk/client-cognito-identity-provider')) {
						return 'aws-cognito-idp';
					}
					if (id.includes('@aws-sdk/client-cognito-identity')) {
						return 'aws-cognito-identity';
					}
					if (id.includes('@aws-sdk/credential-providers')) {
						return 'aws-credentials';
					}
					if (id.includes('@aws-sdk')) {
						return 'aws-sdk-core';
					}
					
					// Milkdown editor - Heavy component, separate chunk
					if (id.includes('@milkdown')) {
						return 'milkdown';
					}
					
					// DOMPurify - Security library, separate chunk
					if (id.includes('dompurify')) {
						return 'security';
					}
					
					// Polyfills - Group all browser compatibility code
					if (id.includes('crypto-browserify') || 
						id.includes('buffer') || 
						id.includes('readable-stream') ||
						id.includes('process/browser') ||
						id.includes('path-browserify') ||
						id.includes('os-browserify') ||
						id.includes('assert') ||
						id.includes('vm-browserify') ||
						id.includes('querystring-es3') ||
						id.includes('util') ||
						id.includes('events') ||
						id.includes('url')) {
						return 'polyfills';
					}
					
					// Component-based chunking for better lazy loading
					if (id.includes('src/lib/components/admin')) {
						return 'admin-components';
					}
					if (id.includes('src/lib/components/editor')) {
						return 'editor-components';
					}
					if (id.includes('src/lib/components/files')) {
						return 'file-components';
					}
					if (id.includes('src/lib/components/browser')) {
						return 'browser-components';
					}
					
					// Service-based chunking
					if (id.includes('src/lib/services/userManagement') || 
						id.includes('src/lib/services/configManagement')) {
						return 'admin-services';
					}
					if (id.includes('src/lib/services/files')) {
						return 'file-services';
					}
					if (id.includes('src/lib/services/auth') || 
						id.includes('src/lib/services/s3')) {
						return 'core-services';
					}
					
					// Other vendor libraries - keep smaller chunks
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
				const nodeSpecificModules = [
					'@smithy/node-http-handler',
					'@aws-sdk/node-http-handler',
					'@smithy/hash-node',
					'@aws-sdk/hash-node',
					'@aws-sdk/credential-provider-node',
					'@aws-sdk/credential-provider-ini',
					'@aws-sdk/credential-provider-process',
					'@aws-sdk/credential-provider-sso',
					'@aws-sdk/credential-provider-ec2',
					'@aws-sdk/credential-provider-ecs',
					'@aws-sdk/credential-provider-env',
					// Additional Smithy Node.js modules
					'@smithy/node-config-provider',
					'@smithy/credential-provider-imds',
					'@smithy/shared-ini-file-loader',
					'@smithy/property-provider',
					'@smithy/abort-controller',
					'@smithy/config-resolver',
					'@smithy/credential-provider-env',
					'@smithy/credential-provider-process',
					'@smithy/credential-provider-sso',
					'@smithy/credential-provider-web-identity',
					'@smithy/util-config-provider',
					'@smithy/util-credentials'
				];
				
				return nodeSpecificModules.some(module => id.includes(module));
			},
			// Ensure proper import resolution for static files
			preserveEntrySignatures: 'strict'
		},
		// Additional optimizations for performance
		assetsInlineLimit: 4096, // Inline small assets
		chunkSizeWarningLimit: 500, // Warn for chunks larger than 500KB (more aggressive)
		// Ensure proper asset handling for S3
		assetsDir: 'assets',
		emptyOutDir: true,
		// Enhanced static hosting configuration
		cssCodeSplit: true, // Split CSS for better caching
		reportCompressedSize: false, // Disable for faster builds
		// Optimize for better code splitting
		modulePreload: {
			polyfill: true, // Enable module preload polyfill
		},
		// Enhanced asset optimization
		assetsInclude: ['**/*.md'], // Include markdown files as assets
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