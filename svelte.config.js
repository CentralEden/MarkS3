import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://kit.svelte.dev/docs/integrations#preprocessors
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Enhanced adapter-static configuration for S3 hosting
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			// SPA fallback for client-side routing
			fallback: 'index.html',
			precompress: false,
			strict: false // Allow dynamic routes for wiki pages
		}),
		
		// Enhanced prerendering for static hosting
		prerender: {
			// Handle HTTP errors gracefully for dynamic content
			handleHttpError: 'warn',
			handleMissingId: 'warn',
			// Prerender static routes only, let dynamic routes be handled by SPA
			entries: [
				'/',
				'/browse',
				'/files',
				'/admin'
			],
			// Don't crawl dynamic routes automatically
			crawl: false
		},

		// Configure paths for S3 hosting
		paths: {
			// Use relative paths for better S3 compatibility
			relative: false,
			base: process.env.NODE_ENV === 'production' ? '' : ''
		},

		// Enhanced service worker configuration for static hosting
		serviceWorker: {
			register: false // Disable service worker for S3 static hosting
		},

		// Configure CSP for S3 hosting
		csp: {
			mode: 'auto',
			directives: {
				'script-src': ['self', 'unsafe-inline', 'unsafe-eval'],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', 'data:', 'https:'],
				'connect-src': ['self', 'https://*.amazonaws.com', 'https://*.amazon.com']
			}
		}
	}
};

export default config;