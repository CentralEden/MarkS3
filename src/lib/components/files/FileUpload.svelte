<!--
  FileUpload Component
  Handles file upload with drag-and-drop support and progress indication
-->

<script lang="ts">
  import type { FileInfo } from '$lib/types/index.js';
  import { fileService } from '$lib/services/files.js';
  import { createEventDispatcher } from 'svelte';
  import { APP_CONFIG } from '$lib/config/app.js';

  export let multiple: boolean = true;
  export let accept: string = '*/*';
  export let maxSize: number = APP_CONFIG.maxFileSize;
  export let compact: boolean = false;

  const dispatch = createEventDispatcher<{
    uploaded: { file: FileInfo };
    error: { message: string };
    progress: { filename: string; progress: number };
  }>();

  let fileInput: HTMLInputElement;
  let isDragOver = false;
  let uploading = false;
  let uploadProgress: { [filename: string]: number } = {};
  let uploadQueue: File[] = [];

  // Format file size for display
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Validate file before upload
  function validateFile(file: File): string | null {
    // Check file size
    if (file.size > maxSize) {
      return `File "${file.name}" is too large. Maximum size is ${formatFileSize(maxSize)}.`;
    }

    // Check if file has a name
    if (!file.name || file.name.trim() === '') {
      return 'File must have a valid name.';
    }

    // Check for potentially dangerous file types
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js'];
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (dangerousExtensions.includes(extension)) {
      return `File type ${extension} is not allowed for security reasons.`;
    }

    return null;
  }

  // Handle file selection
  async function handleFiles(files: FileList | File[]) {
    const fileArray = Array.from(files);
    
    // Validate all files first
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        dispatch('error', { message: error });
        return;
      }
    }

    // Add to upload queue
    uploadQueue = [...uploadQueue, ...fileArray];
    
    // Start uploading if not already uploading
    if (!uploading) {
      await processUploadQueue();
    }
  }

  // Process upload queue
  async function processUploadQueue() {
    if (uploadQueue.length === 0) {
      uploading = false;
      return;
    }

    uploading = true;

    while (uploadQueue.length > 0) {
      const file = uploadQueue.shift()!;
      
      try {
        // Initialize progress
        uploadProgress[file.name] = 0;
        dispatch('progress', { filename: file.name, progress: 0 });

        // Simulate progress updates (since we don't have real progress from S3)
        const progressInterval = setInterval(() => {
          if (uploadProgress[file.name] < 90) {
            uploadProgress[file.name] += Math.random() * 20;
            dispatch('progress', { filename: file.name, progress: uploadProgress[file.name] });
          }
        }, 200);

        // Upload file
        const uploadedFile = await fileService.uploadFile(file);

        // Complete progress
        clearInterval(progressInterval);
        uploadProgress[file.name] = 100;
        dispatch('progress', { filename: file.name, progress: 100 });

        // Notify success
        dispatch('uploaded', { file: uploadedFile });

        // Clean up progress after a delay
        setTimeout(() => {
          delete uploadProgress[file.name];
          uploadProgress = { ...uploadProgress };
        }, 2000);

      } catch (error) {
        // Clean up progress on error
        delete uploadProgress[file.name];
        uploadProgress = { ...uploadProgress };
        
        const message = error instanceof Error ? error.message : 'Upload failed';
        dispatch('error', { message: `Failed to upload "${file.name}": ${message}` });
      }
    }

    uploading = false;
  }

  // Handle file input change
  function handleFileInputChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      handleFiles(input.files);
      // Clear input so same file can be selected again
      input.value = '';
    }
  }

  // Handle drag and drop
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragOver = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragOver = false;
    
    if (event.dataTransfer?.files) {
      handleFiles(event.dataTransfer.files);
    }
  }

  // Trigger file input click
  function triggerFileInput() {
    fileInput.click();
  }

  // Get upload status text
  function getUploadStatusText(): string {
    const activeUploads = Object.keys(uploadProgress).length;
    const queueLength = uploadQueue.length;
    
    if (activeUploads === 0 && queueLength === 0) {
      return '';
    }
    
    if (activeUploads > 0) {
      return `Uploading ${activeUploads} file${activeUploads !== 1 ? 's' : ''}...`;
    }
    
    if (queueLength > 0) {
      return `${queueLength} file${queueLength !== 1 ? 's' : ''} in queue`;
    }
    
    return '';
  }
</script>

