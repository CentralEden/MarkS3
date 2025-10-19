<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore, isAuthenticated, isLoading, user } from '../../stores/auth.js';
  import LoginForm from './LoginForm.svelte';
  import GuestAccess from './GuestAccess.svelte';
  import type { User } from '../../types/auth.js';

  // Props
  export let allowGuestAccess = false;
  export let wikiTitle = 'MarkS3 Wiki';
  export let requireAuth = false; // Force authentication even if guest access is allowed

  // Component state
  let showLoginForm = false;
  let isGuestMode = false;

  // Initialize auth store on mount
  onMount(async () => {
    await authStore.init();
  });

  // Handle login success
  function handleLoginSuccess(event: CustomEvent<{ user: User }>) {
    showLoginForm = false;
    isGuestMode = false;
    // The auth store will handle the state update
  }

  // Handle login error
  function handleLoginError(event: CustomEvent<{ error: string }>) {
    console.error('Login error:', event.detail.error);
    // Error is already handled by the LoginForm component
  }

  // Handle request to show login form
  function handleRequestLogin() {
    showLoginForm = true;
    isGuestMode = false;
  }

  // Handle continue as guest
  function handleContinueAsGuest() {
    if (allowGuestAccess && !requireAuth) {
      isGuestMode = true;
      showLoginForm = false;
    }
  }

  // Handle logout
  async function handleLogout() {
    await authStore.logout();
    showLoginForm = false;
    isGuestMode = false;
  }

  // Determine what to show
  $: shouldShowContent = $isAuthenticated || (isGuestMode && allowGuestAccess && !requireAuth);
  $: shouldShowGuestAccess = !$isAuthenticated && !showLoginForm && !isGuestMode && !$isLoading;
  $: shouldShowLoginForm = showLoginForm && !$isAuthenticated;
</script>

{#if $isLoading}
  <!-- Loading state -->
  <div class="auth-loading">
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading...</p>
    </div>
  </div>
{:else if shouldShowContent}
  <!-- Authenticated or guest access - show main content -->
  <div class="auth-wrapper">
    {#if $isAuthenticated}
      <!-- Show user info and logout option -->
      <div class="user-bar">
        <div class="user-info">
          <span class="user-name">{$user?.username}</span>
          <span class="user-role" class:admin={$user?.role === 'admin'} class:regular={$user?.role === 'regular'}>
            {$user?.role}
          </span>
        </div>
        <button class="logout-button" on:click={handleLogout}>
          Sign Out
        </button>
      </div>
    {:else if isGuestMode}
      <!-- Show guest mode indicator -->
      <div class="guest-bar">
        <div class="guest-info">
          <span class="guest-label">Browsing as Guest</span>
          <span class="guest-note">Limited access - sign in for full features</span>
        </div>
        <button class="login-button" on:click={handleRequestLogin}>
          Sign In
        </button>
      </div>
    {/if}
    
    <!-- Main content slot -->
    <main class="main-content">
      <slot {isGuestMode} user={$user} />
    </main>
  </div>
{:else if shouldShowLoginForm}
  <!-- Show login form -->
  <LoginForm 
    on:loginSuccess={handleLoginSuccess}
    on:loginError={handleLoginError}
  />
{:else if shouldShowGuestAccess}
  <!-- Show guest access options -->
  <GuestAccess 
    {allowGuestAccess}
    {wikiTitle}
    on:requestLogin={handleRequestLogin}
    on:continueAsGuest={handleContinueAsGuest}
  />
{/if}

<style>
  .auth-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .loading-container {
    text-align: center;
    color: white;
  }

  .spinner {
    width: 2rem;
    height: 2rem;
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-top: 3px solid white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 0 auto 1rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .auth-wrapper {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .user-bar,
  .guest-bar {
    background: white;
    border-bottom: 1px solid #e5e7eb;
    padding: 0.75rem 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }

  .user-info,
  .guest-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .user-name {
    font-weight: 500;
    color: #1f2937;
  }

  .user-role {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .user-role.admin {
    background-color: #fef3c7;
    color: #92400e;
  }

  .user-role.regular {
    background-color: #dbeafe;
    color: #1e40af;
  }

  .guest-label {
    font-weight: 500;
    color: #6b7280;
  }

  .guest-note {
    font-size: 0.875rem;
    color: #9ca3af;
  }

  .logout-button,
  .login-button {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .logout-button {
    background-color: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .logout-button:hover {
    background-color: #e5e7eb;
  }

  .login-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .login-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .main-content {
    flex: 1;
    background-color: #f9fafb;
  }

  /* Responsive design */
  @media (max-width: 640px) {
    .user-bar,
    .guest-bar {
      padding: 0.5rem;
    }

    .user-info,
    .guest-info {
      gap: 0.5rem;
    }

    .guest-note {
      display: none;
    }

    .logout-button,
    .login-button {
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
    }
  }
</style>