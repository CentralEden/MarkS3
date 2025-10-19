<!--
  Application Footer
  Displays copyright and system information
-->
<script lang="ts">
  import { onMount } from 'svelte';
  
  let currentYear = new Date().getFullYear();
  let version = '1.0.0'; // This could be loaded from package.json or environment
  
  onMount(() => {
    // Update year if needed
    currentYear = new Date().getFullYear();
  });
</script>

<footer class="app-footer">
  <div class="footer-content">
    <div class="footer-info">
      <div class="footer-brand">
        <span class="brand-icon">📚</span>
        <span class="brand-text">MarkS3 Wiki</span>
        <span class="version">v{version}</span>
      </div>
      <p class="footer-description">
        Serverless markdown wiki system powered by AWS S3 and Cognito
      </p>
    </div>
    
    <div class="footer-links">
      <div class="link-group">
        <h4>Resources</h4>
        <a href="https://github.com/your-repo/marks3" target="_blank" rel="noopener noreferrer">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/>
          </svg>
          GitHub
        </a>
        <a href="/docs" target="_blank">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
          </svg>
          Documentation
        </a>
      </div>
      
      <div class="link-group">
        <h4>Technology</h4>
        <a href="https://kit.svelte.dev" target="_blank" rel="noopener noreferrer">SvelteKit</a>
        <a href="https://aws.amazon.com/s3/" target="_blank" rel="noopener noreferrer">AWS S3</a>
        <a href="https://aws.amazon.com/cognito/" target="_blank" rel="noopener noreferrer">AWS Cognito</a>
        <a href="https://milkdown.dev" target="_blank" rel="noopener noreferrer">Milkdown</a>
      </div>
    </div>
  </div>
  
  <div class="footer-bottom">
    <div class="footer-bottom-content">
      <p class="copyright">
        © {currentYear} MarkS3 Wiki. Open source under MIT License.
      </p>
      <div class="footer-status">
        <span class="status-indicator" title="System Status">
          <span class="status-dot"></span>
          Operational
        </span>
      </div>
    </div>
  </div>
</footer>

<style>
  .app-footer {
    background: var(--bg-primary, #ffffff);
    border-top: 1px solid var(--border-color, #e1e5e9);
    margin-top: auto;
  }

  .footer-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 40px 20px 20px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 40px;
    align-items: start;
  }

  .footer-info {
    max-width: 400px;
  }

  .footer-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .brand-icon {
    font-size: 20px;
  }

  .brand-text {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary, #2d3748);
  }

  .version {
    font-size: 12px;
    color: var(--text-secondary, #718096);
    background: var(--bg-secondary, #f7fafc);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .footer-description {
    margin: 0;
    font-size: 14px;
    color: var(--text-secondary, #718096);
    line-height: 1.6;
  }

  .footer-links {
    display: flex;
    gap: 40px;
  }

  .link-group h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary, #2d3748);
  }

  .link-group a {
    display: flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
    color: var(--text-secondary, #718096);
    font-size: 13px;
    margin-bottom: 8px;
    transition: color 0.2s ease;
  }

  .link-group a:hover {
    color: var(--primary-color, #3182ce);
  }

  .link-group a svg {
    width: 14px;
    height: 14px;
  }

  .footer-bottom {
    border-top: 1px solid var(--border-color, #e1e5e9);
    background: var(--bg-secondary, #f7fafc);
  }

  .footer-bottom-content {
    max-width: 1200px;
    margin: 0 auto;
    padding: 16px 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .copyright {
    margin: 0;
    font-size: 12px;
    color: var(--text-secondary, #718096);
  }

  .footer-status {
    display: flex;
    align-items: center;
  }

  .status-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--success-color, #38a169);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--success-color, #38a169);
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(56, 161, 105, 0.7);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(56, 161, 105, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(56, 161, 105, 0);
    }
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .footer-content {
      grid-template-columns: 1fr;
      gap: 30px;
      padding: 30px 16px 20px;
    }

    .footer-links {
      gap: 30px;
    }

    .footer-bottom-content {
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      text-align: center;
    }
  }

  @media (max-width: 480px) {
    .footer-links {
      flex-direction: column;
      gap: 20px;
    }

    .footer-brand {
      justify-content: center;
    }

    .footer-description {
      text-align: center;
    }
  }
</style>