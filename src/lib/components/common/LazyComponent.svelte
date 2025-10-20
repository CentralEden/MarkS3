<script lang="ts">
  import { onMount } from 'svelte';
  import type { ComponentType } from 'svelte';

  export let loader: () => Promise<{ default: ComponentType }>;
  export let fallback: ComponentType | null = null;
  export let errorComponent: ComponentType | null = null;
  export let loadOnMount = true;
  export let intersectionOptions: IntersectionObserverInit = {};

  let component: ComponentType | null = null;
  let loading = false;
  let error: Error | null = null;
  let containerElement: HTMLElement;

  async function loadComponent() {
    if (component || loading) return;
    
    loading = true;
    error = null;

    try {
      const module = await loader();
      component = module.default;
    } catch (err) {
      error = err instanceof Error ? err : new Error('Failed to load component');
      console.error('LazyComponent: Failed to load component', error);
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    if (loadOnMount) {
      loadComponent();
    } else if (intersectionOptions && containerElement) {
      // Use intersection observer for lazy loading
      const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              observer.unobserve(entry.target);
              loadComponent();
              break;
            }
          }
        },
        {
          rootMargin: '50px',
          threshold: 0.1,
          ...intersectionOptions
        }
      );

      observer.observe(containerElement);

      return () => {
        observer.disconnect();
      };
    }
  });

  // Expose load function for manual triggering
  export function load() {
    return loadComponent();
  }
</script>

<div bind:this={containerElement} class="lazy-component-container">
  {#if loading}
    {#if fallback}
      <svelte:component this={fallback} />
    {:else}
      <div class="lazy-loading">
        <div class="loading-spinner"></div>
        <span>Loading...</span>
      </div>
    {/if}
  {:else if error}
    {#if errorComponent}
      <svelte:component this={errorComponent} {error} />
    {:else}
      <div class="lazy-error">
        <p>Failed to load component</p>
        <button on:click={loadComponent}>Retry</button>
      </div>
    {/if}
  {:else if component}
    <svelte:component this={component} {...$$restProps} />
  {:else if !loadOnMount}
    {#if fallback}
      <svelte:component this={fallback} />
    {:else}
      <div class="lazy-placeholder">
        <button on:click={loadComponent}>Load Component</button>
      </div>
    {/if}
  {/if}
</div>

<style>
  .lazy-component-container {
    min-height: 2rem;
  }

  .lazy-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    color: var(--text-secondary, #666);
  }

  .loading-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid var(--border-color, #e0e0e0);
    border-top: 2px solid var(--primary-color, #007acc);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .lazy-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1rem;
    color: var(--error-color, #d32f2f);
    border: 1px solid var(--error-color, #d32f2f);
    border-radius: 4px;
    background-color: var(--error-bg, #ffebee);
  }

  .lazy-error button {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--error-color, #d32f2f);
    background: transparent;
    color: var(--error-color, #d32f2f);
    border-radius: 4px;
    cursor: pointer;
  }

  .lazy-error button:hover {
    background-color: var(--error-color, #d32f2f);
    color: white;
  }

  .lazy-placeholder {
    display: flex;
    justify-content: center;
    padding: 1rem;
  }

  .lazy-placeholder button {
    padding: 0.5rem 1rem;
    border: 1px solid var(--primary-color, #007acc);
    background: transparent;
    color: var(--primary-color, #007acc);
    border-radius: 4px;
    cursor: pointer;
  }

  .lazy-placeholder button:hover {
    background-color: var(--primary-color, #007acc);
    color: white;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
</style>