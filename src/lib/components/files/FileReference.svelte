<!--
  FileReference Component
  Displays file references within markdown content with proper rendering
  Used by the markdown editor to show embedded files
-->

<script lang="ts">
  import type { FileInfo } from '$lib/types/index.js';
  import { fileService } from '$lib/services/files.js';
  import { onMount } from 'svelte';

  export let fileId: string;
  export let filename: string = '';
  export let alt: string = '';
  export let inline: boolean = false;
  export let maxWidth: string = '100%';
  export let maxHeight: string = '400px';

  let file: FileInfo | null = null;
  let loading = true;
  let error: string | null = null;
  let imageLoaded = false;
  let imageError = false;

  // Load file information
  onMount(async () => {
    try {
      loading = true;
      error = null;
      
      // Try to get file info by ID first
      file = await fileService.getFileInfo(fileId);
      
      if (!file) {
        // If not found by ID, try to find by filename
        const allFiles = await fileService.listFiles();
        file = allFiles.find(f => f.filename === filename || f.id === filename) || null;
      }
      
      if (!file) {
        error = `File not found: ${filename || fileId}`;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to load file';
    } finally {
      loading = false;
    }
  });

  // Check if file is an image
  $: isImage = file ? fileService.isImageFile(file.filename) : false;

  // Handle image load
  function handleImageLoad() {
    imageLoaded = true;
    imageError = false;
  }

  // Handle image error
  function handleImageError() {
    imageError = true;
    imageLoaded = false;
  }

  // Format file size
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get file icon based on type
  function getFileIcon(contentType: string): string {
    if (contentType.startsWith('image/')) return '🖼️';
    if (contentType.startsWith('video/')) return '🎥';
    if (contentType.startsWith('audio/')) return '🎵';
    if (contentType.includes('pdf')) return '📄';
    if (contentType.includes('word') || contentType.includes('document')) return '📝';
    if (contentType.includes('spreadsheet') || contentType.includes('excel')) return '📊';
    if (contentType.includes('presentation') || contentType.includes('powerpoint')) return '📽️';
    if (contentType.includes('zip') || contentType.includes('archive')) return '📦';
    if (contentType.includes('text')) return '📃';
    return '📎';
  }
</script>

<div class="file-reference" class:inline>
  {#if loading}
    <!-- Loading state -->
    <div class="loading-placeholder" class:inline>
      <div class="spinner"></div>
      <span>Loading file...</span>
    </div>
  {:else if error}
    <!-- Error state -->
    <div class="error-placeholder" class:inline>
      <span class="error-icon">⚠️</span>
      <span class="error-text">{error}</span>
    </div>
  {:else if file}
    {#if isImage && !imageError}
      <!-- Image display -->
      <div class="image-container" class:inline>
        <img
          src={file.url}
          alt={alt || file.filename}
          style="max-width: {maxWidth}; max-height: {maxHeight};"
          on:load={handleImageLoad}
          on:error={handleImageError}
          class:loaded={imageLoaded}
        />
        {#if !imageLoaded}
          <div class="image-loading">
            <div class="spinner"></div>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Non-image file or image with error -->
      <div class="file-link-container" class:inline>
        <a
          href={file.url}
          download={file.filename}
          class="file-link"
          title="Download {file.filename} ({formatFileSize(file.size)})"
        >
          <span class="file-icon">{getFileIcon(file.contentType)}</span>
          <span class="file-info">
            <span class="file-name">{file.filename}</span>
            {#if !inline}
              <span class="file-meta">
                {formatFileSize(file.size)} • {file.contentType}
              </span>
            {/if}
          </span>
          <span class="download-icon">⬇️</span>
        </a>
      </div>
    {/if}
  {/if}
</div>

<style>
  .file-reference {
    display: block;
    margin: 16px 0;
  }

  .file-reference.inline {
    display: inline-block;
    margin: 0 4px;
    vertical-align: middle;
  }

  .loading-placeholder,
  .error-placeholder {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border: 1px solid #e1e5e9;
    border-radius: 6px;
    background-color: #f6f8fa;
    font-size: 0.9em;
    color: #586069;
  }

  .loading-placeholder.inline,
  .error-placeholder.inline {
    padding: 6px 8px;
    font-size: 0.8em;
  }

  .error-placeholder {
    background-color: #fff5f5;
    border-color: #fed7d7;
    color: #c53030;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid #e1e5e9;
    border-top: 2px solid #0366d6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  .image-container {
    position: relative;
    display: inline-block;
    max-width: 100%;
  }

  .image-container.inline {
    max-width: none;
  }

  .image-container img {
    display: block;
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: opacity 0.3s ease;
    opacity: 0;
  }

  .image-container img.loaded {
    opacity: 1;
  }

  .image-loading {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: rgba(255, 255, 255, 0.9);
    border-radius: 6px;
    padding: 12px;
  }

  .file-link-container {
    display: block;
  }

  .file-link-container.inline {
    display: inline-block;
  }

  .file-link {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid #e1e5e9;
    border-radius: 6px;
    background-color: #ffffff;
    text-decoration: none;
    color: #24292e;
    transition: all 0.2s ease;
  }

  .file-link:hover {
    background-color: #f6f8fa;
    border-color: #0366d6;
    text-decoration: none;
  }

  .file-link-container.inline .file-link {
    padding: 6px 8px;
    gap: 6px;
  }

  .file-icon {
    font-size: 1.5em;
    flex-shrink: 0;
  }

  .file-link-container.inline .file-icon {
    font-size: 1.2em;
  }

  .file-info {
    flex: 1;
    min-width: 0;
  }

  .file-name {
    display: block;
    font-weight: 500;
    word-break: break-all;
    line-height: 1.3;
  }

  .file-meta {
    display: block;
    font-size: 0.8em;
    color: #586069;
    margin-top: 2px;
  }

  .download-icon {
    font-size: 1.2em;
    opacity: 0.6;
    flex-shrink: 0;
  }

  .file-link:hover .download-icon {
    opacity: 1;
  }

  .file-link-container.inline .download-icon {
    font-size: 1em;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .file-reference {
      margin: 12px 0;
    }

    .file-link {
      padding: 10px;
      gap: 10px;
    }

    .file-icon {
      font-size: 1.3em;
    }

    .file-name {
      font-size: 0.9em;
    }

    .file-meta {
      font-size: 0.75em;
    }
  }
</style>