<!--
  FileReferenceTracker Component
  Tracks and displays file references across pages
  Shows which pages reference a specific file
-->

<script lang="ts">
  import type { FileInfo, WikiPageMeta } from '$lib/types/index.js';
  import { fileService } from '$lib/services/files.js';
  import { wikiService } from '$lib/services/wiki.js';
  import { createEventDispatcher, onMount } from 'svelte';

  export let file: FileInfo;
  export let showActions: boolean = true;

  const dispatch = createEventDispatcher<{
    deleteFile: { fileId: string };
    navigateToPage: { pagePath: string };
    error: { message: string };
  }>();

  let referencingPages: WikiPageMeta[] = [];
  let loading = true;
  let error: string | null = null;
  let showDeleteConfirm = false;
  let isDeleting = false;

  // Load file references on mount
  onMount(async () => {
    await loadReferences();
  });

  // Load pages that reference this file
  async function loadReferences() {
    try {
      loading = true;
      error = null;
      referencingPages = await wikiService.getPagesReferencingFile(file.id);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load file references';
      dispatch('error', { message: error });
    } finally {
      loading = false;
    }
  }

  // Handle delete file
  async function handleDeleteFile() {
    if (isDeleting) return;
    
    try {
      isDeleting = true;
      await fileService.deleteFile(file.id);
      dispatch('deleteFile', { fileId: file.id });
      showDeleteConfirm = false;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete file';
      dispatch('error', { message });
    } finally {
      isDeleting = false;
    }
  }

  // Handle navigate to page
  function handleNavigateToPage(pagePath: string) {
    dispatch('navigateToPage', { pagePath });
  }

  // Format file size
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Format date
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  }

  // Get reference status
  $: isOrphaned = referencingPages.length === 0;
  $: referenceCount = referencingPages.length;
</script>

