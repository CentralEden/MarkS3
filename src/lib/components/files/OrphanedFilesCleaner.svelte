<!--
  OrphanedFilesCleaner Component
  Finds and manages orphaned files (files not referenced by any page)
  Provides bulk operations for cleaning up unused files
-->

<script lang="ts">
  import type { FileInfo } from '$lib/types/index.js';
  import { fileService } from '$lib/services/files.js';
  import { createEventDispatcher, onMount } from 'svelte';
  import FileDisplay from './FileDisplay.svelte';

  export let autoLoad: boolean = true;

  const dispatch = createEventDispatcher<{
    filesDeleted: { fileIds: string[] };
    error: { message: string };
  }>();

  let orphanedFiles: FileInfo[] = [];
  let selectedFiles: Set<string> = new Set();
  let loading = false;
  let error: string | null = null;
  let isDeleting = false;
  let showDeleteConfirm = false;
  let usageStats: {
    totalFiles: number;
    totalSize: number;
    imageFiles: number;
    documentFiles: number;
    orphanedFiles: number;
  } | null = null;

  // Load orphaned files on mount if autoLoad is true
  onMount(async () => {
    if (autoLoad) {
      await loadOrphanedFiles();
      await loadUsageStats();
    }
  });

  // Load all orphaned files
  async function loadOrphanedFiles() {
    try {
      loading = true;
      error = null;
      orphanedFiles = await fileService.findAllOrphanedFiles();
      selectedFiles.clear();
      selectedFiles = new Set(); // Trigger reactivity
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load orphaned files';
      dispatch('error', { message: error });
    } finally {
      loading = false;
    }
  }

  // Load file usage statistics
  async function loadUsageStats() {
    try {
      usageStats = await fileService.getFileUsageStats();
    } catch (err) {
      console.warn('Failed to load usage stats:', err);
    }
  }

  // Toggle file selection
  function toggleFileSelection(fileId: string) {
    if (selectedFiles.has(fileId)) {
      selectedFiles.delete(fileId);
    } else {
      selectedFiles.add(fileId);
    }
    selectedFiles = new Set(selectedFiles); // Trigger reactivity
  }

  // Select all files
  function selectAll() {
    selectedFiles = new Set(orphanedFiles.map(f => f.id));
  }

  // Deselect all files
  function deselectAll() {
    selectedFiles.clear();
    selectedFiles = new Set(); // Trigger reactivity
  }

  // Delete selected files
  async function deleteSelectedFiles() {
    if (selectedFiles.size === 0 || isDeleting) return;

    try {
      isDeleting = true;
      const fileIds = Array.from(selectedFiles);
      await fileService.deleteOrphanedFiles(fileIds);
      
      // Remove deleted files from local state
      orphanedFiles = orphanedFiles.filter(f => !fileIds.includes(f.id));
      selectedFiles.clear();
      selectedFiles = new Set(); // Trigger reactivity
      
      // Reload stats
      await loadUsageStats();
      
      dispatch('filesDeleted', { fileIds });
      showDeleteConfirm = false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete files';
      dispatch('error', { message });
    } finally {
      isDeleting = false;
    }
  }

  // Handle individual file deletion
  function handleFileDeleted(event: CustomEvent<{ fileId: string }>) {
    const { fileId } = event.detail;
    orphanedFiles = orphanedFiles.filter(f => f.id !== fileId);
    selectedFiles.delete(fileId);
    selectedFiles = new Set(selectedFiles); // Trigger reactivity
    dispatch('filesDeleted', { fileIds: [fileId] });
  }

  // Handle errors from child components
  function handleError(event: CustomEvent<{ message: string }>) {
    dispatch('error', event.detail);
  }

  // Format file size
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Calculate total size of selected files
  $: selectedTotalSize = orphanedFiles
    .filter(f => selectedFiles.has(f.id))
    .reduce((total, f) => total + f.size, 0);

  // Calculate total size of all orphaned files
  $: orphanedTotalSize = orphanedFiles.reduce((total, f) => total + f.size, 0);
</script>

