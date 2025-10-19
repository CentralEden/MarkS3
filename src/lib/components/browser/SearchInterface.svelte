<!--
  Search Interface Component
  Provides search functionality with filtering and results display
-->
<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { wikiService } from '../../services/wiki.js';
  import { authStore, canRead } from '../../stores/auth.js';
  import type { WikiPageMeta } from '../../types/index.js';
  import { WikiError } from '../../types/index.js';

  // Props
  export let placeholder: string = 'ページを検索...';
  export let folderFilter: string = ''; // Filter search to specific folder
  export let showFilters: boolean = true;
  export let maxResults: number = 50;

  // Events
  const dispatch = createEventDispatcher<{
    select: string;
    navigate: string;
  }>();

  // State
  let searchQuery = '';
  let searchResults: WikiPageMeta[] = [];
  let allTags: string[] = [];
  let selectedTags: string[] = [];
  let sortBy: 'relevance' | 'date' | 'title' = 'relevance';
  let isSearching = false;
  let searchError: string | null = null;
  let showAdvanced = false;
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  // Search input element reference
  let searchInput: HTMLInputElement;

  // Debounced search function
  function debouncedSearch() {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    searchTimeout = setTimeout(() => {
      performSearch();
    }, 300);
  }

  // Perform search
  async function performSearch() {
    if (!$canRead) {
      searchError = 'You do not have permission to search pages';
      return;
    }

    if (!searchQuery.trim() && selectedTags.length === 0) {
      searchResults = [];
      searchError = null;
      return;
    }

    try {
      isSearching = true;
      searchError = null;

      let results: WikiPageMeta[] = [];

      // Perform text search if query exists
      if (searchQuery.trim()) {
        if (folderFilter) {
          results = await wikiService.searchPagesInFolder(searchQuery, folderFilter);
        } else {
          results = await wikiService.searchPages(searchQuery);
        }
      } else {
        // If no text query, get all pages for tag filtering
        results = await wikiService.searchPages('');
      }

      // Apply tag filters
      if (selectedTags.length > 0) {
        results = results.filter(page => 
          page.tags && selectedTags.every(tag => 
            page.tags!.some(pageTag => 
              pageTag.toLowerCase().includes(tag.toLowerCase())
            )
          )
        );
      }

      // Apply sorting
      results = sortResults(results);

      // Limit results
      searchResults = results.slice(0, maxResults);

    } catch (error) {
      console.error('Search failed:', error);
      searchError = error instanceof WikiError ? error.message : 'Search failed';
      searchResults = [];
    } finally {
      isSearching = false;
    }
  }

  // Sort search results
  function sortResults(results: WikiPageMeta[]): WikiPageMeta[] {
    switch (sortBy) {
      case 'date':
        return results.sort((a, b) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      case 'title':
        return results.sort((a, b) => a.title.localeCompare(b.title));
      case 'relevance':
      default:
        // Results from wikiService.searchPages are already sorted by relevance
        return results;
    }
  }

  // Load all available tags
  async function loadTags() {
    try {
      allTags = await wikiService.getAllTags();
    } catch (error) {
      console.warn('Failed to load tags:', error);
      allTags = [];
    }
  }

  // Handle tag selection
  function toggleTag(tag: string) {
    if (selectedTags.includes(tag)) {
      selectedTags = selectedTags.filter(t => t !== tag);
    } else {
      selectedTags = [...selectedTags, tag];
    }
    performSearch();
  }

  // Clear all filters
  function clearFilters() {
    searchQuery = '';
    selectedTags = [];
    searchResults = [];
    searchError = null;
    if (searchInput) {
      searchInput.focus();
    }
  }

  // Handle page selection
  function selectPage(path: string) {
    dispatch('select', path);
  }

  // Handle navigation
  function navigateToPage(path: string) {
    dispatch('navigate', path);
  }

  // Format date for display
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(new Date(date));
  }

  // Highlight search terms in text
  function highlightText(text: string, query: string): string {
    if (!query.trim()) return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
  }

  // Handle keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      clearFilters();
    } else if (event.key === 'Enter' && searchResults.length > 0) {
      selectPage(searchResults[0].path);
    }
  }

  // Initialize on mount
  onMount(() => {
    loadTags();
    if (searchInput) {
      searchInput.focus();
    }
  });

  // Reactive statements
  $: if (searchQuery !== undefined) {
    debouncedSearch();
  }

  $: if (sortBy) {
    if (searchResults.length > 0) {
      searchResults = sortResults([...searchResults]);
    }
  }
