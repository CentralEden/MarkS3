<!--
  Files Route Layout
  Ensures user has upload permissions before accessing file management
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import AuthGuard from '$lib/components/auth/AuthGuard.svelte';
  import { canAccessRouteType } from '$lib/utils/routeGuards.js';

  let accessDenied = false;

  onMount(() => {
    // Check if user can access file management
    if (!canAccessRouteType('files')) {
      accessDenied = true;
    }
  });

  function handleAccessDenied() {
    goto('/');
  }
</script>

<svelte:head>
  <title>File Management - MarkS3 Wiki</title>
</svelte:head>

<AuthGuard requireAuth={true}>
  <div slot="default" let:user let:isGuestMode>
    {#if accessDenied || isGuestMode || !user}
      <!-- Access denied -->
      <div class="access-denied">
        <div class="access-denied-content">
          <div class="access-icon">📁</div>
          <h1>Upload Permission Required</h1>
          <p>You need file upload permissions to access file management. Please sign in with an account that has upload access.</p>
          <button class="go-home-btn" on:click={handleAccessDenied}>
            Go Home
          </button>
        </div>
      </div>
    {:else}
      <!-- User has access -->
      <div class="files-layout">
        <slot />
      </div>
    {/if}
  </div>
</AuthGuard>

<style>
  .access-denied {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 120px);
    padding: 2rem;
  }

  .access-denied-content {
    text-align: center;
    background: white;
    padding: 3rem;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    max-width: 500px;
  }

  .access-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.6;
  }

  .access-denied-content h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #dc2626;
    margin: 0 0 1rem 0;
  }

  .access-denied-content p {
    color: #6b7280;
    margin: 0 0 2rem 0;
    line-height: 1.6;
  }

  .go-home-btn {
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

  .go-home-btn:hover {
    background: #2563eb;
  }

  .files-layout {
    min-height: calc(100vh - 120px);
  }
</style>