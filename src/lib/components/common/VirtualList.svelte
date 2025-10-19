<!--
  Virtual List Component
  Renders only visible items for performance optimization with large lists
-->
<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { rafDebounce } from '$lib/utils/debounce.js';

  type Item = any;

  export let items: Item[] = [];
  export let itemHeight: number = 50;
  export let containerHeight: number = 400;
  export let overscan: number = 5; // Number of items to render outside visible area
  export let getItemKey: (item: Item, index: number) => string | number = (_, index) => index;

  const dispatch = createEventDispatcher<{
    itemClick: { item: Item; index: number };
    scroll: { scrollTop: number; scrollLeft: number };
  }>();

  let container: HTMLDivElement;
  let scrollTop = 0;
  let scrollLeft = 0;
  let containerWidth = 0;

  // Calculate visible range
  $: visibleStart = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  $: visibleEnd = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );
  $: visibleItems = items.slice(visibleStart, visibleEnd);
  $: totalHeight = items.length * itemHeight;
  $: offsetY = visibleStart * itemHeight;

  // Debounced scroll handler for performance
  const handleScroll = rafDebounce(() => {
    if (container) {
      scrollTop = container.scrollTop;
      scrollLeft = container.scrollLeft;
      dispatch('scroll', { scrollTop, scrollLeft });
    }
  });

  // Handle item click
  function handleItemClick(item: Item, relativeIndex: number) {
    const actualIndex = visibleStart + relativeIndex;
    dispatch('itemClick', { item, index: actualIndex });
  }

  // Scroll to specific item
  export function scrollToItem(index: number, behavior: ScrollBehavior = 'smooth') {
    if (container && index >= 0 && index < items.length) {
      const targetScrollTop = index * itemHeight;
      container.scrollTo({
        top: targetScrollTop,
        behavior
      });
    }
  }

  // Scroll to top
  export function scrollToTop(behavior: ScrollBehavior = 'smooth') {
    if (container) {
      container.scrollTo({
        top: 0,
        behavior
      });
    }
  }

  // Get current scroll position
  export function getScrollPosition() {
    return { scrollTop, scrollLeft };
  }

  onMount(() => {
    if (container) {
      containerWidth = container.clientWidth;
      
      // Set up resize observer to handle container size changes
      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          containerWidth = entry.contentRect.width;
          containerHeight = entry.contentRect.height;
        }
      });
      
      resizeObserver.observe(container);
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  });
</script>

<div
  class="virtual-list"
  bind:this={container}
  on:scroll={handleScroll}
  style="height: {containerHeight}px;"
>
  <div class="virtual-list-spacer" style="height: {totalHeight}px;">
    <div class="virtual-list-items" style="transform: translateY({offsetY}px);">
      {#each visibleItems as item, index (getItemKey(item, visibleStart + index))}
        <div
          class="virtual-list-item"
          style="height: {itemHeight}px;"
          on:click={() => handleItemClick(item, index)}
          on:keydown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleItemClick(item, index);
            }
          }}
          role="button"
          tabindex="0"
        >
          <slot {item} index={visibleStart + index} />
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .virtual-list {
    overflow: auto;
    position: relative;
  }

  .virtual-list-spacer {
    position: relative;
  }

  .virtual-list-items {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
  }

  .virtual-list-item {
    display: flex;
    align-items: center;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .virtual-list-item:hover {
    background-color: rgba(0, 0, 0, 0.04);
  }

  .virtual-list-item:focus {
    outline: 2px solid #3b82f6;
    outline-offset: -2px;
    background-color: rgba(59, 130, 246, 0.1);
  }

  /* Scrollbar styling */
  .virtual-list::-webkit-scrollbar {
    width: 8px;
    height: 8px;
  }

  .virtual-list::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 4px;
  }

  .virtual-list::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 4px;
  }

  .virtual-list::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
</style>