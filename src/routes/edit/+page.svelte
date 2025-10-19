<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import PageEditor from '../../lib/components/editor/PageEditor.svelte';
  import AuthGuard from '../../lib/components/auth/AuthGuard.svelte';
  import { wikiService } from '../../lib/services/wiki.js';
  import { authStore } from '../../lib/stores/auth.js';
  import type { WikiPage } from '../../lib/types/index.js';
  import { WikiError } from '../../lib/types/index.js';

  // Component state
  let currentPage: WikiPage | null = null;
  let isNew = false;
  let isLoading = true;
  let error: string | null = null;
  let pageEditor: PageEditor;

  // Get page path from URL params
  $: pagePath = $page.url.searchParams.get('path');

  // Load page data
  onMount(async () => {
    await loadPage();
  });

  async function loadPage() {
    isLoading = true;
    error = null;

    try {
      if (pagePath) {
        // Load existing page
        currentPage = await wikiService.getPage(pagePath);
        isNew = false;
      } else {
        // New page
        currentPage = null;
        isNew = true;
      }
    } catch (err) {
      if (err instanceof WikiError) {
        error = err.message;
      } else {
        error = 'Failed to load page';
      }
      console.error('Error loading page:', err);
    } finally {
      isLoading = false;
    }
  }

  // Handle save
  async function handleSave(event: CustomEvent<{ page: WikiPage; content: string }>) {
    const { page: pageData, content } = event.detail;

    try {
      if (isNew) {
        // Create new page
        const newPage = await wikiService.createPage(pageData.path, content);
        currentPage = newPage;
        isNew = false;
        
        // Update URL to reflect the new page
        goto(`/edit?path=${encodeURIComponent(newPage.path)}`, { replaceState: true });
      } else {
        // Update existing page
        const updatedPage = await wikiService.updatePage(pageData.path, content);
        currentPage = updatedPage;
      }
    } catch (err) {
      if (err instanceof WikiError && err.code === 'EDIT_CONFLICT') {
        // Handle edit conflict
        if (err.details && pageEditor) {
          pageEditor.showConflict(err.details);
        }
      } else {
        error = err instanceof Error ? err.message : 'Failed to save page';
        console.error('Save error:', err);
      }
    }
  }

  // Handle cancel
  function handleCancel() {
    // Navigate back to browse or home
    goto('/');
  }

  // Check permissions
  function checkPermissions(user: any, isGuestMode: boolean) {
    if (isGuestMode) {
      return false; // Guests cannot edit
    }
    
    if (!user) {
      return false;
    }

    // Check if user has write permissions
    return authStore.hasPermission('write');
  }
</script>

<svelte:head>
  <title>
    {#if isNew}
      New Page - MarkS3
    {:else if currentPage}
      Edit {currentPage.title} - MarkS3
    {:else}
      Edit Page - MarkS3
    {/if}
  </title>
</svelte:head>

<AuthGuard allowGuestAccess={false} requireAuth={true}>
  <div slot="default" let:user let:isGuestMode>
    {#if !checkPermissions(user, isGuestMode)}
      <!-- No permission to edit -->
      <div class="no-permission">
        <div class="no-permission-content">
          <h1>Access Denied</h1>
          <p>You don't have permission to edit pages. Please sign in with an account that has write access.</p>
          <button on:click={() => goto('/')}>Go Home</button>
        </div>
      </div>
    {:else if isLoading}
      <!-- Loading state -->
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Loading page...</p>
      </div>
    {:else if error}
      <!-- Error state -->
      <div class="error-container">
        <div class="error-content">
          <h1>Error</h1>
          <p>{error}</p>
          <div class="error-actions">
            <button on:click={loadPage}>Try Again</button>
            <button on:click={() => goto('/')}>Go Home</button>
          </div>
        </div>
      </div>
    {:else}
      <!-- Editor -->
      <PageEditor
        bind:this={pageEditor}
        page={currentPage}
        {isNew}
        readonly={false}
        showPreview={true}
        on:save={handleSave}
        on:cancel={handleCancel}
      />
    {/if}
  </div>
</AuthGuard>

<style>
  .no-permission,
  .loading-container,
  .error-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    background: #f9fafb;
  }

  .no-permission-content,
  .error-content {
    text-align: center;
    background: white;
    padding: 3rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    max-width: 500px;
  }

  .no-permission-content h1,
  .error-content h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 1rem 0;
  }

  .no-permission-content p,
  .error-content p {
    color: #6b7280;
    margin: 0 0 2rem 0;
    line-height: 1.6;
  }

  .no-permission-content button,
  .error-actions button {
    padding: 0.75rem 1.5rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .no-permission-content button:hover,
  .error-actions button:hover {
    background: #2563eb;
  }

  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .error-actions button:last-child {
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .error-actions button:last-child:hover {
    background: #e5e7eb;
  }

  .loading-container {
    flex-direction: column;
    gap: 1rem;
    color: #6b7280;
  }

  .spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid #e5e7eb;
    border-top: 3px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Make editor full height */
  :global(body) {
    margin: 0;
    padding: 0;
  }

  :global(.main-content) {
    padding: 0 !important;
  }
</style>