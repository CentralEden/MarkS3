<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import MarkdownEditor from './MarkdownEditor.svelte';
  import MarkdownPreview from './MarkdownPreview.svelte';
  import type { WikiPage } from '../../types/index.js';
  import { extractTitleFromMarkdown } from '../../utils/formatting.js';

  const dispatch = createEventDispatcher<{
    save: { page: WikiPage; content: string };
    cancel: void;
    conflict: { conflictData: WikiPage };
  }>();

  // Props
  export let page: WikiPage | null = null;
  export let isNew = false;
  export let readonly = false;
  export let showPreview = true;

  // Component state
  let content = '';
  let title = '';
  let hasUnsavedChanges = false;
  let isSaving = false;
  let showConflictDialog = false;
  let conflictData: WikiPage | null = null;

  // Component references
  let markdownEditor: MarkdownEditor;
  let markdownPreview: MarkdownPreview;

  // View mode state
  let viewMode: 'split' | 'editor' | 'preview' = 'split';

  // Initialize content
  onMount(() => {
    if (page) {
      content = page.content;
      title = page.title;
    } else if (isNew) {
      content = '# New Page\n\nStart writing your content here...';
      title = 'New Page';
    }
  });

  // Update title when content changes
  function handleContentChange(event: CustomEvent<{ content: string }>) {
    content = event.detail.content;
    hasUnsavedChanges = true;
    
    // Extract title from content
    const extractedTitle = extractTitleFromMarkdown(content);
    if (extractedTitle) {
      title = extractedTitle;
    }
  }

  // Handle save
  async function handleSave(event?: CustomEvent<{ content: string }>) {
    if (event) {
      content = event.detail.content;
    }

    if (isSaving) return;

    isSaving = true;
    hasUnsavedChanges = false;

    try {
      const pageData: WikiPage = {
        path: page?.path || 'new-page.md',
        title: title || 'Untitled',
        content,
        metadata: page?.metadata || {
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'current-user', // TODO: Get from auth service
          version: 1
        },
        etag: page?.etag
      };

      dispatch('save', { page: pageData, content });
    } catch (error) {
      console.error('Save error:', error);
      hasUnsavedChanges = true;
    } finally {
      isSaving = false;
    }
  }

  // Handle cancel
  function handleCancel() {
    if (hasUnsavedChanges) {
      const confirmDiscard = confirm('You have unsaved changes. Are you sure you want to discard them?');
      if (!confirmDiscard) return;
    }
    dispatch('cancel');
  }

  // Handle keyboard shortcuts
  function handleKeyDown(event: KeyboardEvent) {
    // Ctrl+S or Cmd+S to save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      handleSave();
    }
    
    // Escape to cancel
    if (event.key === 'Escape') {
      event.preventDefault();
      handleCancel();
    }
  }

  // Change view mode
  function setViewMode(mode: 'split' | 'editor' | 'preview') {
    viewMode = mode;
  }

  // Handle conflict resolution
  function handleConflictResolution(useLocal: boolean) {
    if (useLocal) {
      // Keep local changes and save
      showConflictDialog = false;
      handleSave();
    } else {
      // Use server version
      if (conflictData) {
        content = conflictData.content;
        title = conflictData.title;
        page = conflictData;
        hasUnsavedChanges = false;
        showConflictDialog = false;
        
        // Update editor content
        if (markdownEditor) {
          markdownEditor.setContent(content);
        }
      }
    }
  }

  // Show conflict dialog
  export function showConflict(data: WikiPage) {
    conflictData = data;
    showConflictDialog = true;
  }

  // Warn before leaving with unsaved changes
  onMount(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  });
</script>

<svelte:window on:keydown={handleKeyDown} />

