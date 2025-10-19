<!--
  Browse Pages Route
  Displays the page browser interface for navigating wiki pages
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { PageBrowserLayout } from '$lib/components/browser/index.js';
  import { authStore, canRead } from '$lib/stores/auth.js';

  // State
  let currentPath = '';
  let loading = true;

  // Handle page selection
  function handlePageSelect(event: CustomEvent<string>) {
    const path = event.detail;
    // Navigate to edit page for the selected page
    goto(`/edit?path=${encodeURIComponent(path)}`);
  }

  // Handle navigation (for breadcrumb clicks)
  function handleNavigate(event: CustomEvent<string>) {
    const path = event.detail;
    if (path) {
      // Update current path for breadcrumb display
      currentPath = path;
    } else {
      // Navigate to home
      goto('/');
    }
  }

  // Initialize
  onMount(() => {
    // Get current path from URL params if available
    const urlPath = $page.url.searchParams.get('path');
    if (urlPath) {
      currentPath = urlPath;
    }
    loading = false;
  });
</script>

<svelte:head>
  <title>ページ一覧 - MarkS3 Wiki</title>
  <meta name="description" content="Wiki pages browser and search interface" />
</svelte:head>

<div class="browse-page">
  <div class="page-header">
    <h1>ページ一覧</h1>
    <p class="page-description">
      Wikiページを階層構造で閲覧したり、検索機能を使って目的のページを見つけることができます。
    </p>
  </div>

  {#if loading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <p>読み込み中...</p>
    </div>
  {:else if !$canRead}
    <div class="access-denied">
      <div class="access-icon">🔒</div>
      <h2>アクセスが制限されています</h2>
      <p>ページを閲覧するにはログインが必要です。</p>
      <button 
        class="login-btn"
        on:click={() => goto('/')}
      >
        ログインページに戻る
      </button>
    </div>
  {:else}
    <div class="browser-container">
      <PageBrowserLayout
        {currentPath}
        showSearch={true}
        showBreadcrumb={true}
        layout="vertical"
        on:pageSelect={handlePageSelect}
        on:navigate={handleNavigate}
      />
    </div>
  {/if}
</div>

<style>
  .browse-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    min-height: calc(100vh - 120px);
  }

  .page-header {
    margin-bottom: 24px;
    text-align: center;
  }

  .page-header h1 {
    margin: 0 0 8px 0;
    font-size: 32px;
    font-weight: 700;
    color: var(--text-primary, #2d3748);
  }

  .page-description {
    margin: 0;
    font-size: 16px;
    color: var(--text-secondary, #718096);
    line-height: 1.6;
  }

  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    gap: 16px;
  }

  .loading-spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--border-color, #e1e5e9);
    border-radius: 50%;
    border-top-color: var(--primary-color, #3182ce);
    animation: spin 1s ease-in-out infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .loading-container p {
    margin: 0;
    color: var(--text-secondary, #718096);
    font-size: 16px;
  }

  .access-denied {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    gap: 16px;
  }

  .access-icon {
    font-size: 48px;
    opacity: 0.6;
  }

  .access-denied h2 {
    margin: 0;
    font-size: 24px;
    color: var(--text-primary, #2d3748);
  }

  .access-denied p {
    margin: 0;
    font-size: 16px;
    color: var(--text-secondary, #718096);
    max-width: 400px;
    line-height: 1.6;
  }

  .login-btn {
    background: var(--primary-color, #3182ce);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 6px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .login-btn:hover {
    background: var(--primary-hover, #2c5aa0);
  }

  .browser-container {
    height: 600px;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .browse-page {
      padding: 16px;
    }

    .page-header h1 {
      font-size: 28px;
    }

    .page-description {
      font-size: 14px;
    }

    .browser-container {
      height: 500px;
    }

    .access-denied {
      padding: 40px 16px;
    }

    .access-denied h2 {
      font-size: 20px;
    }

    .access-denied p {
      font-size: 14px;
    }
  }

  @media (max-width: 480px) {
    .browser-container {
      height: 400px;
    }

    .page-header h1 {
      font-size: 24px;
    }
  }
</style>