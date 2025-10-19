<!--
  Breadcrumb Navigation Component
  Shows hierarchical navigation path with clickable segments
-->
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  // Props
  export let currentPath: string = '';
  export let rootLabel: string = 'ホーム';
  export let separator: string = '/';

  // Events
  const dispatch = createEventDispatcher<{
    navigate: string;
  }>();

  // Computed breadcrumb segments
  $: breadcrumbSegments = getBreadcrumbSegments(currentPath);

  /**
   * Generate breadcrumb segments from current path
   */
  function getBreadcrumbSegments(path: string) {
    if (!path || path === '' || path === '/') {
      return [{ label: rootLabel, path: '', isRoot: true }];
    }

    const segments = [];
    
    // Add root segment
    segments.push({ label: rootLabel, path: '', isRoot: true });

    // Split path and build segments
    const pathParts = path.split('/').filter(part => part.length > 0);
    let currentSegmentPath = '';

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      currentSegmentPath = currentSegmentPath ? `${currentSegmentPath}/${part}` : part;
      
      // For the last segment (current page), remove .md extension if present
      let label = part;
      const isLastSegment = i === pathParts.length - 1;
      
      if (isLastSegment && part.endsWith('.md')) {
        label = part.replace(/\.md$/, '');
      }
      
      // Format label (replace hyphens/underscores with spaces, capitalize)
      label = formatSegmentLabel(label);

      segments.push({
        label,
        path: currentSegmentPath,
        isRoot: false,
        isCurrent: isLastSegment
      });
    }

    return segments;
  }

  /**
   * Format segment label for display
   */
  function formatSegmentLabel(label: string): string {
    return label
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Handle navigation to a breadcrumb segment
   */
  function navigateToSegment(segmentPath: string) {
    dispatch('navigate', segmentPath);
  }

  /**
   * Handle keyboard navigation
   */
  function handleKeydown(event: KeyboardEvent, segmentPath: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      navigateToSegment(segmentPath);
    }
  }
</script>

<nav class="breadcrumb" aria-label="パンくずナビゲーション">
  <ol class="breadcrumb-list">
    {#each breadcrumbSegments as segment, index}
      <li class="breadcrumb-item" class:current={segment.isCurrent}>
        {#if segment.isCurrent}
          <!-- Current page - not clickable -->
          <span class="breadcrumb-current" aria-current="page">
            <span class="segment-icon">
              {segment.isRoot ? '🏠' : '📄'}
            </span>
            {segment.label}
          </span>
        {:else}
          <!-- Clickable breadcrumb segment -->
          <button
            class="breadcrumb-link"
            class:root={segment.isRoot}
            on:click={() => navigateToSegment(segment.path)}
            on:keydown={(e) => handleKeydown(e, segment.path)}
            title={segment.isRoot ? 'ホームに戻る' : `${segment.label}に移動`}
          >
            <span class="segment-icon">
              {segment.isRoot ? '🏠' : '📁'}
            </span>
            {segment.label}
          </button>
        {/if}

        <!-- Separator -->
        {#if index < breadcrumbSegments.length - 1}
          <span class="breadcrumb-separator" aria-hidden="true">
            {separator}
          </span>
        {/if}
      </li>
    {/each}
  </ol>
</nav>

<style>
  .breadcrumb {
    background: var(--bg-secondary, #f8f9fa);
    border: 1px solid var(--border-color, #e1e5e9);
    border-radius: 6px;
    padding: 8px 12px;
    margin-bottom: 16px;
    overflow-x: auto;
    white-space: nowrap;
  }

  .breadcrumb-list {
    display: flex;
    align-items: center;
    margin: 0;
    padding: 0;
    list-style: none;
    gap: 4px;
  }

  .breadcrumb-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .breadcrumb-link {
    display: flex;
    align-items: center;
    gap: 4px;
    background: none;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    color: var(--primary-color, #3182ce);
    font-size: 14px;
    text-decoration: none;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .breadcrumb-link:hover {
    background: var(--primary-light, #ebf8ff);
    color: var(--primary-dark, #2c5aa0);
  }

  .breadcrumb-link:focus {
    outline: 2px solid var(--primary-color, #3182ce);
    outline-offset: 2px;
  }

  .breadcrumb-link.root {
    font-weight: 600;
  }

  .breadcrumb-current {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    color: var(--text-primary, #2d3748);
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;
  }

  .breadcrumb-separator {
    color: var(--text-secondary, #718096);
    font-size: 12px;
    margin: 0 2px;
    user-select: none;
  }

  .segment-icon {
    font-size: 12px;
    opacity: 0.8;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .breadcrumb {
      padding: 6px 8px;
      margin-bottom: 12px;
    }

    .breadcrumb-link,
    .breadcrumb-current {
      font-size: 13px;
      padding: 3px 6px;
    }

    .segment-icon {
      font-size: 11px;
    }

    .breadcrumb-separator {
      font-size: 11px;
    }
  }

  /* Scrollbar styling for horizontal overflow */
  .breadcrumb::-webkit-scrollbar {
    height: 4px;
  }

  .breadcrumb::-webkit-scrollbar-track {
    background: var(--bg-tertiary, #edf2f7);
    border-radius: 2px;
  }

  .breadcrumb::-webkit-scrollbar-thumb {
    background: var(--border-color, #e1e5e9);
    border-radius: 2px;
  }

  .breadcrumb::-webkit-scrollbar-thumb:hover {
    background: var(--text-secondary, #718096);
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .breadcrumb {
      border-width: 2px;
    }

    .breadcrumb-link:focus {
      outline-width: 3px;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .breadcrumb-link {
      transition: none;
    }
  }
</style>