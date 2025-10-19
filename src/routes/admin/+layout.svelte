<!--
  Admin Route Layout
  Ensures user has admin permissions before accessing admin pages
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import AuthGuard from '$lib/components/auth/AuthGuard.svelte';
  import { canAccessRouteType } from '$lib/utils/routeGuards.js';

  let accessDenied = false;

  onMount(() => {
    // Check if user can access admin routes
    if (!canAccessRouteType('admin')) {
      accessDenied = true;
    }
  });

  function handleAccessDenied() {
    goto('/');
  }
</script>

<svelte:head>
  <title>Admin - MarkS3 Wiki</title>
</svelte:head>

<AuthGuard requireAuth={true}>
  <div slot="default" let:user let:isGuestMode>
    {#if accessDenied || isGuestMode || !user || user.role !== 'admin'}
      <!-- Access denied -->
      <div class="access-denied">
        <div class="access-denied-content">
          <div class="access-icon">⚠️</div>
          <h1>Admin Access Required</h1>
          <p>You need administrator privileges to access this area. Please contact your system administrator if you believe this is an error.</p>
          <button class="go-home-btn" on:click={handleAccessDenied}>
            Go Home
          </button>
        </div>
      </div>
    {:else}
      <!-- User has admin access -->
      <div class="admin-layout">
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
    border-left: 4px solid #f59e0b;
  }

  .access-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.8;
  }

  .access-denied-content h1 {
    font-size: 1.5rem;
    font-weight: 600;
    color: #f59e0b;
    margin: 0 0 1rem 0;
  }

  .access-denied-content p {
    color: #6b7280;
    margin: 0 0 2rem 0;
    line-height: 1.6;
  }

  .go-home-btn {
    padding: 0.75rem 1.5rem;
    background: #f59e0b;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .go-home-btn:hover {
    background: #d97706;
  }

  .admin-layout {
    min-height: calc(100vh - 120px);
  }
</style>