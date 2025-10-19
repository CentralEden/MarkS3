<script lang="ts">
	import { onMount } from 'svelte';
	import Navigation from '$lib/components/common/Navigation.svelte';
	import Footer from '$lib/components/common/Footer.svelte';
	import AppInitializer from '$lib/components/common/AppInitializer.svelte';
	import type { InitializationResult } from '$lib/services/appInitialization.js';

	// Application state
	let appInitialized = false;
	let initializationError: string | null = null;
	let initResult: InitializationResult | null = null;

	function handleInitialized(event: CustomEvent<InitializationResult>) {
		initResult = event.detail;
		appInitialized = true;
		
		// Log warnings if any
		if (initResult.warnings && initResult.warnings.length > 0) {
			console.warn('Application initialized with warnings:', initResult.warnings);
		}
	}

	function handleInitializationError(event: CustomEvent<{ error: string }>) {
		initializationError = event.detail.error;
		console.error('Application initialization failed:', initializationError);
	}
</script>

{#if !appInitialized && !initializationError}
	<!-- Show initialization screen -->
	<AppInitializer 
		on:initialized={handleInitialized}
		on:error={handleInitializationError}
	/>
{:else if initializationError}
	<!-- Show error state -->
	<div class="app-error">
		<div class="error-container">
			<h1>Application Error</h1>
			<p>{initializationError}</p>
			<button on:click={() => window.location.reload()}>
				Reload Application
			</button>
		</div>
	</div>
{:else}
	<!-- Show main application -->
	<div class="app-layout">
		<!-- Navigation Header -->
		<header class="app-header">
			<div class="main-nav">
				<div class="nav-brand">
					<a href="/" class="brand-link">
						<span class="brand-icon">📚</span>
						{initResult?.config?.title || 'MarkS3 Wiki'}
					</a>
				</div>
				
				<Navigation />
			</div>
		</header>

		<!-- Main Content -->
		<main class="app-main">
			<slot />
		</main>

		<!-- Footer -->
		<Footer />
	</div>
{/if}

<style>
	.app-layout {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.app-header {
		background: var(--bg-primary, #ffffff);
		border-bottom: 1px solid var(--border-color, #e1e5e9);
		padding: 0 1rem;
	}

	.main-nav {
		display: flex;
		align-items: center;
		justify-content: space-between;
		max-width: 1200px;
		margin: 0 auto;
		height: 60px;
	}

	.nav-brand {
		display: flex;
		align-items: center;
	}

	.brand-link {
		display: flex;
		align-items: center;
		gap: 8px;
		text-decoration: none;
		color: var(--text-primary, #2d3748);
		font-size: 20px;
		font-weight: 700;
	}

	.brand-icon {
		font-size: 24px;
	}



	.app-main {
		flex: 1;
		padding: 1rem;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	.app-error {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #f7fafc;
		padding: 20px;
	}

	.error-container {
		background: white;
		border-radius: 12px;
		padding: 40px;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
		text-align: center;
		max-width: 500px;
		width: 100%;
	}

	.error-container h1 {
		margin: 0 0 16px 0;
		font-size: 24px;
		color: #e53e3e;
	}

	.error-container p {
		margin: 0 0 24px 0;
		color: #718096;
		line-height: 1.6;
	}

	.error-container button {
		padding: 12px 24px;
		background: #3182ce;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.error-container button:hover {
		background: #2c5aa0;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.main-nav {
			flex-direction: column;
			height: auto;
			padding: 12px 0;
			gap: 16px;
		}

		.brand-link {
			font-size: 18px;
		}

		.brand-icon {
			font-size: 20px;
		}
	}
</style>