<script lang="ts">
	import { page } from '$app/stores';
	import { authStore, isAuthenticated, isAdmin } from '$lib/stores/auth.js';

	// Current route
	$: currentRoute = $page.route.id;
</script>

<div class="app-layout">
	<!-- Navigation Header -->
	<header class="app-header">
		<nav class="main-nav">
			<div class="nav-brand">
				<a href="/" class="brand-link">
					<span class="brand-icon">📚</span>
					MarkS3 Wiki
				</a>
			</div>
			
			{#if $isAuthenticated}
				<div class="nav-links">
					<a 
						href="/" 
						class="nav-link"
						class:active={currentRoute === '/'}
					>
						ホーム
					</a>
					<a 
						href="/browse" 
						class="nav-link"
						class:active={currentRoute === '/browse'}
					>
						ページ一覧
					</a>
					<a 
						href="/edit" 
						class="nav-link"
						class:active={currentRoute === '/edit'}
					>
						編集
					</a>
					{#if $isAdmin}
						<a 
							href="/admin" 
							class="nav-link admin-link"
							class:active={currentRoute === '/admin'}
						>
							管理
						</a>
					{/if}
				</div>
			{/if}
		</nav>
	</header>

	<!-- Main Content -->
	<main class="app-main">
		<slot />
	</main>
</div>

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

	.nav-links {
		display: flex;
		gap: 24px;
	}

	.nav-link {
		text-decoration: none;
		color: var(--text-secondary, #718096);
		font-weight: 500;
		padding: 8px 12px;
		border-radius: 6px;
		transition: all 0.2s ease;
	}

	.nav-link:hover {
		color: var(--text-primary, #2d3748);
		background: var(--bg-hover, #f7fafc);
	}

	.nav-link.active {
		color: var(--primary-color, #3182ce);
		background: var(--primary-light, #ebf8ff);
	}

	.admin-link {
		color: var(--warning-color, #d69e2e);
	}

	.admin-link:hover {
		color: var(--warning-dark, #b7791f);
		background: var(--warning-light, #faf5e6);
	}

	.admin-link.active {
		color: var(--warning-dark, #b7791f);
		background: var(--warning-light, #faf5e6);
	}

	.app-main {
		flex: 1;
		padding: 1rem;
		max-width: 1200px;
		margin: 0 auto;
		width: 100%;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.main-nav {
			flex-direction: column;
			height: auto;
			padding: 12px 0;
			gap: 12px;
		}

		.nav-links {
			gap: 16px;
		}

		.nav-link {
			padding: 6px 10px;
			font-size: 14px;
		}

		.brand-link {
			font-size: 18px;
		}

		.brand-icon {
			font-size: 20px;
		}
	}
</style>