<div class="orphaned-files-cleaner">
  <!-- Header with stats -->
  <div class="header">
    <div class="title-section">
      <h2>Orphaned Files Cleaner</h2>
      <p class="description">
        Find and remove files that are not referenced by any pages.
      </p>
    </div>
    
    {#if usageStats}
      <div class="stats-grid">
        <div class="stat-item">
          <span class="stat-value">{usageStats.totalFiles}</span>
          <span class="stat-label">Total Files</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{formatFileSize(usageStats.totalSize)}</span>
          <span class="stat-label">Total Size</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{usageStats.orphanedFiles}</span>
          <span class="stat-label">Orphaned</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{formatFileSize(orphanedTotalSize)}</span>
          <span class="stat-label">Orphaned Size</span>
        </div>
      </div>
    {/if}
  </div>

  <!-- Controls -->
  <div class="controls">
    <div class="scan-controls">
      <button 
        class="scan-btn"
        on:click={loadOrphanedFiles}
        disabled={loading}
      >
        {#if loading}
          ⏳ Scanning...
        {:else}
          🔍 Scan for Orphaned Files
        {/if}
      </button>
      
      {#if orphanedFiles.length > 0}
        <span class="scan-result">
          Found {orphanedFiles.length} orphaned file{orphanedFiles.length !== 1 ? 's' : ''}
        </span>
      {/if}
    </div>

    {#if orphanedFiles.length > 0}
      <div class="selection-controls">
        <button 
          class="select-btn"
          on:click={selectAll}
          disabled={selectedFiles.size === orphanedFiles.length}
        >
          Select All
        </button>
        <button 
          class="select-btn"
          on:click={deselectAll}
          disabled={selectedFiles.size === 0}
        >
          Deselect All
        </button>
        
        {#if selectedFiles.size > 0}
          <button 
            class="delete-selected-btn"
            on:click={() => showDeleteConfirm = true}
            disabled={isDeleting}
          >
            🗑️ Delete Selected ({selectedFiles.size})
          </button>
        {/if}
      </div>
    {/if}
  </div>

  <!-- Selected files info -->
  {#if selectedFiles.size > 0}
    <div class="selection-info">
      <p>
        <strong>{selectedFiles.size}</strong> file{selectedFiles.size !== 1 ? 's' : ''} selected
        ({formatFileSize(selectedTotalSize)})
      </p>
    </div>
  {/if}

  <!-- File list -->
  <div class="file-list">
    {#if loading}
      <div class="loading">
        <div class="spinner"></div>
        <p>Scanning for orphaned files...</p>
        <p class="loading-note">This may take a moment for large wikis.</p>
      </div>
    {:else if error}
      <div class="error">
        <p>Error: {error}</p>
        <button on:click={loadOrphanedFiles} class="retry-btn">Retry</button>
      </div>
    {:else if orphanedFiles.length === 0}
      <div class="empty-state">
        <div class="empty-icon">✨</div>
        <h3>No Orphaned Files Found</h3>
        <p>All files are properly referenced by pages. Your wiki is clean!</p>
      </div>
    {:else}
      <div class="orphaned-files-grid">
        {#each orphanedFiles as file (file.id)}
          <div class="file-item" class:selected={selectedFiles.has(file.id)}>
            <label class="file-checkbox">
              <input
                type="checkbox"
                checked={selectedFiles.has(file.id)}
                on:change={() => toggleFileSelection(file.id)}
              />
              <span class="checkmark"></span>
            </label>
            
            <div class="file-content">
              <FileDisplay
                {file}
                showMetadata={true}
                allowDelete={true}
                compact={true}
                on:delete={handleFileDeleted}
                on:error={handleError}
              />
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

{#if showDeleteConfirm}
  <!-- Delete confirmation modal -->
  <div class="modal-overlay" on:click={() => showDeleteConfirm = false}>
    <div class="modal" on:click|stopPropagation>
      <h3>Delete Selected Files</h3>
      <p>
        Are you sure you want to delete <strong>{selectedFiles.size}</strong> 
        orphaned file{selectedFiles.size !== 1 ? 's' : ''}?
      </p>
      
      <div class="delete-summary">
        <p>Total size to be freed: <strong>{formatFileSize(selectedTotalSize)}</strong></p>
        <p class="warning-text">
          ⚠️ This action cannot be undone. The files will be permanently deleted.
        </p>
      </div>

      <div class="modal-actions">
        <button 
          class="cancel-btn"
          on:click={() => showDeleteConfirm = false}
          disabled={isDeleting}
        >
          Cancel
        </button>
        <button 
          class="confirm-delete-btn"
          on:click={deleteSelectedFiles}
          disabled={isDeleting}
        >
          {#if isDeleting}
            Deleting...
          {:else}
            Delete {selectedFiles.size} File{selectedFiles.size !== 1 ? 's' : ''}
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .orphaned-files-cleaner {
    background: #ffffff;
    border-radius: 8px;
    padding: 24px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .header {
    margin-bottom: 24px;
    padding-bottom: 20px;
    border-bottom: 1px solid #e1e5e9;
  }

  .title-section h2 {
    margin: 0 0 8px 0;
    color: #24292e;
    font-size: 1.5em;
  }

  .description {
    margin: 0 0 16px 0;
    color: #586069;
    font-size: 1em;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 16px;
  }

  .stat-item {
    text-align: center;
    padding: 12px;
    background: #f6f8fa;
    border-radius: 6px;
  }

  .stat-value {
    display: block;
    font-size: 1.5em;
    font-weight: 600;
    color: #24292e;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 0.8em;
    color: #586069;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-wrap: wrap;
    gap: 16px;
  }

  .scan-controls {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .scan-btn {
    padding: 10px 16px;
    background: #0366d6;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s ease;
  }

  .scan-btn:hover:not(:disabled) {
    background: #0256cc;
  }

  .scan-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .scan-result {
    color: #28a745;
    font-weight: 500;
  }

  .selection-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .select-btn {
    padding: 6px 12px;
    background: #f6f8fa;
    border: 1px solid #d1d5da;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9em;
    transition: background-color 0.2s ease;
  }

  .select-btn:hover:not(:disabled) {
    background: #e1e4e8;
  }

  .select-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .delete-selected-btn {
    padding: 8px 16px;
    background: #d73a49;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: background-color 0.2s ease;
  }

  .delete-selected-btn:hover:not(:disabled) {
    background: #b31d28;
  }

  .delete-selected-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .selection-info {
    background: #e6f3ff;
    border: 1px solid #b3d9ff;
    border-radius: 6px;
    padding: 12px;
    margin-bottom: 16px;
  }

  .selection-info p {
    margin: 0;
    color: #0366d6;
  }

  .file-list {
    min-height: 200px;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    color: #586069;
  }

  .spinner {
    width: 40px;
    height: 40px;
    border: 4px solid #e1e5e9;
    border-top: 4px solid #0366d6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .loading-note {
    font-size: 0.9em;
    color: #959da5;
    margin-top: 8px;
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
    padding: 60px 20px;
    color: #586069;
  }

  .empty-icon {
    font-size: 4em;
    margin-bottom: 16px;
  }

  .empty-state h3 {
    margin: 0 0 12px 0;
    color: #24292e;
  }

  .empty-state p {
    margin: 0;
    font-size: 1.1em;
  }

  .orphaned-files-grid {
    display: grid;
    gap: 16px;
  }

  .file-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    border: 2px solid #e1e5e9;
    border-radius: 8px;
    background: #fafbfc;
    transition: all 0.2s ease;
  }

  .file-item:hover {
    border-color: #d1d5da;
    background: #f6f8fa;
  }

  .file-item.selected {
    border-color: #0366d6;
    background: #e6f3ff;
  }

  .file-checkbox {
    display: flex;
    align-items: center;
    cursor: pointer;
    margin-top: 8px;
  }

  .file-checkbox input {
    display: none;
  }

  .checkmark {
    width: 20px;
    height: 20px;
    border: 2px solid #d1d5da;
    border-radius: 4px;
    background: white;
    position: relative;
    transition: all 0.2s ease;
  }

  .file-checkbox input:checked + .checkmark {
    background: #0366d6;
    border-color: #0366d6;
  }

  .file-checkbox input:checked + .checkmark::after {
    content: '✓';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-size: 12px;
    font-weight: bold;
  }

  .file-content {
    flex: 1;
    min-width: 0;
  }

  /* Modal styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .modal {
    background: white;
    border-radius: 8px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  }

  .modal h3 {
    margin: 0 0 16px 0;
    color: #24292e;
  }

  .delete-summary {
    background-color: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 4px;
    padding: 16px;
    margin: 16px 0;
  }

  .delete-summary p {
    margin: 0 0 8px 0;
  }

  .delete-summary p:last-child {
    margin-bottom: 0;
  }

  .warning-text {
    color: #856404;
    font-weight: 500;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
  }

  .cancel-btn {
    background: #f6f8fa;
    border: 1px solid #d1d5da;
    color: #24292e;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .cancel-btn:hover:not(:disabled) {
    background-color: #e1e4e8;
  }

  .confirm-delete-btn {
    background: #d73a49;
    border: 1px solid #d73a49;
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .confirm-delete-btn:hover:not(:disabled) {
    background-color: #b31d28;
  }

  .cancel-btn:disabled,
  .confirm-delete-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .controls {
      flex-direction: column;
      align-items: stretch;
    }

    .scan-controls,
    .selection-controls {
      justify-content: center;
    }

    .stats-grid {
      grid-template-columns: repeat(2, 1fr);
    }

    .file-item {
      flex-direction: column;
      gap: 8px;
    }

    .file-checkbox {
      align-self: flex-start;
      margin-top: 0;
    }
  }
</style>