<div class="file-upload" class:compact>
  <!-- Hidden file input -->
  <input
    bind:this={fileInput}
    type="file"
    {accept}
    {multiple}
    on:change={handleFileInputChange}
    style="display: none;"
  />

  <!-- Drop zone -->
  <div
    class="drop-zone"
    class:drag-over={isDragOver}
    class:uploading
    on:dragover={handleDragOver}
    on:dragleave={handleDragLeave}
    on:drop={handleDrop}
    on:click={triggerFileInput}
    role="button"
    tabindex="0"
    on:keydown={(e) => e.key === 'Enter' && triggerFileInput()}
  >
    <div class="drop-zone-content">
      {#if uploading}
        <div class="upload-icon">⏳</div>
        <p class="primary-text">Uploading files...</p>
        <p class="secondary-text">{getUploadStatusText()}</p>
      {:else}
        <div class="upload-icon">📁</div>
        <p class="primary-text">
          {compact ? 'Click or drag files here' : 'Drag and drop files here, or click to select'}
        </p>
        {#if !compact}
          <p class="secondary-text">
            Maximum file size: {formatFileSize(maxSize)}
            {#if multiple}
              • Multiple files supported
            {/if}
          </p>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Upload progress -->
  {#if Object.keys(uploadProgress).length > 0}
    <div class="progress-section">
      {#each Object.entries(uploadProgress) as [filename, progress]}
        <div class="progress-item">
          <div class="progress-info">
            <span class="filename">{filename}</span>
            <span class="percentage">{Math.round(progress)}%</span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              style="width: {progress}%"
            ></div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Upload queue info -->
  {#if uploadQueue.length > 0}
    <div class="queue-info">
      <p>{uploadQueue.length} file{uploadQueue.length !== 1 ? 's' : ''} waiting to upload</p>
    </div>
  {/if}
</div>

<style>
  .file-upload {
    width: 100%;
  }

  .drop-zone {
    border: 2px dashed #d1d5da;
    border-radius: 8px;
    padding: 40px 20px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s ease;
    background-color: #fafbfc;
  }

  .file-upload.compact .drop-zone {
    padding: 20px 16px;
  }

  .drop-zone:hover {
    border-color: #0366d6;
    background-color: #f6f8fa;
  }

  .drop-zone.drag-over {
    border-color: #0366d6;
    background-color: #e6f3ff;
    transform: scale(1.02);
  }

  .drop-zone.uploading {
    border-color: #28a745;
    background-color: #f0fff4;
    cursor: default;
  }

  .drop-zone.uploading:hover {
    transform: none;
  }

  .drop-zone-content {
    pointer-events: none;
  }

  .upload-icon {
    font-size: 2.5em;
    margin-bottom: 16px;
  }

  .file-upload.compact .upload-icon {
    font-size: 1.8em;
    margin-bottom: 8px;
  }

  .primary-text {
    font-size: 1.1em;
    font-weight: 500;
    color: #24292e;
    margin: 0 0 8px 0;
  }

  .file-upload.compact .primary-text {
    font-size: 1em;
    margin: 0 0 4px 0;
  }

  .secondary-text {
    font-size: 0.9em;
    color: #586069;
    margin: 0;
  }

  .progress-section {
    margin-top: 20px;
    padding: 16px;
    background-color: #f6f8fa;
    border-radius: 6px;
  }

  .progress-item {
    margin-bottom: 12px;
  }

  .progress-item:last-child {
    margin-bottom: 0;
  }

  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    font-size: 0.9em;
  }

  .filename {
    color: #24292e;
    font-weight: 500;
    word-break: break-all;
    flex: 1;
    margin-right: 12px;
  }

  .percentage {
    color: #586069;
    font-weight: 500;
    white-space: nowrap;
  }

  .progress-bar {
    width: 100%;
    height: 6px;
    background-color: #e1e5e9;
    border-radius: 3px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background-color: #28a745;
    border-radius: 3px;
    transition: width 0.3s ease;
  }

  .queue-info {
    margin-top: 12px;
    padding: 8px 12px;
    background-color: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 4px;
    font-size: 0.9em;
    color: #856404;
  }

  .queue-info p {
    margin: 0;
  }

  /* Focus styles for accessibility */
  .drop-zone:focus {
    outline: none;
    border-color: #0366d6;
    box-shadow: 0 0 0 2px rgba(3, 102, 214, 0.1);
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .drop-zone {
      padding: 30px 16px;
    }

    .file-upload.compact .drop-zone {
      padding: 16px 12px;
    }

    .upload-icon {
      font-size: 2em;
    }

    .file-upload.compact .upload-icon {
      font-size: 1.5em;
    }

    .primary-text {
      font-size: 1em;
    }

    .secondary-text {
      font-size: 0.8em;
    }
  }
</style>