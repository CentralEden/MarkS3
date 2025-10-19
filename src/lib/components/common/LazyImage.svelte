<!--
  Lazy Loading Image Component
  Implements intersection observer for performance optimization
-->
<script lang="ts">
  import { onMount } from 'svelte';

  export let src: string;
  export let alt: string = '';
  export let className: string = '';
  export let placeholder: string = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjBmMGYwIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxvYWRpbmcuLi48L3RleHQ+PC9zdmc+';
  export let threshold: number = 0.1;
  export let rootMargin: string = '50px';

  let imgElement: HTMLImageElement;
  let loaded = false;
  let error = false;
  let observer: IntersectionObserver;

  onMount(() => {
    // Create intersection observer for lazy loading
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !loaded && !error) {
            loadImage();
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    if (imgElement) {
      observer.observe(imgElement);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  });

  function loadImage() {
    const img = new Image();
    
    img.onload = () => {
      loaded = true;
      error = false;
    };
    
    img.onerror = () => {
      error = true;
      loaded = false;
    };
    
    img.src = src;
  }

  function handleImageError() {
    error = true;
    loaded = false;
  }
</script>

<div class="lazy-image-container {className}">
  <img
    bind:this={imgElement}
    src={loaded ? src : placeholder}
    {alt}
    class="lazy-image"
    class:loaded
    class:error
    on:error={handleImageError}
    loading="lazy"
  />
  
  {#if error}
    <div class="error-overlay">
      <span class="error-icon">⚠️</span>
      <span class="error-text">Failed to load image</span>
    </div>
  {/if}
  
  {#if !loaded && !error}
    <div class="loading-overlay">
      <div class="loading-spinner"></div>
    </div>
  {/if}
</div>

<style>
  .lazy-image-container {
    position: relative;
    display: inline-block;
    overflow: hidden;
    border-radius: 4px;
  }

  .lazy-image {
    max-width: 100%;
    height: auto;
    transition: opacity 0.3s ease;
    opacity: 0;
  }

  .lazy-image.loaded {
    opacity: 1;
  }

  .lazy-image.error {
    opacity: 0.5;
  }

  .loading-overlay,
  .error-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(248, 249, 250, 0.9);
    backdrop-filter: blur(2px);
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid #e1e5e9;
    border-radius: 50%;
    border-top-color: #3182ce;
    animation: spin 1s linear infinite;
  }

  .error-overlay {
    flex-direction: column;
    gap: 8px;
    color: #e53e3e;
    font-size: 14px;
  }

  .error-icon {
    font-size: 24px;
  }

  .error-text {
    font-weight: 500;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Responsive behavior */
  @media (max-width: 768px) {
    .lazy-image-container {
      width: 100%;
    }
    
    .lazy-image {
      width: 100%;
    }
  }
</style>