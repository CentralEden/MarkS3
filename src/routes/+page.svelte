<script lang="ts">
	import { goto } from '$app/navigation';
	import AuthGuard from '../lib/components/auth/AuthGuard.svelte';
	import { canWrite } from '../lib/stores/auth.js';

	function createNewPage() {
		goto('/edit');
	}

	function editExistingPage() {
		// For demo purposes, let's create a sample page path
		goto('/edit?path=sample-page.md');
	}
</script>

<svelte:head>
	<title>MarkS3 - Serverless Markdown Wiki</title>
	<meta name="description" content="A serverless markdown wiki system hosted on AWS S3" />
</svelte:head>

<AuthGuard allowGuestAccess={true}>
	<div slot="default" let:user let:isGuestMode>
		<section>
			<h1>Welcome to MarkS3</h1>
			<p>A serverless markdown wiki system hosted on AWS S3 with Cognito authentication.</p>
			
			<div class="features">
				<div class="feature-card">
					<h3>📝 Rich Markdown Editing</h3>
					<p>Create and edit pages with our powerful Milkdown editor featuring real-time preview.</p>
				</div>
				
				<div class="feature-card">
					<h3>🔐 Secure Authentication</h3>
					<p>Role-based access control with AWS Cognito integration.</p>
				</div>
				
				<div class="feature-card">
					<h3>🚀 Serverless Architecture</h3>
					<p>No backend servers needed - runs entirely on AWS S3 and Cognito.</p>
				</div>
			</div>

			{#if $canWrite}
				<div class="actions">
					<h2>Quick Actions</h2>
					<div class="action-buttons">
						<button class="primary-button" on:click={createNewPage}>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
								<polyline points="14,2 14,8 20,8"/>
								<line x1="16" y1="13" x2="8" y2="13"/>
								<line x1="16" y1="17" x2="8" y2="17"/>
								<polyline points="10,9 9,9 8,9"/>
							</svg>
							Create New Page
						</button>
						
						<button class="secondary-button" on:click={editExistingPage}>
							<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
								<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
								<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
							</svg>
							Edit Sample Page
						</button>
					</div>
				</div>
			{:else if isGuestMode}
				<div class="guest-info">
					<p>You're browsing as a guest. Sign in to create and edit pages.</p>
				</div>
			{:else if !user}
				<div class="auth-info">
					<p>Sign in to start creating and editing wiki pages.</p>
				</div>
			{/if}

			<div class="status">
				<h2>Implementation Status</h2>
				<div class="status-grid">
					<div class="status-item completed">
						<span class="status-icon">✅</span>
						<span>Authentication System</span>
					</div>
					<div class="status-item completed">
						<span class="status-icon">✅</span>
						<span>S3 Storage Service</span>
					</div>
					<div class="status-item completed">
						<span class="status-icon">✅</span>
						<span>Wiki Page Management</span>
					</div>
					<div class="status-item completed">
						<span class="status-icon">✅</span>
						<span>Milkdown Editor</span>
					</div>
					<div class="status-item pending">
						<span class="status-icon">⏳</span>
						<span>File Management</span>
					</div>
					<div class="status-item pending">
						<span class="status-icon">⏳</span>
						<span>Page Browser</span>
					</div>
				</div>
			</div>
		</section>
	</div>
</AuthGuard>

<style>
	section {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	h1 {
		text-align: center;
		font-size: 3rem;
		font-weight: 700;
		color: #1f2937;
		margin-bottom: 1rem;
	}

	section > p {
		text-align: center;
		font-size: 1.25rem;
		color: #6b7280;
		margin-bottom: 3rem;
	}

	.features {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 2rem;
		margin-bottom: 3rem;
	}

	.feature-card {
		background: white;
		padding: 2rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		text-align: center;
	}

	.feature-card h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 1rem;
	}

	.feature-card p {
		color: #6b7280;
		line-height: 1.6;
		margin: 0;
	}

	.actions {
		background: white;
		padding: 2rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		margin-bottom: 3rem;
	}

	.actions h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.action-buttons {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.primary-button,
	.secondary-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.875rem 1.5rem;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
		text-decoration: none;
	}

	.primary-button {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
	}

	.primary-button:hover {
		transform: translateY(-2px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
	}

	.secondary-button {
		background: white;
		color: #374151;
		border: 1px solid #d1d5db;
	}

	.secondary-button:hover {
		background: #f9fafb;
		border-color: #9ca3af;
	}

	.guest-info,
	.auth-info {
		background: #fef3c7;
		border: 1px solid #f59e0b;
		color: #92400e;
		padding: 1rem;
		border-radius: 8px;
		text-align: center;
		margin-bottom: 3rem;
	}

	.guest-info p,
	.auth-info p {
		margin: 0;
	}

	.status {
		background: white;
		padding: 2rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.status h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.status-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.status-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: 8px;
		transition: background-color 0.2s;
	}

	.status-item.completed {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
	}

	.status-item.pending {
		background: #fefce8;
		border: 1px solid #fde047;
	}

	.status-icon {
		font-size: 1.25rem;
	}

	.status-item span:last-child {
		font-weight: 500;
		color: #374151;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		section {
			padding: 1rem;
		}

		h1 {
			font-size: 2.5rem;
		}

		.features {
			grid-template-columns: 1fr;
			gap: 1.5rem;
		}

		.feature-card,
		.actions,
		.status {
			padding: 1.5rem;
		}

		.action-buttons {
			flex-direction: column;
			align-items: center;
		}

		.primary-button,
		.secondary-button {
			width: 100%;
			max-width: 300px;
			justify-content: center;
		}

		.status-grid {
			grid-template-columns: 1fr;
		}
	}
</style>