<div class="page-editor">
  <!-- Editor Header -->
  <div class="editor-header">
    <div class="header-left">
      <h1 class="page-title">
        {#if isNew}
          New Page
        {:else}
          {title || 'Untitled'}
        {/if}
        {#if hasUnsavedChanges}
          <span class="unsaved-indicator">•</span>
        {/if}
      </h1>
      {#if page?.path}
        <span class="page-path">{page.path}</span>
      {/if}
    </div>
    
    <div class="header-right">
      <!-- View mode controls -->
      {#if showPreview && !readonly}
        <div class="view-controls">
          <button 
            class="view-button"
            class:active={viewMode === 'editor'}
            on:click={() => setViewMode('editor')}
            title="Editor only"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button 
            class="view-button"
            class:active={viewMode === 'split'}
            on:click={() => setViewMode('split')}
            title="Split view"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="12" y1="3" x2="12" y2="21"/>
            </svg>
          </button>
          <button 
            class="view-button"
            class:active={viewMode === 'preview'}
            on:click={() => setViewMode('preview')}
            title="Preview only"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        </div>
      {/if}

      <!-- Action buttons -->
      <div class="action-buttons">
        <button 
          class="cancel-button"
          on:click={handleCancel}
        >
          Cancel
        </button>
        {#if !readonly}
          <button 
            class="save-button"
            class:saving={isSaving}
            on:click={() => handleSave()}
            disabled={isSaving}
          >
            {#if isSaving}
              <div class="spinner"></div>
              Saving...
            {:else}
              Save
            {/if}
          </button>
        {/if}
      </div>
    </div>
  </div>

  <!-- Editor Content -->
  <div class="editor-content" class:split={viewMode === 'split'}>
    {#if viewMode === 'editor' || viewMode === 'split'}
      <div class="editor-panel" class:full-width={viewMode === 'editor'}>
        <MarkdownEditor
          bind:this={markdownEditor}
          bind:content
          {readonly}
          autofocus={isNew}
          on:change={handleContentChange}
          on:save={handleSave}
        />
      </div>
    {/if}

    {#if showPreview && (viewMode === 'preview' || viewMode === 'split')}
      <div class="preview-panel" class:full-width={viewMode === 'preview'}>
        <MarkdownPreview
          bind:this={markdownPreview}
          {content}
          title="Preview"
        />
      </div>
    {/if}
  </div>
</div>

<!-- Conflict Resolution Dialog -->
{#if showConflictDialog && conflictData}
  <div class="conflict-overlay">
    <div class="conflict-dialog">
      <div class="conflict-header">
        <h2>Edit Conflict Detected</h2>
        <p>This page has been modified by another user while you were editing.</p>
      </div>
      
      <div class="conflict-content">
        <div class="conflict-option">
          <h3>Your Changes</h3>
          <div class="conflict-preview">
            <MarkdownPreview content={content} title="Your Version" />
          </div>
          <button 
            class="conflict-button primary"
            on:click={() => handleConflictResolution(true)}
          >
            Keep My Changes
          </button>
        </div>
        
        <div class="conflict-option">
          <h3>Server Version</h3>
          <div class="conflict-preview">
            <MarkdownPreview content={conflictData.content} title="Server Version" />
          </div>
          <button 
            class="conflict-button secondary"
            on:click={() => handleConflictResolution(false)}
          >
            Use Server Version
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  .page-editor {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: #f9fafb;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: white;
    border-bottom: 1px solid #e5e7eb;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .page-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0;
  }

  .unsaved-indicator {
    color: #f59e0b;
    font-size: 1.25rem;
  }

  .page-path {
    font-size: 0.875rem;
    color: #6b7280;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .view-controls {
    display: flex;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    overflow: hidden;
  }

  .view-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: white;
    color: #6b7280;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .view-button:not(:last-child) {
    border-right: 1px solid #d1d5db;
  }

  .view-button:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .view-button.active {
    background: #3b82f6;
    color: white;
  }

  .action-buttons {
    display: flex;
    gap: 0.75rem;
  }

  .cancel-button,
  .save-button {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .cancel-button {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .cancel-button:hover {
    background: #e5e7eb;
  }

  .save-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #3b82f6;
    color: white;
  }

  .save-button:hover:not(:disabled) {
    background: #2563eb;
  }

  .save-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .save-button.saving {
    background: #6b7280;
  }

  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .editor-content {
    flex: 1;
    display: flex;
    gap: 1rem;
    padding: 1rem;
    overflow: hidden;
  }

  .editor-content.split {
    gap: 1rem;
  }

  .editor-panel,
  .preview-panel {
    flex: 1;
    min-width: 0;
  }

  .editor-panel.full-width,
  .preview-panel.full-width {
    flex: none;
    width: 100%;
  }

  /* Conflict Dialog */
  .conflict-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .conflict-dialog {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    max-width: 80vw;
    max-height: 80vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .conflict-header {
    padding: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .conflict-header h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .conflict-header p {
    color: #6b7280;
    margin: 0;
  }

  .conflict-content {
    display: flex;
    flex: 1;
    min-height: 0;
  }

  .conflict-option {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 1.5rem;
  }

  .conflict-option:not(:last-child) {
    border-right: 1px solid #e5e7eb;
  }

  .conflict-option h3 {
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 1rem 0;
  }

  .conflict-preview {
    flex: 1;
    min-height: 300px;
    margin-bottom: 1rem;
  }

  .conflict-button {
    padding: 0.75rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .conflict-button.primary {
    background: #3b82f6;
    color: white;
  }

  .conflict-button.primary:hover {
    background: #2563eb;
  }

  .conflict-button.secondary {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .conflict-button.secondary:hover {
    background: #e5e7eb;
  }

  /* Responsive design */
  @media (max-width: 1024px) {
    .editor-content.split {
      flex-direction: column;
    }

    .conflict-content {
      flex-direction: column;
    }

    .conflict-option:not(:last-child) {
      border-right: none;
      border-bottom: 1px solid #e5e7eb;
    }

    .conflict-preview {
      min-height: 200px;
    }
  }

  @media (max-width: 640px) {
    .editor-header {
      padding: 0.75rem 1rem;
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .header-left,
    .header-right {
      align-items: center;
    }

    .page-title {
      font-size: 1.25rem;
    }

    .view-controls {
      order: -1;
      align-self: center;
    }

    .editor-content {
      padding: 0.75rem;
    }

    .conflict-dialog {
      max-width: 95vw;
      max-height: 90vh;
    }

    .conflict-header,
    .conflict-option {
      padding: 1rem;
    }
  }
</style>