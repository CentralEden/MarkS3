<!--
  Tree Node Component
  Recursive component for displaying hierarchical page structure
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { PageNode, WikiPageMeta } from '../../types/index.js';

  // Props
  export let node: PageNode;
  export let depth: number = 0;
  export let expandedFolders: Set<string>;
  export let selectedPath: string | null = null;
  export let pageMetadata: Map<string, WikiPageMeta>;

  // Events
  const dispatch = createEventDispatcher<{
    toggle: string;
    select: string;
  }>();

  // Computed properties
  $: isExpanded = expandedFolders.has(node.path);
  $: isSelected = selectedPath === node.path;
  $: hasChildren = node.children && node.children.length > 0;
  $: meta = pageMetadata.get(node.path);

  // Handle folder toggle
  function toggleFolder() {
    if (node.isFolder) {
      dispatch('toggle', node.path);
    }
  }

  // Handle page selection
  function selectPage() {
    if (!node.isFolder) {
      dispatch('select', node.path);
    }
  }

  // Handle click - toggle folder or select page
  function handleClick() {
    if (node.isFolder) {
      toggleFolder();
    } else {
      selectPage();
    }
  }

  // Format date for display
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('ja-JP', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  // Get appropriate icon for node
  function getNodeIcon(node: PageNode, isExpanded: boolean): string {
    if (node.isFolder) {
      return isExpanded ? '📂' : '📁';
    }
    return '📄';
  }

  // Get file extension for styling
  function getFileExtension(path: string): string {
    const parts = path.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }
</script>

<div class="tree-node" style="--depth: {depth}">
  <div 
    class="node-content"
    class:folder={node.isFolder}
    class:file={!node.isFolder}
    class:selected={isSelected}
    class:expanded={isExpanded}
    on:click={handleClick}
    on:keydown={(e) => e.key === 'Enter' && handleClick()}
    role="button"
    tabindex="0"
  >
    <!-- Indentation -->
    <div class="indent" style="width: {depth * 20}px"></div>
    
    <!-- Expand/Collapse Icon -->
    {#if node.isFolder && hasChildren}
      <button 
        class="expand-btn"
        on:click|stopPropagation={toggleFolder}
        aria-label={isExpanded ? '折りたたむ' : '展開する'}
      >
        <span class="expand-icon" class:expanded={isExpanded}>▶</span>
      </button>
    {:else}
      <div class="expand-spacer"></div>
    {/if}

    <!-- Node Icon -->
    <span class="node-icon">
      {getNodeIcon(node, isExpanded)}
    </span>

    <!-- Node Title and Metadata -->
    <div class="node-info">
      <div class="node-title">
        {node.title}
        {#if !node.isFolder && getFileExtension(node.path)}
          <span class="file-ext">.{getFileExtension(node.path)}</span>
        {/if}
      </div>
      
      {#if meta && !node.isFolder}
        <div class="node-meta">
          <span class="meta-item">
            <span class="meta-icon">👤</span>
            {meta.author}
          </span>
          <span class="meta-item">
            <span class="meta-icon">🕒</span>
            {formatDate(meta.updatedAt)}
          </span>
          {#if meta.tags && meta.tags.length > 0}
            <span class="meta-item">
              <span class="meta-icon">🏷️</span>
              {meta.tags.slice(0, 2).join(', ')}
              {#if meta.tags.length > 2}
                <span class="tag-more">+{meta.tags.length - 2}</span>
              {/if}
            </span>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <!-- Children (recursive) -->
  {#if node.isFolder && hasChildren && isExpanded}
    <div class="children">
      {#each node.children as child}
        <svelte:self 
          node={child}
          depth={depth + 1}
          {expandedFolders}
          {selectedPath}
          {pageMetadata}
          on:toggle
          on:select
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .tree-node {
    user-select: none;
  }

  .node-content {
    display: flex;
    align-items: flex-start;
    padding: 4px 8px;
    margin: 1px 0;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s ease;
    min-height: 32px;
  }

  .node-content:hover {
    background: var(--bg-hover, #f7fafc);
  }

  .node-content.selected {
    background: var(--primary-light, #ebf8ff);
    border-left: 3px solid var(--primary-color, #3182ce);
  }

  .node-content.folder {
    font-weight: 500;
  }

  .indent {
    flex-shrink: 0;
  }

  .expand-btn {
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    color: var(--text-secondary, #718096);
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 2px;
    margin-top: 2px;
    flex-shrink: 0;
  }

  .expand-btn:hover {
    background: var(--bg-hover, #f7fafc);
    color: var(--text-primary, #2d3748);
  }

  .expand-icon {
    font-size: 10px;
    transition: transform 0.2s ease;
    display: inline-block;
  }

  .expand-icon.expanded {
    transform: rotate(90deg);
  }

  .expand-spacer {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    margin-top: 2px;
  }

  .node-icon {
    font-size: 16px;
    margin: 0 8px 0 4px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .node-info {
    flex: 1;
    min-width: 0;
  }

  .node-title {
    font-size: 14px;
    color: var(--text-primary, #2d3748);
    line-height: 1.4;
    word-break: break-word;
  }

  .file-ext {
    color: var(--text-secondary, #718096);
    font-size: 12px;
  }

  .node-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 2px;
    font-size: 11px;
    color: var(--text-secondary, #718096);
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 2px;
    white-space: nowrap;
  }

  .meta-icon {
    font-size: 10px;
    opacity: 0.7;
  }

  .tag-more {
    color: var(--text-tertiary, #a0aec0);
    font-style: italic;
  }

  .children {
    margin-left: 0;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .node-meta {
      flex-direction: column;
      gap: 2px;
    }
    
    .meta-item {
      font-size: 10px;
    }
  }
</style>