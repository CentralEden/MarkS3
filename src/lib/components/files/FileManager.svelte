<!--
  FileManager Component
  Manages file uploads, displays file list, and handles file operations
-->

<script lang="ts">
  import type { FileInfo } from '$lib/types/index.js';
  import { fileService } from '$lib/services/files.js';
  import { createEventDispatcher, onMount } from 'svelte';
  import FileDisplay from './FileDisplay.svelte';
  import FileUpload from './FileUpload.svelte';

  export let showUpload: boolean = true;
  export let allowDelete: boolean = true;
  export let compact: boolean = false;
  export let filterType: 'all' | 'images' | 'documents' = 'all';

  const dispatch = createEventDispatcher<{
    fileUploaded: { file: FileInfo };
    fileDeleted: { fileId: string };
    error: { message: string };
  }>();

  let files: FileInfo[] = [];
  let filteredFiles: FileInfo[] = [];
  let loading = true;
  let error: string | null = null;
  let searchQuery = '';
  let sortBy: 'name' | 'date' | 'size' | 'type' = 'date';
  let sortOrder: 'asc' | 'desc' = 'desc';
  let showOrphanedOnly = false;
  let orphanedFiles: FileInfo[] = [];
  let loadingOrphaned = false;

  // Load files on mount
  onMount(async () => {
    await loadFiles();
  });

  // Reactive filtering and sorting
  $: {
    let filtered = files;

    // Filter by type
    if (filterType === 'images') {
      filtered = filtered.filter(file => fileService.isImageFile(file.filename));
    } else if (filterType === 'documents') {
      filtered = filtered.filter(file => !fileService.isImageFile(file.filename));
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(file => 
        file.filename.toLowerCase().includes(query) ||
        file.contentType.toLowerCase().includes(query)
      );
    }

    // Filter orphaned files only
    if (showOrphanedOnly) {
      filtered = filtered.filter(file => 
        orphanedFiles.some(orphaned => orphaned.id === file.id)
      );
    }

    // Sort files
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.filename.localeCompare(b.filename);
          break;
        case 'date':
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'type':
          comparison = a.contentType.localeCompare(b.contentType);
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    filteredFiles = filtered;
  }

  // Load all files
  async function loadFiles() {
    try {
      loading = true;
      error = null;
      files = await fileService.listFiles();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load files';
      dispatch('error', { message: error });
    } finally {
      loading = false;
    }
  }

  // Load orphaned files
  async function loadOrphanedFiles() {
    try {
      loadingOrphaned = true;
      orphanedFiles = await fileService.findAllOrphanedFiles();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load orphaned files';
      dispatch('error', { message });
    } finally {
      loadingOrphaned = false;
    }
  }

  // Handle file upload
  function handleFileUploaded(event: CustomEvent<{ file: FileInfo }>) {
    const { file } = event.detail;
    files = [file, ...files]; // Add to beginning of list
    dispatch('fileUploaded', { file });
  }

  // Handle file deletion
  function handleFileDeleted(event: CustomEvent<{ fileId: string }>) {
    const { fileId } = event.detail;
    files = files.filter(f => f.id !== fileId);
    orphanedFiles = orphanedFiles.filter(f => f.id !== fileId);
    dispatch('fileDeleted', { fileId });
  }

  // Handle errors from child components
  function handleError(event: CustomEvent<{ message: string }>) {
    dispatch('error', event.detail);
  }

  // Toggle sort order
  function toggleSort(newSortBy: typeof sortBy) {
    if (sortBy === newSortBy) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = newSortBy;
      sortOrder = 'desc';
    }
  }

  // Toggle orphaned files filter
  async function toggleOrphanedFilter() {
    if (!showOrphanedOnly && orphanedFiles.length === 0) {
      await loadOrphanedFiles();
    }
    showOrphanedOnly = !showOrphanedOnly;
  }

  // Delete all orphaned files
  async function deleteAllOrphaned() {
    if (orphanedFiles.length === 0) return;
    
    const confirmed = confirm(
      `Are you sure you want to delete all ${orphanedFiles.length} orphaned files? This action cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      const orphanedIds = orphanedFiles.map(f => f.id);
      await fileService.deleteOrphanedFiles(orphanedIds);
      
      // Remove from local state
      files = files.filter(f => !orphanedIds.includes(f.id));
      orphanedFiles = [];
      
      dispatch('error', { message: `Successfully deleted ${orphanedIds.length} orphaned files` });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete orphaned files';
      dispatch('error', { message });
    }
  }

  // Format file count
  function getFileCountText(): string {
    const total = files.length;
    const filtered = filteredFiles.length;
    
    if (filtered === total) {
      return `${total} file${total !== 1 ? 's' : ''}`;
    } else {
      return `${filtered} of ${total} file${total !== 1 ? 's' : ''}`;
    }
  }
</script>

<div class="file-manager" class:compact>
  {#if showUpload}
    <!-- File upload section -->
    <div class="upload-section">
      <FileUpload 
        on:uploaded={handleFileUploaded}
        on:error={handleError}
      />
    </div>
  {/if}

  <!-- File management controls -->
  <div class="controls">
    <div class="search-and-filter">
      <!-- Search -->
      <input
        type="text"
        placeholder="Search files..."
        bind:value={searchQuery}
        class="search-input"
      />

      <!-- Type filter -->
      <select bind:value={filterType} class="filter-select">
        <option value="all">All Files</option>
        <option value="images">Images Only</option>
        <option value="documents">Documents Only</option>
      </select>

      <!-- Orphaned files toggle -->
      <button
        class="orphaned-toggle"
        class:active={showOrphanedOnly}
        on:click={toggleOrphanedFilter}
        disabled={loadingOrphaned}
        title="Show only orphaned files (not referenced by any page)"
      >
        {#if loadingOrphaned}
          ⏳
        {:else}
          🗑️ Orphaned
        {/if}
      </button>
    </div>

    <div class="sort-and-actions">
      <!-- Sort controls -->
      <div class="sort-controls">
        <span class="sort-label">Sort by:</span>
        <button 
          class="sort-btn"
          class:active={sortBy === 'name'}
          on:click={() => toggleSort('name')}
        >
          Name {sortBy === 'name' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
        </button>
        <button 
          class="sort-btn"
          class:active={sortBy === 'date'}
          on:click={() => toggleSort('date')}
        >
          Date {sortBy === 'date' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
        </button>
        <button 
          class="sort-btn"
          class:active={sortBy === 'size'}
          on:click={() => toggleSort('size')}
        >
          Size {sortBy === 'size' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
        </button>
      </div>

      <!-- Bulk actions -->
      {#if showOrphanedOnly && orphanedFiles.length > 0}
        <button
          class="delete-all-btn"
          on:click={deleteAllOrphaned}
          title="Delete all orphaned files"
        >
          Delete All Orphaned
        </button>
      {/if}
    </div>
  </div>

  <!-- File count and status -->
  <div class="status-bar">
    <span class="file-count">{getFileCountText()}</span>
    {#if showOrphanedOnly && orphanedFiles.length > 0}
      <span class="orphaned-count">
        {orphanedFiles.length} orphaned file{orphanedFiles.length !== 1 ? 's' : ''}
      </span>
    {/if}
  </div>

  <!-- File list -->
  <div class="file-list">
    {#if loading}
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading files...</p>
      </div>
    {:else if error}
      <div class="error">
        <p>Error: {error}</p>
        <button on:click={loadFiles} class="retry-btn">Retry</button>
      </div>
    {:else if filteredFiles.length === 0}
      <div class="empty-state">
        {#if files.length === 0}
          <p>No files uploaded yet.</p>
          {#if showUpload}
            <p>Upload your first file using the form above.</p>
          {/if}
        {:else if searchQuery.trim()}
          <p>No files match your search: "{searchQuery}"</p>
        {:else if showOrphanedOnly}
          <p>No orphaned files found.</p>
        {:else}
          <p>No files match the current filter.</p>
        {/if}
      </div>
    {:else}
      {#each filteredFiles as file (file.id)}
        <FileDisplay
          {file}
          showMetadata={!compact}
          {allowDelete}
          {compact}
          on:delete={handleFileDeleted}
          on:error={handleError}
        />
      {/each}
    {/if}
  </div>
</div>

<style>
  .file-manager {
    background: #ffffff;
    border-radius: 8px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .file-manager.compact {
    padding: 12px;
  }

  .upload-section {
    margin-bottom: 24px;
    padding-bottom: 24px;
    border-bottom: 1px solid #e1e5e9;
  }

  .controls {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 16px;
  }

  .search-and-filter {
    display: flex;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .search-input {
    flex: 1;
    min-width: 200px;
    padding: 8px 12px;
    border: 1px solid #d1d5da;
    border-radius: 4px;
    font-size: 14px;
  }

  .search-input:focus {
    outline: none;
    border-color: #0366d6;
    box-shadow: 0 0 0 2px rgba(3, 102, 214, 0.1);
  }

  .filter-select {
    padding: 8px 12px;
    border: 1px solid #d1d5da;
    border-radius: 4px;
    background: white;
    font-size: 14px;
  }

  .orphaned-toggle {
    padding: 8px 12px;
    border: 1px solid #d1d5da;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .orphaned-toggle:hover {
    background-color: #f6f8fa;
  }

  .orphaned-toggle.active {
    background-color: #fff3cd;
    border-color: #ffeaa7;
  }

  .orphaned-toggle:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .sort-and-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  }

  .sort-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sort-label {
    font-size: 14px;
    color: #586069;
  }

  .sort-btn {
    padding: 6px 12px;
    border: 1px solid #d1d5da;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 14px;
    transition: all 0.2s ease;
  }

  .sort-btn:hover {
    background-color: #f6f8fa;
  }

  .sort-btn.active {
    background-color: #0366d6;
    color: white;
    border-color: #0366d6;
  }

  .delete-all-btn {
    padding: 8px 16px;
    background-color: #d73a49;
    color: white;
    border: 1px solid #d73a49;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s ease;
  }

  .delete-all-btn:hover {
    background-color: #b31d28;
  }

  .status-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid #e1e5e9;
    margin-bottom: 16px;
    font-size: 14px;
    color: #586069;
  }

  .orphaned-count {
    color: #d73a49;
    font-weight: 500;
  }

  .file-list {
    min-height: 200px;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: #586069;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e1e5e9;
    border-top: 3px solid #0366d6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error {
    text-align: center;
    padding: 40px;
    color: #d73a49;
  }

  .retry-btn {
    margin-top: 12px;
    padding: 8px 16px;
    background-color: #0366d6;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  .retry-btn:hover {
    background-color: #0256cc;
  }

  .empty-state {
    text-align: center;
    padding: 40px;
    color: #586069;
  }

  .empty-state p {
    margin: 8px 0;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .search-and-filter {
      flex-direction: column;
      align-items: stretch;
    }

    .search-input {
      min-width: auto;
    }

    .sort-and-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .sort-controls {
      justify-content: center;
    }
  }
</style>