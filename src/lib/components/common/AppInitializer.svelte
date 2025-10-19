<!--
  Application Initializer Component
  Handles app initialization with loading states and error handling
-->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { appInitializationService } from '$lib/services/appInitialization.js';
  import type { InitializationStatus, InitializationResult } from '$lib/services/appInitialization.js';

  const dispatch = createEventDispatcher<{
    initialized: InitializationResult;
    error: { error: string };
  }>();

  // Component state
  let status: InitializationStatus = {
    stage: 'starting',
    message: 'Starting application...',
    progress: 0
  };
  let result: InitializationResult | null = null;
  let showDetails = false;

  onMount(async () => {
    // Subscribe to status updates
    const unsubscribe = appInitializationService.onStatusUpdate((newStatus) => {
      status = newStatus;
    });

    try {
      // Initialize the application
      result = await appInitializationService.initialize();
      
      if (result.success) {
        dispatch('initialized', result);
      } else {
        dispatch('error', { error: result.error || 'Unknown initialization error' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Initialization failed';
      dispatch('error', { error: errorMessage });
    }

    // Cleanup
    return unsubscribe;
  });

  function toggleDetails() {
    showDetails = !showDetails;
  }

  function retry() {
    // Reset and retry initialization
    appInitializationService.reset();
    window.location.reload();
  }
</script>

<div class="app-initializer">
  <div class="init-container">
    <div class="init-header">
      <div class="brand">
        <span class="brand-icon">📚</span>
        <h1>MarkS3 Wiki</h1>
      </div>
      <p class="brand-subtitle">Serverless Markdown Wiki System</p>
    </div>

    {#if status.stage === 'error' || (result && !result.success)}
      <!-- Error State -->
      <div class="init-error">
        <div class="error-icon">⚠️</div>
        <h2>Initialization Failed</h2>
        <p class="error-message">
          {result?.error || status.message}
        </p>
        
        <div class="error-actions">
          <button class="retry-btn" on:click={retry}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23,4 23,10 17,10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Retry
          </button>
          <button class="details-btn" on:click={toggleDetails}>
            {showDetails ? 'Hide' : 'Show'} Details
          </button>
        </div>

        {#if showDetails}
          <div class="error-details">
            <h3>Diagnostics</h3>
            <pre>{JSON.stringify(appInitializationService.getDiagnostics(), null, 2)}</pre>
          </div>
        {/if}
      </div>
    {:else if status.stage === 'complete' && result?.success}
      <!-- Success State -->
      <div class="init-success">
        <div class="success-icon">✅</div>
        <h2>Ready!</h2>
        <p>Application initialized successfully</p>
        
        {#if result.warnings && result.warnings.length > 0}
          <div class="warnings">
            <h3>Warnings:</h3>
            <ul>
              {#each result.warnings as warning}
                <li>{warning}</li>
              {/each}
            </ul>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Loading State -->
      <div class="init-loading">
        <div class="progress-container">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              style="width: {status.progress}%"
            ></div>
          </div>
          <div class="progress-text">
            {Math.round(status.progress)}%
          </div>
        </div>

        <div class="status-info">
          <div class="status-stage">
            {#if status.stage === 'starting'}
              🚀 Starting
            {:else if status.stage === 'auth'}
              🔐 Authentication
            {:else if status.stage === 'config'}
              ⚙️ Configuration
            {:else if status.stage === 'services'}
              🔧 Services
            {:else if status.stage === 'metadata'}
              📊 Metadata
            {:else}
              ⏳ Loading
            {/if}
          </div>
          <p class="status-message">{status.message}</p>
        </div>

        <div class="loading-animation">
          <div class="spinner"></div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .app-initializer {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
  }

  .init-container {
    background: white;
    border-radius: 16px;
    padding: 40px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    max-width: 500px;
    width: 100%;
    text-align: center;
  }

  .init-header {
    margin-bottom: 40px;
  }

  .brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    margin-bottom: 8px;
  }

  .brand-icon {
    font-size: 32px;
  }

  .brand h1 {
    margin: 0;
    font-size: 28px;
    font-weight: 700;
    color: #2d3748;
  }

  .brand-subtitle {
    margin: 0;
    font-size: 14px;
    color: #718096;
  }

  .init-loading {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .progress-container {
    position: relative;
  }

  .progress-bar {
    width: 100%;
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progress-text {
    position: absolute;
    top: -24px;
    right: 0;
    font-size: 12px;
    font-weight: 600;
    color: #4a5568;
  }

  .status-info {
    text-align: center;
  }

  .status-stage {
    font-size: 18px;
    font-weight: 600;
    color: #2d3748;
    margin-bottom: 8px;
  }

  .status-message {
    margin: 0;
    font-size: 14px;
    color: #718096;
  }

  .loading-animation {
    display: flex;
    justify-content: center;
  }

  .spinner {
    width: 32px;
    height: 32px;
    border: 3px solid #e2e8f0;
    border-top: 3px solid #667eea;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .init-error {
    text-align: center;
  }

  .error-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .init-error h2 {
    margin: 0 0 16px 0;
    font-size: 24px;
    color: #e53e3e;
  }

  .error-message {
    margin: 0 0 24px 0;
    font-size: 16px;
    color: #718096;
    line-height: 1.6;
  }

  .error-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
    margin-bottom: 24px;
  }

  .retry-btn,
  .details-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .retry-btn {
    background: #667eea;
    color: white;
  }

  .retry-btn:hover {
    background: #5a67d8;
    transform: translateY(-1px);
  }

  .details-btn {
    background: #f7fafc;
    color: #4a5568;
    border: 1px solid #e2e8f0;
  }

  .details-btn:hover {
    background: #edf2f7;
  }

  .error-details {
    text-align: left;
    background: #f7fafc;
    border-radius: 8px;
    padding: 16px;
    margin-top: 16px;
  }

  .error-details h3 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #2d3748;
  }

  .error-details pre {
    margin: 0;
    font-size: 12px;
    color: #4a5568;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .init-success {
    text-align: center;
  }

  .success-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .init-success h2 {
    margin: 0 0 8px 0;
    font-size: 24px;
    color: #38a169;
  }

  .init-success p {
    margin: 0 0 24px 0;
    font-size: 16px;
    color: #718096;
  }

  .warnings {
    background: #fef5e7;
    border: 1px solid #f6ad55;
    border-radius: 8px;
    padding: 16px;
    text-align: left;
  }

  .warnings h3 {
    margin: 0 0 8px 0;
    font-size: 14px;
    color: #c05621;
  }

  .warnings ul {
    margin: 0;
    padding-left: 20px;
  }

  .warnings li {
    font-size: 13px;
    color: #9c4221;
    margin-bottom: 4px;
  }

  /* Responsive design */
  @media (max-width: 480px) {
    .init-container {
      padding: 24px;
      margin: 16px;
    }

    .brand h1 {
      font-size: 24px;
    }

    .brand-icon {
      font-size: 28px;
    }

    .error-actions {
      flex-direction: column;
    }

    .retry-btn,
    .details-btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>