<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { Editor, rootCtx, defaultValueCtx } from '@milkdown/core';
  import { commonmark } from '@milkdown/preset-commonmark';
  import { nord } from '@milkdown/theme-nord';
  import { listener, listenerCtx } from '@milkdown/plugin-listener';
  import { debounce } from '$lib/utils/debounce.js';

  const dispatch = createEventDispatcher<{
    change: { content: string };
    save: { content: string };
  }>();

  // Props
  export let content = '';
  export const placeholder = 'Start writing your markdown...';
  export let readonly = false;
  export let autofocus = false;
  export let debounceDelay = 300; // Debounce delay for change events in milliseconds

  // Component state
  let editorContainer: HTMLDivElement;
  let editor: Editor | null = null;
  let isInitialized = false;

  // Create debounced change handler
  const debouncedDispatch = debounce((content: string) => {
    dispatch('change', { content });
  }, debounceDelay);

  // Initialize the editor
  onMount(async () => {
    if (!editorContainer) return;

    try {
      editor = await Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, editorContainer);
          ctx.set(defaultValueCtx, content);
          
          // Set up debounced change listener
          ctx.get(listenerCtx).markdownUpdated((ctx, markdown) => {
            if (isInitialized) {
              debouncedDispatch(markdown);
            }
          });
        })
        .use(commonmark)
        .use(nord)
        .use(listener)
        .create();

      isInitialized = true;

      // Handle keyboard shortcuts
      editorContainer.addEventListener('keydown', handleKeyDown);

      if (autofocus) {
        // Focus the editor after a short delay
        setTimeout(() => {
          const prosemirrorEditor = editorContainer.querySelector('.ProseMirror');
          if (prosemirrorEditor) {
            (prosemirrorEditor as HTMLElement).focus();
          }
        }, 100);
      }

    } catch (error) {
      console.error('Failed to initialize Milkdown editor:', error);
    }
  });

  // Cleanup
  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }
    if (editorContainer) {
      editorContainer.removeEventListener('keydown', handleKeyDown);
    }
  });

  // Handle keyboard shortcuts
  function handleKeyDown(event: KeyboardEvent) {
    // Ctrl+S or Cmd+S to save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      handleSave();
    }
  }

  // Handle save action
  function handleSave() {
    if (editor) {
      const markdown = editor.action((ctx) => {
        const editorView = ctx.get(rootCtx);
        return editorView?.state.doc.textContent || '';
      });
      dispatch('save', { content: markdown });
    }
  }

  // Update editor content programmatically
  export function setContent(newContent: string) {
    if (editor && isInitialized) {
      editor.action((ctx) => {
        ctx.set(defaultValueCtx, newContent);
      });
    }
  }

  // Get current content
  export function getContent(): string {
    if (editor) {
      return editor.action((ctx) => {
        const editorView = ctx.get(rootCtx);
        return editorView?.state.doc.textContent || '';
      });
    }
    return '';
  }

  // Focus the editor
  export function focus() {
    if (editorContainer) {
      const prosemirrorEditor = editorContainer.querySelector('.ProseMirror');
      if (prosemirrorEditor) {
        (prosemirrorEditor as HTMLElement).focus();
      }
    }
  }

  // Set readonly mode
  export function setReadonly(isReadonly: boolean) {
    readonly = isReadonly;
    if (editor && editorContainer) {
      const prosemirrorEditor = editorContainer.querySelector('.ProseMirror');
      if (prosemirrorEditor) {
        (prosemirrorEditor as HTMLElement).contentEditable = (!isReadonly).toString();
      }
    }
  }
</script>

<div class="markdown-editor" class:readonly>
  <div class="editor-toolbar">
    <div class="toolbar-left">
      <span class="editor-title">Markdown Editor</span>
    </div>
    <div class="toolbar-right">
      {#if !readonly}
        <button 
          class="save-button"
          on:click={handleSave}
          title="Save (Ctrl+S)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17,21 17,13 7,13 7,21"/>
            <polyline points="7,3 7,8 15,8"/>
          </svg>
          Save
        </button>
      {/if}
    </div>
  </div>
  
  <div 
    class="editor-container"
    bind:this={editorContainer}
    class:readonly
  ></div>
</div>

<style>
  .markdown-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    background: white;
  }

  .markdown-editor.readonly {
    border-color: #d1d5db;
    background: #f9fafb;
  }

  .editor-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #f8fafc;
    border-bottom: 1px solid #e5e7eb;
  }

  .toolbar-left {
    display: flex;
    align-items: center;
  }

  .editor-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .save-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .save-button:hover {
    background: #2563eb;
  }

  .save-button:active {
    background: #1d4ed8;
  }

  .editor-container {
    flex: 1;
    overflow: auto;
    padding: 1rem;
  }

  .editor-container.readonly {
    background: #f9fafb;
  }

  /* Milkdown theme customizations */
  :global(.milkdown) {
    height: 100%;
  }

  :global(.milkdown .editor) {
    height: 100%;
    outline: none;
  }

  :global(.milkdown .ProseMirror) {
    height: 100%;
    outline: none;
    padding: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 1rem;
    line-height: 1.6;
    color: #374151;
  }

  :global(.milkdown .ProseMirror p) {
    margin: 0 0 1rem 0;
  }

  :global(.milkdown .ProseMirror h1) {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 1rem 0;
    color: #1f2937;
  }

  :global(.milkdown .ProseMirror h2) {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 0.75rem 0;
    color: #1f2937;
  }

  :global(.milkdown .ProseMirror h3) {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 0 0 0.75rem 0;
    color: #1f2937;
  }

  :global(.milkdown .ProseMirror ul, .milkdown .ProseMirror ol) {
    margin: 0 0 1rem 0;
    padding-left: 1.5rem;
  }

  :global(.milkdown .ProseMirror li) {
    margin: 0.25rem 0;
  }

  :global(.milkdown .ProseMirror blockquote) {
    border-left: 4px solid #e5e7eb;
    padding-left: 1rem;
    margin: 0 0 1rem 0;
    color: #6b7280;
    font-style: italic;
  }

  :global(.milkdown .ProseMirror code) {
    background: #f3f4f6;
    padding: 0.125rem 0.25rem;
    border-radius: 3px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875rem;
  }

  :global(.milkdown .ProseMirror pre) {
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 1rem;
    margin: 0 0 1rem 0;
    overflow-x: auto;
  }

  :global(.milkdown .ProseMirror pre code) {
    background: none;
    padding: 0;
    border-radius: 0;
  }

  /* Responsive design */
  @media (max-width: 640px) {
    .editor-toolbar {
      padding: 0.5rem;
    }

    .toolbar-left .editor-title {
      font-size: 0.8125rem;
    }

    .save-button {
      padding: 0.375rem 0.5rem;
      font-size: 0.8125rem;
    }

    .editor-container {
      padding: 0.75rem;
    }

    :global(.milkdown .ProseMirror) {
      font-size: 0.875rem;
    }

    :global(.milkdown .ProseMirror h1) {
      font-size: 1.75rem;
    }

    :global(.milkdown .ProseMirror h2) {
      font-size: 1.375rem;
    }

    :global(.milkdown .ProseMirror h3) {
      font-size: 1.125rem;
    }
  }
</style>