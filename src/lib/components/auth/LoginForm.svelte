<script lang="ts">
  import { authStore, isLoading, authError } from '../../stores/auth.js';
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher<{
    loginSuccess: { user: import('../../types/auth.js').User };
    loginError: { error: string };
  }>();

  // Form state
  let username = '';
  let password = '';
  let showPassword = false;
  let formError = '';
  let isSubmitting = false;

  // Handle form submission
  async function handleSubmit() {
    // Clear previous errors
    formError = '';
    authStore.clearError();
    
    // Basic validation
    if (!username.trim()) {
      formError = 'Username is required';
      return;
    }
    
    if (!password.trim()) {
      formError = 'Password is required';
      return;
    }

    isSubmitting = true;

    try {
      const result = await authStore.login(username.trim(), password);
      
      if (result.success && result.user) {
        dispatch('loginSuccess', { user: result.user });
        // Clear form
        username = '';
        password = '';
      } else {
        formError = result.error || 'Login failed';
        dispatch('loginError', { error: formError });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      formError = errorMessage;
      dispatch('loginError', { error: errorMessage });
    } finally {
      isSubmitting = false;
    }
  }

  // Handle Enter key in form
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleSubmit();
    }
  }

  // Toggle password visibility
  function togglePasswordVisibility() {
    showPassword = !showPassword;
  }

  // Clear form errors when user starts typing
  function clearErrors() {
    formError = '';
    authStore.clearError();
  }
</script>

<div class="login-container">
  <div class="login-card">
    <div class="login-header">
      <h1>MarkS3 Wiki</h1>
      <p>Sign in to access your wiki</p>
    </div>

    <form on:submit|preventDefault={handleSubmit} class="login-form">
      <!-- Username field -->
      <div class="form-group">
        <label for="username">Username</label>
        <input
          id="username"
          type="text"
          bind:value={username}
          on:input={clearErrors}
          on:keydown={handleKeydown}
          placeholder="Enter your username"
          disabled={isSubmitting || $isLoading}
          required
          autocomplete="username"
        />
      </div>

      <!-- Password field -->
      <div class="form-group">
        <label for="password">Password</label>
        <div class="password-input-container">
          {#if showPassword}
            <input
              id="password"
              type="text"
              bind:value={password}
              on:input={clearErrors}
              on:keydown={handleKeydown}
              placeholder="Enter your password"
              disabled={isSubmitting || $isLoading}
              required
              autocomplete="current-password"
            />
          {:else}
            <input
              id="password"
              type="password"
              bind:value={password}
              on:input={clearErrors}
              on:keydown={handleKeydown}
              placeholder="Enter your password"
              disabled={isSubmitting || $isLoading}
              required
              autocomplete="current-password"
            />
          {/if}
          <button
            type="button"
            class="password-toggle"
            on:click={togglePasswordVisibility}
            disabled={isSubmitting || $isLoading}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {#if showPassword}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            {:else}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            {/if}
          </button>
        </div>
      </div>

      <!-- Error messages -->
      {#if formError || $authError}
        <div class="error-message" role="alert">
          {formError || $authError}
        </div>
      {/if}

      <!-- Submit button -->
      <button
        type="submit"
        class="login-button"
        disabled={isSubmitting || $isLoading || !username.trim() || !password.trim()}
      >
        {#if isSubmitting || $isLoading}
          <div class="spinner"></div>
          Signing in...
        {:else}
          Sign In
        {/if}
      </button>
    </form>

    <!-- Guest access info (if enabled) -->
    <div class="guest-access-info">
      <p class="text-sm">
        Don't have an account? Contact your administrator for access.
      </p>
    </div>
  </div>
</div>

<style>
  .login-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .login-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    padding: 2rem;
    width: 100%;
    max-width: 400px;
  }

  .login-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .login-header h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .login-header p {
    color: #6b7280;
    margin: 0;
  }

  .login-form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .form-group label {
    font-weight: 500;
    color: #374151;
    font-size: 0.875rem;
  }

  .form-group input {
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .form-group input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .form-group input:disabled {
    background-color: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }

  .password-input-container {
    position: relative;
  }

  .password-toggle {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #6b7280;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
    transition: color 0.2s;
  }

  .password-toggle:hover:not(:disabled) {
    color: #374151;
  }

  .password-toggle:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .error-message {
    background-color: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 0.75rem;
    border-radius: 6px;
    font-size: 0.875rem;
  }

  .login-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 0.875rem 1.5rem;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }

  .login-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .login-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
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

  .guest-access-info {
    margin-top: 1.5rem;
    text-align: center;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .text-sm {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0;
  }

  /* Responsive design */
  @media (max-width: 480px) {
    .login-container {
      padding: 0.5rem;
    }

    .login-card {
      padding: 1.5rem;
    }

    .login-header h1 {
      font-size: 1.75rem;
    }
  }
</style>