/**
 * Text formatting utilities
 */

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format date in readable format
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Extract title from markdown content
 */
export function extractTitleFromMarkdown(content: string): string {
  // Look for first H1 heading
  const h1Match = content.match(/^#\s+(.+)$/m);
  if (h1Match) {
    return h1Match[1].trim();
  }
  
  // Look for first H2 heading if no H1
  const h2Match = content.match(/^##\s+(.+)$/m);
  if (h2Match) {
    return h2Match[1].trim();
  }
  
  // Return first line if no headings found
  const firstLine = content.split('\n')[0];
  return firstLine.trim() || 'Untitled';
}

/**
 * Generate page path from title
 */
export function generatePagePath(title: string, parentPath?: string): string {
  // Convert title to kebab-case
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
  
  const filename = `${slug}.md`;
  
  if (parentPath && parentPath !== '/') {
    return `${parentPath.replace(/\/$/, '')}/${filename}`;
  }
  
  return filename;
}

/**
 * Get breadcrumb path from page path
 */
export function getBreadcrumbs(pagePath: string): Array<{ name: string; path: string }> {
  const parts = pagePath.replace(/\.md$/, '').split('/').filter(Boolean);
  const breadcrumbs: Array<{ name: string; path: string }> = [];
  
  let currentPath = '';
  for (const part of parts) {
    currentPath += (currentPath ? '/' : '') + part;
    breadcrumbs.push({
      name: part.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      path: currentPath + '.md'
    });
  }
  
  return breadcrumbs;
}