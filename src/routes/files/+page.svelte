<!--
  File Management Page
  Interface for managing uploaded files
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import FileManager from '$lib/components/files/FileManager.svelte';
  import FileUpload from '$lib/components/files/FileUpload.svelte';
  import OrphanedFilesCleaner from '$lib/components/files/OrphanedFilesCleaner.svelte';

  let activeTab = 'upload';

  function setActiveTab(tab: string) {
    activeTab = tab;
  }
</script>

<svelte:head>
  <title>File Management - MarkS3 Wiki</title>
  <meta name="description" content="Upload and manage files for your wiki pages" />
</svelte:head>

<div class="files-page">
  <div class="page-header">
    <h1>File Management</h1>
    <p class="page-description">
      Upload, manage, and organize files for your wiki pages. Supported formats include images, documents, and more.
    </p>
  </div>

  <nav class="files-nav">
    <button 
      class="nav-button" 
      class:active={activeTab === 'upload'}
      on:click={() => setActiveTab('upload')}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="7,10 12,15 17,10"/>
        <line x1="12" y1="15" x2="12" y2="3"/>
      </svg>
      Upload Files
    </button>
    <button 
      class="nav-button" 
      class:active={activeTab === 'manage'}
      on:click={() => setActiveTab('manage')}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
        <polyline points="13,2 13,9 20,9"/>
      </svg>
      Manage Files
    </button>
    <button 
      class="nav-button" 
      class:active={activeTab === 'cleanup'}
      on:click={() => setActiveTab('cleanup')}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3,6 5,6 21,6"/>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        <line x1="10" y1="11" x2="10" y2="17"/>
        <line x1="14" y1="11" x2="14" y2="17"/>
      </svg>
      Cleanup
    </button>
  </nav>

  <main class="files-content">
    {#if activeTab === 'upload'}
      <div class="tab-content">
        <h2>Upload New Files</h2>
        <p class="tab-description">
          Upload files to use in your wiki pages. Images will be displayed inline, while other files will be available as download links.
        </p>
        <FileUpload />
      </div>
    {:else if activeTab === 'manage'}
      <div class="tab-content">
        <h2>File Library</h2>
        <p class="tab-description">
          Browse and manage all uploaded files. You can view file details, copy links, and delete unused files.
        </p>
        <FileManager />
      </div>
    {:else if activeTab === 'cleanup'}
      <div class="tab-content">
        <h2>Orphaned Files Cleanup</h2>
        <p class="tab-description">
          Find and remove files that are no longer referenced by any wiki pages to keep your storage organized.
        </p>
        <OrphanedFilesCleaner />
      </div>
    {/if}
  </main>
</div>

<style>
  .files-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    min-height: calc(100vh - 120px);
  }

  .page-header {
    margin-bottom: 24px;
    text-align: center;
  }

  .page-header h1 {
    margin: 0 0 8px 0;
    font-size: 32px;
    font-weight: 700;
    color: var(--text-primary, #2d3748);
  }

  .page-description {
    margin: 0;
    font-size: 16px;
    color: var(--text-secondary, #718096);
    line-height: 1.6;
    max-width: 600px;
    margin: 0 auto;
  }

  .files-nav {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    border-bottom: 2px solid var(--border-color, #e1e5e9);
    padding-bottom: 16px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .nav-button {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border: none;
    background: transparent;
    color: var(--text-secondary, #718096);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border-radius: 8px;
    transition: all 0.2s ease;
  }

  .nav-button:hover {
    background: var(--bg-hover, #f7fafc);
    color: var(--text-primary, #2d3748);
  }

  .nav-button.active {
    background: var(--primary-color, #3182ce);
    color: white;
  }

  .nav-button svg {
    width: 18px;
    height: 18px;
  }

  .files-content {
    min-height: 400px;
  }

  .tab-content {
    background: white;
    border-radius: 12px;
    padding: 24px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .tab-content h2 {
    margin: 0 0 8px 0;
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary, #2d3748);
  }

  .tab-description {
    margin: 0 0 24px 0;
    font-size: 14px;
    color: var(--text-secondary, #718096);
    line-height: 1.6;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .files-page {
      padding: 16px;
    }

    .page-header h1 {
      font-size: 28px;
    }

    .page-description {
      font-size: 14px;
    }

    .files-nav {
      justify-content: stretch;
    }

    .nav-button {
      flex: 1;
      justify-content: center;
      padding: 10px 16px;
      font-size: 13px;
    }

    .nav-button svg {
      width: 16px;
      height: 16px;
    }

    .tab-content {
      padding: 20px;
    }

    .tab-content h2 {
      font-size: 20px;
    }
  }

  @media (max-width: 480px) {
    .files-nav {
      flex-direction: column;
    }

    .nav-button {
      flex: none;
    }
  }
</style>