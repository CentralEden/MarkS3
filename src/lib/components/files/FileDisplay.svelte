<!--
  FileDisplay Component
  Displays a file with appropriate rendering based on file type
  - Images are displayed inline
  - Other files show as download links
-->

<script lang="ts">
  import type { FileInfo } from '$lib/types/index.js';
  import { fileService } from '$lib/services/files.js';
  import { createEventDispatcher } from 'svelte';

  export let file: FileInfo;
  export let showMetadata: boolean = false;
  export let allowDelete: boolean = false;
  export let compact: boolean = false;

  const dispatch = createEventDispatcher<{
    delete: { fileId: string };
    error: { message: string };
  }>();

  let isDeleting = false;
  let showDeleteConfirm = false;
  let referencingPages: string[] = [];
  let loadingReferences = false;

  // Check if file is an image
  $: isImage = fileService.isImageFile(file.filename);

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

  // Handle delete confirmation
  async function handleDeleteClick() {
    if (!allowDelete) return;
    
    try {
      loadingReferences = true;
      referencingPages = await fileService.getFileReferences(file.id);
      showDeleteConfirm = true;
    } catch (error) {
      dispatch('error', { 
        message: `Failed to check file references: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      loadingReferences = false;
    }
  }

  // Confirm delete
  async function confirmDelete() {
    if (isDeleting) return;
    
    try {
      isDeleting = true;
      await fileService.deleteFile(file.id);
      dispatch('delete', { fileId: file.id });
      showDeleteConfirm = false;
    } catch (error) {
      dispatch('error', { 
        message: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    } finally {
      isDeleting = false;
    }
  }

  // Cancel delete
  function cancelDelete() {
    showDeleteConfirm = false;
    referencingPages = [];
  }

  // Handle image load error
  function handleImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.style.display = 'none';
    // Show fallback link instead
    const fallback = img.nextElementSibling as HTMLElement;
    if (fallback) {
      fallback.style.display = 'block';
    }
  }
</script>

<div class="file-display" class:compact>
  {#if isImage}
    <!-- Image display -->
    <div class="image-container">
      <img 
        src={file.url} 
        alt={file.filename}
        loading="lazy"
        on:error={handleImageError}
        class:compact
      />
      <!-- Fallback link (hidden by default) -->
      <a 
        href={file.url} 
        download={file.filename}
        class="fallback-link"
        style="display: none;"
      >
        📎 {file.filename}
      </a>
    </div>
  {:else}
    <!-- Non-image file display -->
    <div class="file-link-container">
      <a 
        href={file.url} 
        download={file.filename}
        class="file-link"
      >
        <span class="file-icon">📎</span>
        <span class="file-name">{file.filename}</span>
      </a>
    </div>
  {/if}

  {#if showMetadata && !compact}
    <!-- File metadata -->
    <div class="file-metadata">
      <div class="metadata-row">
        <span class="label">Size:</span>
        <span class="value">{formatFileSize(file.size)}</span>
      </div>
      <div class="metadata-row">
        <span class="label">Type:</span>
        <span class="value">{file.contentType}</span>
      </div>
      <div class="metadata-row">
        <span class="label">Uploaded:</span>
        <span class="value">{formatDate(file.uploadedAt)}</span>
      </div>
    </div>
  {/if}

  {#if allowDelete}
    <!-- Delete button -->
    <div class="file-actions">
      <button 
        class="delete-btn"
        on:click={handleDeleteClick}
        disabled={loadingReferences}
        title="Delete file"
      >
        {#if loadingReferences}
          ⏳
        {:else}
          🗑️
        {/if}
      </button>
    </div>
  {/if}
</div>

{#if showDeleteConfirm}
  <!-- Delete confirmation modal -->
  <div class="modal-overlay" on:click={cancelDelete}>
    <div class="modal" on:click|stopPropagation>
      <h3>Delete File</h3>
      <p>Are you sure you want to delete <strong>{file.filename}</strong>?</p>
      
      {#if referencingPages.length > 0}
        <div class="warning">
          <p><strong>Warning:</strong> This file is referenced in the following pages:</p>
          <ul>
            {#each referencingPages as pagePath}
              <li>{pagePath}</li>
            {/each}
          </ul>
          <p>Deleting this file will break these references.</p>
        </div>
      {:else}
        <p class="safe-delete">This file is not referenced by any pages and can be safely deleted.</p>
      {/if}

      <div class="modal-actions">
        <button 
          class="cancel-btn"
          on:click={cancelDelete}
          disabled={isDeleting}
        >
          Cancel
        </button>
        <button 
          class="confirm-delete-btn"
          on:click={confirmDelete}
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
  .file-display {
    border: 1px solid #e1e5e9;
    border-radius: 8px;
    padding: 16px;
    margin: 8px 0;
    background: #ffffff;
    transition: box-shadow 0.2s ease;
  }

  .file-display:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .file-display.compact {
    padding: 8px;
    margin: 4px 0;
  }

  .image-container {
    text-align: center;
  }

  .image-container img {
    max-width: 100%;
    max-height: 400px;
    height: auto;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .image-container img.compact {
    max-height: 200px;
  }

  .file-link-container {
    display: flex;
    align-items: center;
  }

  .file-link {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: #0366d6;
    font-weight: 500;
    padding: 8px 12px;
    border-radius: 4px;
    transition: background-color 0.2s ease;
  }

  .file-link:hover {
    background-color: #f6f8fa;
    text-decoration: underline;
  }

  .file-icon {
    margin-right: 8px;
    font-size: 1.2em;
  }

  .file-name {
    word-break: break-all;
  }

  .fallback-link {
    display: block;
    margin-top: 8px;
    padding: 8px 12px;
    background-color: #f6f8fa;
    border-radius: 4px;
    text-decoration: none;
    color: #0366d6;
  }

  .file-metadata {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid #e1e5e9;
    font-size: 0.9em;
    color: #586069;
  }

  .metadata-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .label {
    font-weight: 500;
  }

  .value {
    text-align: right;
  }

  .file-actions {
    margin-top: 12px;
    text-align: right;
  }

  .delete-btn {
    background: none;
    border: 1px solid #d73a49;
    color: #d73a49;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 1.1em;
    transition: all 0.2s ease;
  }

  .delete-btn:hover:not(:disabled) {
    background-color: #d73a49;
    color: white;
  }

  .delete-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
</style>