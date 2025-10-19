<script lang="ts">
  import { onMount } from 'svelte';
  import { sanitizeHTML } from '../../utils/security.js';

  // Props
  export let content = '';
  export let title = 'Preview';

  // Component state
  let previewContainer: HTMLDivElement;
  let renderedHTML = '';

  // Simple markdown to HTML converter
  // In a production app, you might want to use a more robust markdown parser
  function markdownToHTML(markdown: string): string {
    if (!markdown.trim()) {
      return '<p class="empty-state">Nothing to preview yet. Start writing in the editor!</p>';
    }

    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      
      // Bold and italic
      .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      
      // Code blocks
      .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" />')
      
      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      
      // Unordered lists
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>')
      
      // Ordered lists
      .replace(/^\d+\. (.*$)/gim, '<li>$1</li>')
      
      // Horizontal rules
      .replace(/^---$/gim, '<hr>')
      
      // Line breaks
      .replace(/\n\n/gim, '</p><p>')
      .replace(/\n/gim, '<br>');

    // Wrap in paragraphs if not already wrapped
    if (!html.startsWith('<')) {
      html = '<p>' + html + '</p>';
    }

    // Clean up multiple paragraph tags
    html = html
      .replace(/<p><\/p>/gim, '')
      .replace(/<p>(<h[1-6]>)/gim, '$1')
      .replace(/(<\/h[1-6]>)<\/p>/gim, '$1')
      .replace(/<p>(<ul>)/gim, '$1')
      .replace(/(<\/ul>)<\/p>/gim, '$1')
      .replace(/<p>(<ol>)/gim, '$1')
      .replace(/(<\/ol>)<\/p>/gim, '$1')
      .replace(/<p>(<blockquote>)/gim, '$1')
      .replace(/(<\/blockquote>)<\/p>/gim, '$1')
      .replace(/<p>(<pre>)/gim, '$1')
      .replace(/(<\/pre>)<\/p>/gim, '$1')
      .replace(/<p>(<hr>)/gim, '$1')
      .replace(/(<hr>)<\/p>/gim, '$1');

    return html;
  }

  // Update rendered HTML when content changes
  $: {
    const rawHTML = markdownToHTML(content);
    renderedHTML = sanitizeHTML(rawHTML);
  }

  // Scroll to top when content changes significantly
  function scrollToTop() {
    if (previewContainer) {
      previewContainer.scrollTop = 0;
    }
  }

  // Export function to scroll to top
  export { scrollToTop };
</script>

<div class="markdown-preview">
  <div class="preview-toolbar">
    <div class="toolbar-left">
      <span class="preview-title">{title}</span>
    </div>
    <div class="toolbar-right">
      <button 
        class="scroll-top-button"
        on:click={scrollToTop}
        title="Scroll to top"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 15l-6-6-6 6"/>
        </svg>
      </button>
    </div>
  </div>
  
  <div 
    class="preview-container"
    bind:this={previewContainer}
  >
    <div class="preview-content">
      {@html renderedHTML}
    </div>
  </div>
</div>

<style>
  .markdown-preview {
    display: flex;
    flex-direction: column;
    height: 100%;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    background: white;
  }

  .preview-toolbar {
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

  .preview-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
  }

  .scroll-top-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: #f3f4f6;
    color: #6b7280;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .scroll-top-button:hover {
    background: #e5e7eb;
    color: #374151;
  }

  .preview-container {
    flex: 1;
    overflow: auto;
    padding: 1rem;
    background: white;
  }

  .preview-content {
    max-width: none;
  }

  /* Preview content styling */
  :global(.preview-content .empty-state) {
    color: #9ca3af;
    font-style: italic;
    text-align: center;
    padding: 2rem;
  }

  :global(.preview-content h1) {
    font-size: 2rem;
    font-weight: 700;
    margin: 0 0 1rem 0;
    color: #1f2937;
    line-height: 1.2;
  }

  :global(.preview-content h2) {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 1.5rem 0 0.75rem 0;
    color: #1f2937;
    line-height: 1.3;
  }

  :global(.preview-content h3) {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 1.25rem 0 0.75rem 0;
    color: #1f2937;
    line-height: 1.4;
  }

  :global(.preview-content h4) {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 1rem 0 0.5rem 0;
    color: #1f2937;
  }

  :global(.preview-content h5) {
    font-size: 1rem;
    font-weight: 600;
    margin: 1rem 0 0.5rem 0;
    color: #1f2937;
  }

  :global(.preview-content h6) {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 1rem 0 0.5rem 0;
    color: #1f2937;
  }

  :global(.preview-content p) {
    margin: 0 0 1rem 0;
    line-height: 1.6;
    color: #374151;
  }

  :global(.preview-content ul, .preview-content ol) {
    margin: 0 0 1rem 0;
    padding-left: 1.5rem;
  }

  :global(.preview-content li) {
    margin: 0.25rem 0;
    line-height: 1.6;
    color: #374151;
  }

  :global(.preview-content blockquote) {
    border-left: 4px solid #e5e7eb;
    padding-left: 1rem;
    margin: 0 0 1rem 0;
    color: #6b7280;
    font-style: italic;
  }

  :global(.preview-content code) {
    background: #f3f4f6;
    padding: 0.125rem 0.25rem;
    border-radius: 3px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 0.875rem;
    color: #dc2626;
  }

  :global(.preview-content pre) {
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 1rem;
    margin: 0 0 1rem 0;
    overflow-x: auto;
  }

  :global(.preview-content pre code) {
    background: none;
    padding: 0;
    border-radius: 0;
    color: #374151;
  }

  :global(.preview-content a) {
    color: #3b82f6;
    text-decoration: underline;
    transition: color 0.2s;
  }

  :global(.preview-content a:hover) {
    color: #2563eb;
  }

  :global(.preview-content img) {
    max-width: 100%;
    height: auto;
    border-radius: 6px;
    margin: 0.5rem 0;
  }

  :global(.preview-content hr) {
    border: none;
    border-top: 1px solid #e5e7eb;
    margin: 2rem 0;
  }

  :global(.preview-content table) {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 1rem 0;
  }

  :global(.preview-content th, .preview-content td) {
    border: 1px solid #e5e7eb;
    padding: 0.5rem;
    text-align: left;
  }

  :global(.preview-content th) {
    background: #f8fafc;
    font-weight: 600;
  }

  /* Responsive design */
  @media (max-width: 640px) {
    .preview-toolbar {
      padding: 0.5rem;
    }

    .preview-title {
      font-size: 0.8125rem;
    }

    .preview-container {
      padding: 0.75rem;
    }

    :global(.preview-content h1) {
      font-size: 1.75rem;
    }

    :global(.preview-content h2) {
      font-size: 1.375rem;
    }

    :global(.preview-content h3) {
      font-size: 1.125rem;
    }

    :global(.preview-content pre) {
      padding: 0.75rem;
      font-size: 0.8125rem;
    }
  }
</style>