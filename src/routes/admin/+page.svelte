<!--
  Admin Dashboard Page
  Main admin interface with navigation to user management and settings
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore, isAdmin } from '$lib/stores/auth.js';
  import AuthGuard from '$lib/components/auth/AuthGuard.svelte';

  let activeTab = 'users';

  // Redirect if not admin
  onMount(() => {
    const unsubscribe = isAdmin.subscribe(($isAdmin) => {
      if (!$isAdmin) {
        goto('/');
      }
    });

    return unsubscribe;
  });

  function setActiveTab(tab: string) {
    activeTab = tab;
  }
</script>

<svelte:head>
  <title>Admin Dashboard - MarkS3</title>
</svelte:head>

<AuthGuard requiredPermission="admin">
  <div class="admin-dashboard">
    <header class="admin-header">
      <h1>Admin Dashboard</h1>
      <p>Manage users and system settings</p>
    </header>

    <nav class="admin-nav">
      <button 
        class="nav-button" 
        class:active={activeTab === 'users'}
        on:click={() => setActiveTab('users')}
      >
        User Management
      </button>
      <button 
        class="nav-button" 
        class:active={activeTab === 'settings'}
        on:click={() => setActiveTab('settings')}
      >
        Settings
      </button>
    </nav>

    <main class="admin-content">
      {#if activeTab === 'users'}
        {#await import('$lib/components/admin/UserManagement.svelte')}
          <div class="loading">Loading user management...</div>
        {:then { default: UserManagement }}
          <UserManagement />
        {:catch error}
          <div class="error">Failed to load user management: {error.message}</div>
        {/await}
      {:else if activeTab === 'settings'}
        {#await import('$lib/components/admin/SettingsManagement.svelte')}
          <div class="loading">Loading settings...</div>
        {:then { default: SettingsManagement }}
          <SettingsManagement />
        {:catch error}
          <div class="error">Failed to load settings: {error.message}</div>
        {/await}
      {/if}
    </main>
  </div>
</AuthGuard>

<style>
  .admin-dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .admin-header {
    margin-bottom: 2rem;
    text-align: center;
  }

  .admin-header h1 {
    color: #2563eb;
    margin-bottom: 0.5rem;
  }

  .admin-header p {
    color: #6b7280;
    font-size: 1.1rem;
  }

  .admin-nav {
    display: flex;
    gap: 1rem;
    margin-bottom: 2rem;
    border-bottom: 2px solid #e5e7eb;
    padding-bottom: 1rem;
  }

  .nav-button {
    padding: 0.75rem 1.5rem;
    border: none;
    background: transparent;
    color: #6b7280;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    border-radius: 0.5rem;
    transition: all 0.2s;
  }

  .nav-button:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .nav-button.active {
    background: #2563eb;
    color: white;
  }

  .admin-content {
    min-height: 400px;
  }

  .loading, .error {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }

  .error {
    color: #dc2626;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 0.5rem;
  }
</style>