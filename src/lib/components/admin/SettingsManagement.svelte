<!--
  Settings Management Component
  Provides interface for admin users to manage wiki configuration
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import type { WikiConfig } from '$lib/types/wiki.js';
  import { 
    configManagementService, 
    configStore, 
    configChangeStore,
    type ConfigChangeEvent 
  } from '$lib/services/configManagement.js';
  import { WikiError } from '$lib/types/errors.js';

  // State
  let config: WikiConfig | null = null;
  let loading = false;
  let saving = false;
  let error: string | null = null;
  let successMessage: string | null = null;
  let hasUnsavedChanges = false;
  let lastSaved: Date | null = null;

  // Form data (separate from config to track changes)
  let formData = {
    title: '',
    description: '',
    allowGuestAccess: false,
    theme: 'default',
    features: {
      fileUpload: true,
      userManagement: true
    }
  };

  // Original config for comparison
  let originalConfig: WikiConfig | null = null;

  // Subscribe to config store
  const unsubscribeConfig = configStore.subscribe(($config) => {
    if ($config) {
      config = $config;
      updateFormData($config);
      originalConfig = JSON.parse(JSON.stringify($config)); // Deep copy
    }
  });

  // Subscribe to config changes
  const unsubscribeChanges = configChangeStore.subscribe(($change: ConfigChangeEvent | null) => {
    if ($change) {
      lastSaved = $change.timestamp;
      successMessage = 'Configuration saved successfully';
      setTimeout(() => {
        successMessage = null;
      }, 3000);
    }
  });

  // Load configuration on mount
  onMount(async () => {
    await loadConfig();
    
    // Cleanup subscriptions
    return () => {
      unsubscribeConfig();
      unsubscribeChanges();
    };
  });

  /**
   * Load configuration from service
   */
  async function loadConfig() {
    loading = true;
    error = null;

    try {
      const loadedConfig = await configManagementService.getConfig();
      config = loadedConfig;
      updateFormData(loadedConfig);
      originalConfig = JSON.parse(JSON.stringify(loadedConfig));
      hasUnsavedChanges = false;
    } catch (err) {
      console.error('Failed to load config:', err);
      error = err instanceof WikiError ? err.message : 'Failed to load configuration';
    } finally {
      loading = false;
    }
  }

  /**
   * Update form data from config
   */
  function updateFormData(configData: WikiConfig) {
    formData = {
      title: configData.title,
      description: configData.description,
      allowGuestAccess: configData.allowGuestAccess,
      theme: configData.theme,
      features: { ...configData.features }
    };
  }

  /**
   * Check if there are unsaved changes
   */
  function checkForChanges() {
    if (!originalConfig) return;
    
    hasUnsavedChanges = (
      formData.title !== originalConfig.title ||
      formData.description !== originalConfig.description ||
      formData.allowGuestAccess !== originalConfig.allowGuestAccess ||
      formData.theme !== originalConfig.theme ||
      formData.features.fileUpload !== originalConfig.features.fileUpload ||
      formData.features.userManagement !== originalConfig.features.userManagement
    );
  }

  /**
   * Save configuration
   */
  async function saveConfig() {
    if (!hasUnsavedChanges) return;

    saving = true;
    error = null;
    successMessage = null;

    try {
      const updatedConfig: WikiConfig = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        allowGuestAccess: formData.allowGuestAccess,
        theme: formData.theme,
        features: { ...formData.features }
      };

      await configManagementService.saveConfig(updatedConfig);
      
      // Update original config and reset change tracking
      originalConfig = JSON.parse(JSON.stringify(updatedConfig));
      hasUnsavedChanges = false;
      
    } catch (err) {
      console.error('Failed to save config:', err);
      error = err instanceof WikiError ? err.message : 'Failed to save configuration';
    } finally {
      saving = false;
    }
  }

  /**
   * Reset form to original values
   */
  function resetForm() {
    if (originalConfig) {
      updateFormData(originalConfig);
      hasUnsavedChanges = false;
      error = null;
      successMessage = null;
    }
  }

  /**
   * Reset to default configuration
   */
  async function resetToDefaults() {
    if (!confirm('Are you sure you want to reset all settings to their default values? This action cannot be undone.')) {
      return;
    }

    saving = true;
    error = null;
    successMessage = null;

    try {
      await configManagementService.resetToDefaults();
      await loadConfig(); // Reload to get the new defaults
    } catch (err) {
      console.error('Failed to reset to defaults:', err);
      error = err instanceof WikiError ? err.message : 'Failed to reset configuration';
    } finally {
      saving = false;
    }
  }

  /**
   * Quick toggle for guest access
   */
  async function toggleGuestAccess() {
    saving = true;
    error = null;

    try {
      await configManagementService.updateGuestAccess(!formData.allowGuestAccess);
      formData.allowGuestAccess = !formData.allowGuestAccess;
      checkForChanges();
    } catch (err) {
      console.error('Failed to toggle guest access:', err);
      error = err instanceof WikiError ? err.message : 'Failed to update guest access';
    } finally {
      saving = false;
    }
  }

  // Reactive statements
  $: checkForChanges();
