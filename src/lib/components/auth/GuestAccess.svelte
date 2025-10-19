<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher<{
    requestLogin: void;
    continueAsGuest: void;
  }>();

  export let allowGuestAccess = false;
  export let wikiTitle = 'MarkS3 Wiki';

  function handleLoginRequest() {
    dispatch('requestLogin');
  }

  function handleContinueAsGuest() {
    dispatch('continueAsGuest');
  }
</script>

<div class="guest-access-container">
  <div class="guest-access-card">
    <div class="header">
      <h1>{wikiTitle}</h1>
      <p>Welcome to our knowledge base</p>
    </div>

    <div class="access-options">
      {#if allowGuestAccess}
        <div class="guest-option">
          <h3>Browse as Guest</h3>
          <p>View wiki content without signing in</p>
          <button 
            class="guest-button"
            on:click={handleContinueAsGuest}
          >
            Continue as Guest
          </button>
        </div>

        <div class="divider">
          <span>or</span>
        </div>
      {/if}

      <div class="login-option">
        <h3>Sign In</h3>
        <p>Access full features including editing and file uploads</p>
        <button 
          class="login-button"
          on:click={handleLoginRequest}
        >
          Sign In to Wiki
        </button>
      </div>
    </div>

    {#if !allowGuestAccess}
      <div class="no-guest-info">
        <p class="text-sm">
          This wiki requires authentication to access content.
          Please sign in to continue.
        </p>
      </div>
    {/if}
  </div>
</div>

<style>
  .guest-access-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .guest-access-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    padding: 2rem;
    width: 100%;
    max-width: 500px;
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .header h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .header p {
    color: #6b7280;
    margin: 0;
  }

  .access-options {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .guest-option,
  .login-option {
    text-align: center;
    padding: 1.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    transition: border-color 0.2s, box-shadow 0.2s;
  }

  .guest-option:hover,
  .login-option:hover {
    border-color: #d1d5db;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  .guest-option h3,
  .login-option h3 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.5rem 0;
  }

  .guest-option p,
  .login-option p {
    color: #6b7280;
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
  }

  .guest-button,
  .login-button {
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    min-width: 150px;
  }

  .guest-button {
    background-color: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;
  }

  .guest-button:hover {
    background-color: #e5e7eb;
    transform: translateY(-1px);
  }

  .login-button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .login-button:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .divider {
    display: flex;
    align-items: center;
    text-align: center;
    margin: 0.5rem 0;
  }

  .divider::before,
  .divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: #e5e7eb;
  }

  .divider span {
    padding: 0 1rem;
    color: #6b7280;
    font-size: 0.875rem;
    background: white;
  }

  .no-guest-info {
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
    .guest-access-container {
      padding: 0.5rem;
    }

    .guest-access-card {
      padding: 1.5rem;
    }

    .header h1 {
      font-size: 1.75rem;
    }

    .guest-option,
    .login-option {
      padding: 1rem;
    }
  }
</style>