<!--
  Page Browser Component
  Displays wiki pages in a hierarchical tree structure with metadata
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { wikiService } from '../../services/wiki.js';
  import { authStore, canRead } from '../../stores/auth.js';
  import type { PageNode, WikiPageMeta } from '../../types/index.js';
  import { WikiError } from '../../types/index.js';

  // Props
  export let selectedPath: string | null = null;
  export let onPageSelect: ((path: string) => void) | null = null;

  // State
  let pageHierarchy: PageNode[] = [];
  let expandedFolders = new Set<string>();
  let loading = true;
  let error: string | null = null;
  let pageMetadata = new Map<string, WikiPageMeta>();

  // Load page hierarchy and metadata
  async function loadPageHierarchy() {
    if (!$canRead) {
      error = 'You do not have permission to view pages';
      loading = false;
      return;
    }

    try {
      loading = true;
      error = null;

      // Load hierarchy
      pageHierarchy = await wikiService.getPageHierarchy();

      // Load metadata for all pages
      const allPages = await wikiService.searchPages(''); // Get all pages
      pageMetadata.clear();
      allPages.forEach(page => {
        pageMetadata.set(page.path, page);
      });

      // Auto-expand root level folders
      pageHierarchy.forEach(node => {
        if (node.isFolder) {
          expandedFolders.add(node.path);
        }
      });

      expandedFolders = expandedFolders; // Trigger reactivity
    } catch (err) {
      console.error('Failed to load page hierarchy:', err);
      error = err instanceof WikiError ? err.message : 'Failed to load pages';
    } finally {
      loading = false;
    }
  }

  // Toggle folder expansion
  function toggleFolder(folderPath: string) {
    if (expandedFolders.has(folderPath)) {
      expandedFolders.delete(folderPath);
    } else {
      expandedFolders.add(folderPath);
    }
    expandedFolders = expandedFolders; // Trigger reactivity
  }

  // Handle page selection
  function selectPage(path: string) {
    selectedPath = path;
    if (onPageSelect) {
      onPageSelect(path);
    }
  }

  // Format date for display
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  // Get page metadata
  function getPageMeta(path: string): WikiPageMeta | null {
    return pageMetadata.get(path) || null;
  }

  // Recursive component for rendering tree nodes
  function renderTreeNode(node: PageNode, depth: number = 0): any {
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedPath === node.path;
    const meta = getPageMeta(node.path);
    
    return {
      node,
      depth,
      isExpanded,
      isSelected,
      meta,
      hasChildren: node.children && node.children.length > 0
    };
  }

  // Initialize on mount
  onMount(() => {
    loadPageHierarchy();
  });

  // Reactive statement to reload when auth changes
  $: if ($canRead !== undefined) {
    loadPageHierarchy();
  }
</script>

<div class="page-browser">
  <div class="browser-header">
    <h3>ページ一覧</h3>
    <button 
      class="refresh-btn" 
      on:click={loadPageHierarchy}
      disabled={loading}
      title="更新"
    >
      <span class="icon">🔄</span>
    </button>
  </div>

  {#if loading}
    <div class="loading">
      <span class="spinner"></span>
      ページを読み込み中...
    </div>
  {:else if error}
    <div class="error">
      <span class="icon">⚠️</span>
      {error}
      <button class="retry-btn" on:click={loadPageHierarchy}>
        再試行
      </button>
    </div>
  {:else if pageHierarchy.length === 0}
    <div class="empty">
      <span class="icon">📄</span>
      ページがありません
    </div>
  {:else}
    <div class="tree-container">
      {#each pageHierarchy as node}
        <TreeNode 
          {node} 
          depth={0}
          {expandedFolders}
          {selectedPath}
          {pageMetadata}
          on:toggle={(e) => toggleFolder(e.detail)}
          on:select={(e) => selectPage(e.detail)}
        />
      {/each}
    </div>
  {/if}
</div>

<!-- Tree Node Component -->
<script lang="ts" context="module">
  import { createEventDispatcher } from 'svelte';
</script>

<!-- Recursive Tree Node Component -->
{#if false}
<div class="tree-node-placeholder">
  <!-- This is just for TypeScript, actual component is below -->
</div>
{/if}

<style>
  .page-browser {
    height: 100%;
    display: flex;
    flex-direction: column;
    background: var(--bg-secondary, #f8f9fa);
    border: 1px solid var(--border-color, #e1e5e9);
    border-radius: 8px;
    overflow: hidden;
  }

  .browser-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: var(--bg-primary, #ffffff);
    border-bottom: 1px solid var(--border-color, #e1e5e9);
  }

  .browser-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary, #2d3748);
  }

  .refresh-btn {
    background: none;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--text-secondary, #718096);
    transition: all 0.2s ease;
  }

  .refresh-btn:hover:not(:disabled) {
    background: var(--bg-hover, #f7fafc);
    color: var(--text-primary, #2d3748);
  }

  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .loading, .error, .empty {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 12px;
    padding: 32px 16px;
    text-align: center;
    color: var(--text-secondary, #718096);
  }

  .error {
    color: var(--error-color, #e53e3e);
  }

  .retry-btn {
    background: var(--primary-color, #3182ce);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s ease;
  }

  .retry-btn:hover {
    background: var(--primary-hover, #2c5aa0);
  }

  .tree-container {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .spinner {
    display: inline-block;
    width: 20px;
    height: 20px;
    border: 2px solid var(--border-color, #e1e5e9);
    border-radius: 50%;
    border-top-color: var(--primary-color, #3182ce);
    animation: spin 1s ease-in-out infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .icon {
    font-size: 18px;
  }
</style>