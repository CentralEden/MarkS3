<script lang="ts">
	// Home page - placeholder for now
	// Will be implemented in later tasks
</script>

<svelte:head>
	<title>MarkS3 - Serverless Markdown Wiki</title>
	<meta name="description" content="A serverless markdown wiki system hosted on AWS S3" />
</svelte:head>

<section>
	<h1>Welcome to MarkS3</h1>
	<p>A serverless markdown wiki system hosted on AWS S3 with Cognito authentication.</p>
	
	<div class="placeholder">
		<p>This is a placeholder page. The application will be built incrementally through the implementation tasks.</p>
	</div>
</section>

<style>
	section {
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		flex: 0.6;
	}

	h1 {
		width: 100%;
		text-align: center;
		margin-bottom: 2rem;
	}

	.placeholder {
		background: #f5f5f5;
		padding: 2rem;
		border-radius: 8px;
		margin-top: 2rem;
		text-align: center;
	}
</style>