<div class="file-reference-tracker">
  <!-- File info header -->
  <div class="file-header">
    <div class="file-info">
      <h3 class="file-name">{file.filename}</h3>
      <div class="file-meta">
        <span class="file-size">{formatFileSize(file.size)}</span>
        <span class="separator">•</span>
        <span class="file-type">{file.contentType}</span>
        <span class="separator">•</span>
        <span class="upload-date">Uploaded {formatDate(file.uploadedAt)}</span>
      </div>
    </div>
    
    {#if showActions}
      <div class="file-actions">
        <a 
          href={file.url} 
          download={file.filename}
          class="download-btn"
          title="Download file"
        >
          ⬇️ Download
        </a>
        <button 
          class="delete-btn"
          on:click={() => showDeleteConfirm = true}
          title="Delete file"
        >
          🗑️ Delete
        </button>
      </div>
    {/if}
  </div>

  <!-- Reference status -->
  <div class="reference-status" class:orphaned={isOrphaned}>
    {#if loading}
      <div class="loading">
        <div class="spinner"></div>
        <span>Checking file references...</span>
      </div>
    {:else if error}
      <div class="error">
        <span class="error-icon">⚠️</span>
        <span>Error: {error}</span>
        <button on:click={loadReferences} class="retry-btn">Retry</button>
      </div>
    {:else if isOrphaned}
      <div class="orphaned-status">
        <span class="status-icon">🗑️</span>
        <div class="status-text">
          <strong>Orphaned File</strong>
          <p>This file is not referenced by any pages and can be safely deleted.</p>
        </div>
      </div>
    {:else}
      <div class="referenced-status">
        <span class="status-icon">🔗</span>
        <div class="status-text">
          <strong>Referenced File</strong>
          <p>This file is referenced by {referenceCount} page{referenceCount !== 1 ? 's' : ''}.</p>
        </div>
      </div>
    {/if}
  </div>

  <!-- Referencing pages list -->
  {#if !loading && !error && referenceCount > 0}
    <div class="referencing-pages">
      <h4>Referenced by:</h4>
      <ul class="page-list">
        {#each referencingPages as page}
          <li class="page-item">
            <button 
              class="page-link"
              on:click={() => handleNavigateToPage(page.path)}
              title="Navigate to {page.title}"
            >
              <span class="page-title">{page.title}</span>
              <span class="page-path">{page.path}</span>
            </button>
            <span class="page-date">{formatDate(page.updatedAt)}</span>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
</div>

{#if showDeleteConfirm}
  <!-- Delete confirmation modal -->
  <div class="modal-overlay" on:click={() => showDeleteConfirm = false}>
    <div class="modal" on:click|stopPropagation>
      <h3>Delete File</h3>
      <p>Are you sure you want to delete <strong>{file.filename}</strong>?</p>
      
      {#if referenceCount > 0}
        <div class="warning">
          <p><strong>Warning:</strong> This file is referenced by {referenceCount} page{referenceCount !== 1 ? 's' : ''}:</p>
          <ul>
            {#each referencingPages as page}
              <li>{page.title} ({page.path})</li>
            {/each}
          </ul>
          <p>Deleting this file will break these references and may cause broken links or missing images.</p>
        </div>
      {:else}
        <p class="safe-delete">This file is not referenced by any pages and can be safely deleted.</p>
      {/if}

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
          on:click={handleDeleteFile}
          disabled={isDeleting}
        >
          {#if isDeleting}
            Deleting...
          {:else}
            Delete File
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .file-reference-tracker {
    background: #ffffff;
    border: 1px solid #e1e5e9;
    border-radius: 8px;
    padding: 20px;
    margin: 16px 0;
  }

  .file-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e1e5e9;
  }

  .file-info {
    flex: 1;
  }

  .file-name {
    margin: 0 0 8px 0;
    color: #24292e;
    font-size: 1.3em;
    font-weight: 600;
    word-break: break-all;
  }

  .file-meta {
    color: #586069;
    font-size: 0.9em;
  }

  .separator {
    margin: 0 8px;
  }

  .file-actions {
    display: flex;
    gap: 8px;
    flex-shrink: 0;
  }

  .download-btn,
  .delete-btn {
    padding: 8px 12px;
    border-radius: 4px;
    text-decoration: none;
    font-size: 0.9em;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .download-btn {
    background: #0366d6;
    color: white;
    border: 1px solid #0366d6;
  }

  .download-btn:hover {
    background: #0256cc;
    text-decoration: none;
  }

  .delete-btn {
    background: none;
    color: #d73a49;
    border: 1px solid #d73a49;
  }

  .delete-btn:hover {
    background: #d73a49;
    color: white;
  }

  .reference-status {
    padding: 16px;
    border-radius: 6px;
    margin-bottom: 20px;
  }

  .reference-status.orphaned {
    background-color: #fff3cd;
    border: 1px solid #ffeaa7;
  }

  .reference-status:not(.orphaned) {
    background-color: #e6f3ff;
    border: 1px solid #b3d9ff;
  }

  .loading,
  .error,
  .orphaned-status,
  .referenced-status {
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .status-icon {
    font-size: 1.5em;
    flex-shrink: 0;
  }

  .status-text {
    flex: 1;
  }

  .status-text strong {
    display: block;
    margin-bottom: 4px;
    color: #24292e;
  }

  .status-text p {
    margin: 0;
    color: #586069;
    font-size: 0.9em;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 2px solid #e1e5e9;
    border-top: 2px solid #0366d6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .error {
    color: #d73a49;
  }

  .retry-btn {
    margin-left: 8px;
    padding: 4px 8px;
    background: #d73a49;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8em;
  }

  .retry-btn:hover {
    background: #b31d28;
  }

  .referencing-pages h4 {
    margin: 0 0 12px 0;
    color: #24292e;
    font-size: 1.1em;
  }

  .page-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .page-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    border: 1px solid #e1e5e9;
    border-radius: 6px;
    margin-bottom: 8px;
    background: #f6f8fa;
    transition: background-color 0.2s ease;
  }

  .page-item:hover {
    background: #e1e4e8;
  }

  .page-link {
    flex: 1;
    background: none;
    border: none;
    text-align: left;
    cursor: pointer;
    padding: 0;
    color: #0366d6;
  }

  .page-link:hover {
    text-decoration: underline;
  }

  .page-title {
    display: block;
    font-weight: 500;
    margin-bottom: 2px;
  }

  .page-path {
    display: block;
    font-size: 0.8em;
    color: #586069;
  }

  .page-date {
    font-size: 0.8em;
    color: #586069;
    white-space: nowrap;
    margin-left: 12px;
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

  .warning {
    background-color: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 4px;
    padding: 12px;
    margin: 16px 0;
  }

  .warning p {
    margin: 0 0 8px 0;
  }

  .warning ul {
    margin: 8px 0;
    padding-left: 20px;
  }

  .safe-delete {
    color: #28a745;
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
    .file-header {
      flex-direction: column;
      gap: 16px;
    }

    .file-actions {
      align-self: stretch;
    }

    .download-btn,
    .delete-btn {
      flex: 1;
      text-align: center;
    }

    .page-item {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }

    .page-date {
      margin-left: 0;
    }
  }
</style>