</script>

<div class="search-interface">
  <!-- Search Input -->
  <div class="search-input-container">
    <div class="search-input-wrapper">
      <span class="search-icon">🔍</span>
      <input
        bind:this={searchInput}
        bind:value={searchQuery}
        type="text"
        class="search-input"
        {placeholder}
        on:keydown={handleKeydown}
        disabled={!$canRead}
      />
      {#if searchQuery || selectedTags.length > 0}
        <button 
          class="clear-btn"
          on:click={clearFilters}
          title="クリア"
        >
          ✕
        </button>
      {/if}
    </div>
    
    {#if isSearching}
      <div class="search-loading">
        <span class="spinner"></span>
      </div>
    {/if}
  </div>

  <!-- Advanced Filters -->
  {#if showFilters}
    <div class="filters-section">
      <button 
        class="toggle-advanced"
        class:active={showAdvanced}
        on:click={() => showAdvanced = !showAdvanced}
      >
        <span class="toggle-icon" class:rotated={showAdvanced}>▶</span>
        詳細フィルター
      </button>

      {#if showAdvanced}
        <div class="advanced-filters">
          <!-- Sort Options -->
          <div class="filter-group">
            <label class="filter-label">並び順:</label>
            <select bind:value={sortBy} class="sort-select">
              <option value="relevance">関連度</option>
              <option value="date">更新日</option>
              <option value="title">タイトル</option>
            </select>
          </div>

          <!-- Tag Filters -->
          {#if allTags.length > 0}
            <div class="filter-group">
              <label class="filter-label">タグ:</label>
              <div class="tag-filters">
                {#each allTags as tag}
                  <button
                    class="tag-filter"
                    class:selected={selectedTags.includes(tag)}
                    on:click={() => toggleTag(tag)}
                  >
                    {tag}
                  </button>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Search Results -->
  <div class="search-results">
    {#if searchError}
      <div class="search-error">
        <span class="error-icon">⚠️</span>
        {searchError}
      </div>
    {:else if searchQuery.trim() || selectedTags.length > 0}
      {#if searchResults.length === 0 && !isSearching}
        <div class="no-results">
          <span class="no-results-icon">🔍</span>
          検索結果が見つかりませんでした
        </div>
      {:else}
        <div class="results-header">
          <span class="results-count">
            {searchResults.length}件の結果
            {#if searchResults.length === maxResults}
              (最大{maxResults}件まで表示)
            {/if}
          </span>
        </div>

        <div class="results-list">
          {#each searchResults as result}
            <div 
              class="result-item"
              on:click={() => selectPage(result.path)}
              on:keydown={(e) => e.key === 'Enter' && selectPage(result.path)}
              role="button"
              tabindex="0"
            >
              <div class="result-header">
                <h4 class="result-title">
                  {@html highlightText(result.title, searchQuery)}
                </h4>
                <span class="result-path">{result.path}</span>
              </div>
              
              <div class="result-meta">
                <span class="meta-item">
                  <span class="meta-icon">👤</span>
                  {result.author}
                </span>
                <span class="meta-item">
                  <span class="meta-icon">🕒</span>
                  {formatDate(result.updatedAt)}
                </span>
                {#if result.tags && result.tags.length > 0}
                  <div class="result-tags">
                    {#each result.tags.slice(0, 3) as tag}
                      <span class="result-tag">{tag}</span>
                    {/each}
                    {#if result.tags.length > 3}
                      <span class="tag-more">+{result.tags.length - 3}</span>
                    {/if}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}
  </div>
</div>

<style>
  .search-interface {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .search-input-container {
    position: relative;
  }

  .search-input-wrapper {
    display: flex;
    align-items: center;
    background: var(--bg-primary, #ffffff);
    border: 2px solid var(--border-color, #e1e5e9);
    border-radius: 8px;
    padding: 0 12px;
    transition: border-color 0.2s ease;
  }

  .search-input-wrapper:focus-within {
    border-color: var(--primary-color, #3182ce);
    box-shadow: 0 0 0 3px var(--primary-light, #ebf8ff);
  }

  .search-icon {
    font-size: 16px;
    color: var(--text-secondary, #718096);
    margin-right: 8px;
  }

  .search-input {
    flex: 1;
    border: none;
    outline: none;
    padding: 12px 0;
    font-size: 16px;
    color: var(--text-primary, #2d3748);
    background: transparent;
  }

  .search-input::placeholder {
    color: var(--text-secondary, #718096);
  }

  .search-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .clear-btn {
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: var(--text-secondary, #718096);
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .clear-btn:hover {
    background: var(--bg-hover, #f7fafc);
    color: var(--text-primary, #2d3748);
  }

  .search-loading {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
  }

  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid var(--border-color, #e1e5e9);
    border-radius: 50%;
    border-top-color: var(--primary-color, #3182ce);
    animation: spin 1s ease-in-out infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .filters-section {
    background: var(--bg-secondary, #f8f9fa);
    border: 1px solid var(--border-color, #e1e5e9);
    border-radius: 6px;
    padding: 12px;
  }

  .toggle-advanced {
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    padding: 4px 0;
    cursor: pointer;
    color: var(--text-primary, #2d3748);
    font-size: 14px;
    font-weight: 500;
  }

  .toggle-icon {
    font-size: 10px;
    transition: transform 0.2s ease;
  }

  .toggle-icon.rotated {
    transform: rotate(90deg);
  }

  .advanced-filters {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .filter-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary, #2d3748);
    min-width: 60px;
  }

  .sort-select {
    padding: 4px 8px;
    border: 1px solid var(--border-color, #e1e5e9);
    border-radius: 4px;
    background: var(--bg-primary, #ffffff);
    color: var(--text-primary, #2d3748);
    font-size: 14px;
  }

  .tag-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tag-filter {
    background: var(--bg-primary, #ffffff);
    border: 1px solid var(--border-color, #e1e5e9);
    border-radius: 16px;
    padding: 4px 12px;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: var(--text-secondary, #718096);
  }

  .tag-filter:hover {
    background: var(--bg-hover, #f7fafc);
    border-color: var(--primary-color, #3182ce);
  }

  .tag-filter.selected {
    background: var(--primary-color, #3182ce);
    border-color: var(--primary-color, #3182ce);
    color: white;
  }

  .search-results {
    min-height: 100px;
  }

  .search-error {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background: var(--error-light, #fed7d7);
    border: 1px solid var(--error-color, #e53e3e);
    border-radius: 6px;
    color: var(--error-dark, #c53030);
  }

  .no-results {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 32px 16px;
    color: var(--text-secondary, #718096);
    text-align: center;
  }

  .no-results-icon {
    font-size: 24px;
    opacity: 0.5;
  }

  .results-header {
    padding: 8px 0;
    border-bottom: 1px solid var(--border-color, #e1e5e9);
    margin-bottom: 8px;
  }

  .results-count {
    font-size: 14px;
    color: var(--text-secondary, #718096);
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .result-item {
    background: var(--bg-primary, #ffffff);
    border: 1px solid var(--border-color, #e1e5e9);
    border-radius: 6px;
    padding: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .result-item:hover {
    background: var(--bg-hover, #f7fafc);
    border-color: var(--primary-color, #3182ce);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .result-header {
    margin-bottom: 8px;
  }

  .result-title {
    margin: 0 0 4px 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary, #2d3748);
    line-height: 1.4;
  }

  .result-title :global(mark) {
    background: var(--highlight-color, #fef5e7);
    color: var(--highlight-text, #744210);
    padding: 1px 2px;
    border-radius: 2px;
  }

  .result-path {
    font-size: 12px;
    color: var(--text-secondary, #718096);
    font-family: monospace;
  }

  .result-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--text-secondary, #718096);
  }

  .meta-icon {
    font-size: 10px;
    opacity: 0.7;
  }

  .result-tags {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .result-tag {
    background: var(--tag-bg, #edf2f7);
    color: var(--tag-text, #4a5568);
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 500;
  }

  .tag-more {
    color: var(--text-tertiary, #a0aec0);
    font-size: 10px;
    font-style: italic;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .filter-group {
      flex-direction: column;
      align-items: flex-start;
    }

    .filter-label {
      min-width: auto;
    }

    .result-meta {
      flex-direction: column;
      align-items: flex-start;
      gap: 6px;
    }
  }
</style>