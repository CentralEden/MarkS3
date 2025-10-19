<!--
  Page Browser Layout Component
  Combines all browser components into a unified interface
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import PageBrowser from './PageBrowser.svelte';
  import SearchInterface from './SearchInterface.svelte';
  import Breadcrumb from './Breadcrumb.svelte';
  import { authStore, canRead } from '../../stores/auth.js';

  // Props
  export let currentPath: string = '';
  export let showSearch: boolean = true;
  export let showBreadcrumb: boolean = true;
  export let layout: 'vertical' | 'horizontal' = 'vertical';

  // Events
  const dispatch = createEventDispatcher<{
    pageSelect: string;
    navigate: string;
  }>();

  // State
  let selectedPath: string | null = currentPath || null;
  let searchMode = false;

  // Handle page selection from browser
  function handlePageSelect(path: string) {
    selectedPath = path;
    searchMode = false; // Exit search mode when page is selected
    dispatch('pageSelect', path);
  }

  // Handle page selection from search
  function handleSearchSelect(event: CustomEvent<string>) {
    const path = event.detail;
    selectedPath = path;
    searchMode = false;
    dispatch('pageSelect', path);
  }

  // Handle navigation from breadcrumb
  function handleBreadcrumbNavigate(event: CustomEvent<string>) {
    const path = event.detail;
    selectedPath = path;
    dispatch('navigate', path);
  }

  // Handle navigation from search
  function handleSearchNavigate(event: CustomEvent<string>) {
    const path = event.detail;
    dispatch('navigate', path);
  }

  // Toggle search mode
  function toggleSearchMode() {
    searchMode = !searchMode;
  }

  // Update selected path when currentPath prop changes
  $: if (currentPath !== selectedPath) {
    selectedPath = currentPath;
  }
</script>

<div class="page-browser-layout" class:horizontal={layout === 'horizontal'}>
  <!-- Header Section -->
  <div class="browser-header">
    {#if showBreadcrumb && selectedPath}
      <Breadcrumb 
        currentPath={selectedPath}
        on:navigate={handleBreadcrumbNavigate}
      />
    {/if}

    {#if showSearch && $canRead}
      <div class="search-toggle-container">
        <button 
          class="search-toggle"
          class:active={searchMode}
          on:click={toggleSearchMode}
          title={searchMode ? '検索を閉じる' : '検索を開く'}
        >
          <span class="search-icon">{searchMode ? '✕' : '🔍'}</span>
          {searchMode ? '閉じる' : '検索'}
        </button>
      </div>
    {/if}
  </div>

  <!-- Main Content -->
  <div class="browser-content">
    {#if searchMode && showSearch}
      <!-- Search Interface -->
      <div class="search-panel">
        <SearchInterface
          on:select={handleSearchSelect}
          on:navigate={handleSearchNavigate}
        />
      </div>
    {:else}
      <!-- Page Browser -->
      <div class="browser-panel">
        <PageBrowser
          {selectedPath}
          onPageSelect={handlePageSelect}
        />
      </div>
    {/if}
  </div>

  <!-- Footer/Status -->
  {#if !$canRead}
    <div class="access-notice">
      <span class="notice-icon">🔒</span>
      ページを閲覧するにはログインが必要です
    </div>
  {/if}
</div>

<style>
  .page-browser-layout {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-primary, #ffffff);
    border: 1px solid var(--border-color, #e1e5e9);
    border-radius: 8px;
    overflow: hidden;
  }

  .page-browser-layout.horizontal {
    flex-direction: row;
  }

  .browser-header {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: var(--bg-secondary, #f8f9fa);
    border-bottom: 1px solid var(--border-color, #e1e5e9);
  }

  .horizontal .browser-header {
    min-width: 300px;
    border-bottom: none;
    border-right: 1px solid var(--border-color, #e1e5e9);
  }

  .search-toggle-container {
    display: flex;
    justify-content: flex-end;
  }

  .search-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--bg-primary, #ffffff);
    border: 1px solid var(--border-color, #e1e5e9);
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 14px;
    color: var(--text-primary, #2d3748);
    transition: all 0.2s ease;
  }

  .search-toggle:hover {
    background: var(--bg-hover, #f7fafc);
    border-color: var(--primary-color, #3182ce);
  }

  .search-toggle.active {
    background: var(--primary-color, #3182ce);
    border-color: var(--primary-color, #3182ce);
    color: white;
  }

  .search-icon {
    font-size: 12px;
  }

  .browser-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .search-panel,
  .browser-panel {
    flex: 1;
    overflow: hidden;
    padding: 12px;
  }

  .search-panel {
    background: var(--bg-secondary, #f8f9fa);
  }

  .access-notice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: var(--warning-light, #fef5e7);
    border-top: 1px solid var(--warning-color, #d69e2e);
    color: var(--warning-dark, #744210);
    font-size: 14px;
    text-align: center;
  }

  .notice-icon {
    font-size: 16px;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .page-browser-layout.horizontal {
      flex-direction: column;
    }

    .horizontal .browser-header {
      min-width: auto;
      border-right: none;
      border-bottom: 1px solid var(--border-color, #e1e5e9);
    }

    .browser-header {
      padding: 8px;
    }

    .search-panel,
    .browser-panel {
      padding: 8px;
    }

    .search-toggle {
      padding: 4px 8px;
      font-size: 13px;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .page-browser-layout {
      border-width: 2px;
    }

    .search-toggle {
      border-width: 2px;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .search-toggle {
      transition: none;
    }
  }
</style>