</script>

<div class="settings-management">
  <header class="section-header">
    <div>
      <h2>Wiki Settings</h2>
      <p class="subtitle">Configure your wiki's behavior and appearance</p>
    </div>
    <div class="header-actions">
      {#if lastSaved}
        <span class="last-saved">Last saved: {lastSaved.toLocaleString()}</span>
      {/if}
    </div>
  </header>

  {#if error}
    <div class="error-message">
      {error}
      <button class="btn-close" on:click={() => error = null}>×</button>
    </div>
  {/if}

  {#if successMessage}
    <div class="success-message">
      {successMessage}
      <button class="btn-close" on:click={() => successMessage = null}>×</button>
    </div>
  {/if}

  {#if loading}
    <div class="loading">Loading configuration...</div>
  {:else if config}
    <form on:submit|preventDefault={saveConfig} class="settings-form">
      <!-- Basic Settings -->
      <section class="settings-section">
        <h3>Basic Information</h3>
        
        <div class="form-group">
          <label for="wiki-title">Wiki Title</label>
          <input 
            id="wiki-title"
            type="text" 
            bind:value={formData.title}
            placeholder="Enter wiki title"
            maxlength="100"
            required
            disabled={saving}
          />
          <small class="help-text">The title displayed in the browser and header</small>
        </div>
        
        <div class="form-group">
          <label for="wiki-description">Description</label>
          <textarea 
            id="wiki-description"
            bind:value={formData.description}
            placeholder="Enter wiki description"
            maxlength="500"
            rows="3"
            disabled={saving}
          ></textarea>
          <small class="help-text">A brief description of your wiki's purpose</small>
        </div>
      </section>

      <!-- Access Control -->
      <section class="settings-section">
        <h3>Access Control</h3>
        
        <div class="form-group">
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                bind:checked={formData.allowGuestAccess}
                disabled={saving}
              />
              <span class="checkbox-text">
                <strong>Allow Guest Access</strong>
                <small>Allow unauthenticated users to read wiki pages</small>
              </span>
            </label>
          </div>
          
          <div class="quick-action">
            <button 
              type="button" 
              class="btn btn-secondary btn-sm"
              on:click={toggleGuestAccess}
              disabled={saving}
            >
              {formData.allowGuestAccess ? 'Disable' : 'Enable'} Guest Access
            </button>
          </div>
        </div>
      </section>

      <!-- Appearance -->
      <section class="settings-section">
        <h3>Appearance</h3>
        
        <div class="form-group">
          <label for="theme">Theme</label>
          <select id="theme" bind:value={formData.theme} disabled={saving}>
            <option value="default">Default</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
          <small class="help-text">Choose the visual theme for your wiki</small>
        </div>
      </section>

      <!-- Features -->
      <section class="settings-section">
        <h3>Features</h3>
        
        <div class="form-group">
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                bind:checked={formData.features.fileUpload}
                disabled={saving}
              />
              <span class="checkbox-text">
                <strong>File Upload</strong>
                <small>Allow users to upload and attach files to pages</small>
              </span>
            </label>
          </div>
        </div>
        
        <div class="form-group">
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input 
                type="checkbox" 
                bind:checked={formData.features.userManagement}
                disabled={saving}
              />
              <span class="checkbox-text">
                <strong>User Management</strong>
                <small>Enable user management features for administrators</small>
              </span>
            </label>
          </div>
        </div>
      </section>

      <!-- Actions -->
      <div class="form-actions">
        <div class="action-group">
          <button 
            type="button" 
            class="btn btn-secondary"
            on:click={resetForm}
            disabled={saving || !hasUnsavedChanges}
          >
            Reset Changes
          </button>
          
          <button 
            type="submit" 
            class="btn btn-primary"
            disabled={saving || !hasUnsavedChanges}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
        
        <div class="danger-zone">
          <button 
            type="button" 
            class="btn btn-danger btn-sm"
            on:click={resetToDefaults}
            disabled={saving}
          >
            Reset to Defaults
          </button>
        </div>
      </div>
      
      {#if hasUnsavedChanges}
        <div class="unsaved-notice">
          <span class="warning-icon">⚠️</span>
          You have unsaved changes
        </div>
      {/if}
    </form>
  {:else}
    <div class="no-config">
      <p>No configuration found. Please check your connection and try again.</p>
      <button class="btn btn-primary" on:click={loadConfig}>Retry</button>
    </div>
  {/if}
</div>

<style>
  .settings-management {
    max-width: 800px;
    margin: 0 auto;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
  }

  .section-header h2 {
    color: #374151;
    margin: 0 0 0.5rem 0;
  }

  .subtitle {
    color: #6b7280;
    margin: 0;
    font-size: 0.875rem;
  }

  .last-saved {
    color: #6b7280;
    font-size: 0.75rem;
  }

  .error-message, .success-message {
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .error-message {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
  }

  .success-message {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #16a34a;
  }

  .loading, .no-config {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
  }

  .settings-form {
    background: white;
    border-radius: 0.5rem;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .settings-section {
    padding: 2rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .settings-section:last-child {
    border-bottom: none;
  }

  .settings-section h3 {
    color: #111827;
    margin: 0 0 1.5rem 0;
    font-size: 1.125rem;
    font-weight: 600;
  }

  .form-group {
    margin-bottom: 1.5rem;
  }

  .form-group:last-child {
    margin-bottom: 0;
  }

  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #374151;
  }

  .form-group input[type="text"],
  .form-group textarea,
  .form-group select {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    transition: border-color 0.2s;
  }

  .form-group input:focus,
  .form-group textarea:focus,
  .form-group select:focus {
    outline: none;
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
  }

  .help-text {
    display: block;
    margin-top: 0.25rem;
    color: #6b7280;
    font-size: 0.75rem;
  }

  .checkbox-group {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .checkbox-label {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    cursor: pointer;
    font-weight: normal;
    margin-bottom: 0;
  }

  .checkbox-label input[type="checkbox"] {
    margin: 0;
    width: auto;
  }

  .checkbox-text {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .checkbox-text strong {
    color: #111827;
  }

  .checkbox-text small {
    color: #6b7280;
    font-size: 0.75rem;
  }

  .quick-action {
    margin-top: 0.75rem;
  }

  .form-actions {
    padding: 2rem;
    background: #f9fafb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .action-group {
    display: flex;
    gap: 1rem;
  }

  .danger-zone {
    display: flex;
    align-items: center;
  }

  .unsaved-notice {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: #fbbf24;
    color: #92400e;
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .warning-icon {
    font-size: 1rem;
  }

  /* Button styles */
  .btn {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background: #2563eb;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background: #1d4ed8;
  }

  .btn-secondary {
    background: #f3f4f6;
    color: #374151;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #e5e7eb;
  }

  .btn-danger {
    background: #dc2626;
    color: white;
  }

  .btn-danger:hover:not(:disabled) {
    background: #b91c1c;
  }

  .btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
  }

  .btn-close {
    background: none;
    border: none;
    font-size: 1.5rem;
    cursor: pointer;
    color: inherit;
    opacity: 0.7;
    padding: 0;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .btn-close:hover {
    opacity: 1;
  }
</style>