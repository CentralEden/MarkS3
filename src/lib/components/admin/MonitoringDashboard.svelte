<script lang="ts">
  import { onMount } from 'svelte';
  import { monitoringService } from '$lib/services/monitoring';
  import type { ErrorEvent, PerformanceMetric, DeploymentMetric } from '$lib/services/monitoring';

  let monitoringData: any[] = [];
  let isLoading = true;
  let selectedTab = 'overview';
  let errorEvents: ErrorEvent[] = [];
  let performanceMetrics: PerformanceMetric[] = [];
  let deploymentMetrics: DeploymentMetric[] = [];

  onMount(() => {
    loadMonitoringData();
  });

  function loadMonitoringData() {
    try {
      monitoringData = monitoringService.getStoredData();
      
      // Process and categorize data
      errorEvents = [];
      performanceMetrics = [];
      deploymentMetrics = [];

      monitoringData.forEach(session => {
        if (session.errors) {
          errorEvents.push(...session.errors);
        }
        if (session.metrics) {
          performanceMetrics.push(...session.metrics);
        }
        if (session.deploymentMetrics) {
          deploymentMetrics.push(...session.deploymentMetrics);
        }
      });

      // Sort by timestamp (newest first)
      errorEvents.sort((a, b) => b.timestamp - a.timestamp);
      performanceMetrics.sort((a, b) => b.timestamp - a.timestamp);
      deploymentMetrics.sort((a, b) => b.timestamp - a.timestamp);

    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      isLoading = false;
    }
  }

  function clearData() {
    if (confirm('Are you sure you want to clear all monitoring data?')) {
      monitoringService.clearStoredData();
      loadMonitoringData();
    }
  }

  function formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString();
  }

  function formatDuration(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  }

  function getSuccessRate(metrics: DeploymentMetric[]): number {
    if (metrics.length === 0) return 0;
    const successful = metrics.filter(m => m.success).length;
    return Math.round((successful / metrics.length) * 100);
  }

  function getAverageMetric(metrics: PerformanceMetric[], name: string): number {
    const filtered = metrics.filter(m => m.name === name);
    if (filtered.length === 0) return 0;
    const sum = filtered.reduce((acc, m) => acc + m.value, 0);
    return Math.round(sum / filtered.length);
  }

  $: isMonitoringEnabled = monitoringService.isMonitoringEnabled();
  $: sessionId = monitoringService.getSessionId();
</script>

<div class="monitoring-dashboard">
  <div class="dashboard-header">
    <h2>Monitoring Dashboard</h2>
    <div class="header-actions">
      <span class="status {isMonitoringEnabled ? 'enabled' : 'disabled'}">
        Monitoring: {isMonitoringEnabled ? 'Enabled' : 'Disabled'}
      </span>
      <button on:click={loadMonitoringData} class="btn-secondary">Refresh</button>
      <button on:click={clearData} class="btn-danger">Clear Data</button>
    </div>
  </div>

  {#if !isMonitoringEnabled}
    <div class="warning-banner">
      <p>Monitoring is currently disabled. Enable it by setting VITE_ENABLE_MONITORING=true in your environment.</p>
    </div>
  {/if}

  <div class="session-info">
    <p><strong>Current Session:</strong> {sessionId}</p>
    <p><strong>Total Sessions:</strong> {monitoringData.length}</p>
  </div>

  <div class="tabs">
    <button 
      class="tab {selectedTab === 'overview' ? 'active' : ''}"
      on:click={() => selectedTab = 'overview'}
    >
      Overview
    </button>
    <button 
      class="tab {selectedTab === 'errors' ? 'active' : ''}"
      on:click={() => selectedTab = 'errors'}
    >
      Errors ({errorEvents.length})
    </button>
    <button 
      class="tab {selectedTab === 'performance' ? 'active' : ''}"
      on:click={() => selectedTab = 'performance'}
    >
      Performance
    </button>
    <button 
      class="tab {selectedTab === 'deployment' ? 'active' : ''}"
      on:click={() => selectedTab = 'deployment'}
    >
      Deployment
    </button>
  </div>

  <div class="tab-content">
    {#if isLoading}
      <div class="loading">Loading monitoring data...</div>
    {:else if selectedTab === 'overview'}
      <div class="overview-grid">
        <div class="metric-card">
          <h3>Error Rate</h3>
          <div class="metric-value {errorEvents.length > 0 ? 'error' : 'success'}">
            {errorEvents.length} errors
          </div>
        </div>
        
        <div class="metric-card">
          <h3>Page Load Success</h3>
          <div class="metric-value">
            {getSuccessRate(deploymentMetrics.filter(m => m.type === 'page_load'))}%
          </div>
        </div>
        
        <div class="metric-card">
          <h3>Auth Success</h3>
          <div class="metric-value">
            {getSuccessRate(deploymentMetrics.filter(m => m.type === 'auth_success'))}%
          </div>
        </div>
        
        <div class="metric-card">
          <h3>File Operations</h3>
          <div class="metric-value">
            {getSuccessRate(deploymentMetrics.filter(m => m.type === 'file_operation'))}%
          </div>
        </div>
        
        <div class="metric-card">
          <h3>Avg Page Load</h3>
          <div class="metric-value">
            {formatDuration(getAverageMetric(performanceMetrics, 'Page_Load_Time'))}
          </div>
        </div>
        
        <div class="metric-card">
          <h3>Avg LCP</h3>
          <div class="metric-value">
            {formatDuration(getAverageMetric(performanceMetrics, 'LCP'))}
          </div>
        </div>
      </div>
    {:else if selectedTab === 'errors'}
      <div class="errors-list">
        {#if errorEvents.length === 0}
          <p class="no-data">No errors recorded</p>
        {:else}
          {#each errorEvents.slice(0, 50) as error}
            <div class="error-item">
              <div class="error-header">
                <span class="error-message">{error.message}</span>
                <span class="error-time">{formatTimestamp(error.timestamp)}</span>
              </div>
              <div class="error-details">
                <p><strong>URL:</strong> {error.url}</p>
                {#if error.line}
                  <p><strong>Line:</strong> {error.line}:{error.column || 0}</p>
                {/if}
                {#if error.userId}
                  <p><strong>User:</strong> {error.userId}</p>
                {/if}
                {#if error.stack}
                  <details>
                    <summary>Stack Trace</summary>
                    <pre class="stack-trace">{error.stack}</pre>
                  </details>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    {:else if selectedTab === 'performance'}
      <div class="performance-metrics">
        {#if performanceMetrics.length === 0}
          <p class="no-data">No performance metrics recorded</p>
        {:else}
          <div class="metrics-summary">
            <h3>Core Web Vitals</h3>
            <div class="vitals-grid">
              <div class="vital-metric">
                <h4>LCP (Largest Contentful Paint)</h4>
                <p>{formatDuration(getAverageMetric(performanceMetrics, 'LCP'))}</p>
              </div>
              <div class="vital-metric">
                <h4>FID (First Input Delay)</h4>
                <p>{formatDuration(getAverageMetric(performanceMetrics, 'FID'))}</p>
              </div>
              <div class="vital-metric">
                <h4>CLS (Cumulative Layout Shift)</h4>
                <p>{(getAverageMetric(performanceMetrics, 'CLS') / 1000).toFixed(3)}</p>
              </div>
            </div>
          </div>
          
          <div class="metrics-list">
            <h3>Recent Metrics</h3>
            {#each performanceMetrics.slice(0, 20) as metric}
              <div class="metric-item">
                <span class="metric-name">{metric.name}</span>
                <span class="metric-value">{formatDuration(metric.value)}</span>
                <span class="metric-time">{formatTimestamp(metric.timestamp)}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {:else if selectedTab === 'deployment'}
      <div class="deployment-metrics">
        {#if deploymentMetrics.length === 0}
          <p class="no-data">No deployment metrics recorded</p>
        {:else}
          <div class="deployment-summary">
            <h3>Deployment Health</h3>
            <div class="health-grid">
              {#each ['page_load', 'aws_sdk_init', 'auth_success', 'file_operation'] as type}
                {@const typeMetrics = deploymentMetrics.filter(m => m.type === type)}
                <div class="health-metric">
                  <h4>{type.replace('_', ' ').toUpperCase()}</h4>
                  <p class="success-rate">{getSuccessRate(typeMetrics)}% success</p>
                  <p class="count">{typeMetrics.length} operations</p>
                </div>
              {/each}
            </div>
          </div>
          
          <div class="deployment-list">
            <h3>Recent Operations</h3>
            {#each deploymentMetrics.slice(0, 30) as metric}
              <div class="deployment-item {metric.success ? 'success' : 'failure'}">
                <div class="deployment-header">
                  <span class="deployment-type">{metric.type}</span>
                  <span class="deployment-status">{metric.success ? 'Success' : 'Failed'}</span>
                  <span class="deployment-time">{formatTimestamp(metric.timestamp)}</span>
                </div>
                {#if metric.duration}
                  <p><strong>Duration:</strong> {formatDuration(metric.duration)}</p>
                {/if}
                {#if metric.error}
                  <p class="error-text"><strong>Error:</strong> {metric.error}</p>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .monitoring-dashboard {
    padding: 1rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .header-actions {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .status {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .status.enabled {
    background-color: var(--success-bg);
    color: var(--success-color);
  }

  .status.disabled {
    background-color: var(--warning-bg);
    color: var(--warning-color);
  }

  .warning-banner {
    background-color: var(--warning-bg);
    color: var(--warning-color);
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .session-info {
    background-color: var(--bg-secondary);
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .tabs {
    display: flex;
    border-bottom: 1px solid var(--border-color);
    margin-bottom: 1rem;
  }

  .tab {
    padding: 0.75rem 1rem;
    border: none;
    background: none;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 0.2s;
  }

  .tab:hover {
    background-color: var(--bg-secondary);
  }

  .tab.active {
    border-bottom-color: var(--primary-color);
    color: var(--primary-color);
  }

  .loading, .no-data {
    text-align: center;
    padding: 2rem;
    color: var(--text-secondary);
  }

  .overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .metric-card {
    background-color: var(--bg-secondary);
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
  }

  .metric-card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .metric-value {
    font-size: 1.5rem;
    font-weight: bold;
  }

  .metric-value.success {
    color: var(--success-color);
  }

  .metric-value.error {
    color: var(--error-color);
  }

  .errors-list {
    space-y: 1rem;
  }

  .error-item {
    background-color: var(--bg-secondary);
    border-left: 4px solid var(--error-color);
    padding: 1rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .error-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
  }

  .error-message {
    font-weight: 500;
    color: var(--error-color);
  }

  .error-time {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .error-details p {
    margin: 0.25rem 0;
    font-size: 0.875rem;
  }

  .stack-trace {
    background-color: var(--bg-primary);
    padding: 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    overflow-x: auto;
    margin-top: 0.5rem;
  }

  .vitals-grid, .health-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .vital-metric, .health-metric {
    background-color: var(--bg-secondary);
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
  }

  .vital-metric h4, .health-metric h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .success-rate {
    font-size: 1.25rem;
    font-weight: bold;
    color: var(--success-color);
    margin: 0.25rem 0;
  }

  .count {
    font-size: 0.875rem;
    color: var(--text-secondary);
    margin: 0;
  }

  .metrics-list, .deployment-list {
    background-color: var(--bg-secondary);
    border-radius: 8px;
    overflow: hidden;
  }

  .metric-item, .deployment-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-color);
  }

  .metric-item:last-child, .deployment-item:last-child {
    border-bottom: none;
  }

  .deployment-item.success {
    border-left: 4px solid var(--success-color);
  }

  .deployment-item.failure {
    border-left: 4px solid var(--error-color);
  }

  .deployment-header {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 0.25rem;
  }

  .deployment-type {
    font-weight: 500;
  }

  .deployment-status {
    padding: 0.125rem 0.5rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .deployment-item.success .deployment-status {
    background-color: var(--success-bg);
    color: var(--success-color);
  }

  .deployment-item.failure .deployment-status {
    background-color: var(--error-bg);
    color: var(--error-color);
  }

  .deployment-time, .metric-time {
    font-size: 0.875rem;
    color: var(--text-secondary);
  }

  .error-text {
    color: var(--error-color);
    font-size: 0.875rem;
    margin: 0.25rem 0 0 0;
  }

  .btn-secondary, .btn-danger {
    padding: 0.5rem 1rem;
    border: 1px solid;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .btn-secondary {
    background-color: var(--bg-secondary);
    border-color: var(--border-color);
    color: var(--text-primary);
  }

  .btn-secondary:hover {
    background-color: var(--bg-primary);
  }

  .btn-danger {
    background-color: var(--error-color);
    border-color: var(--error-color);
    color: white;
  }

  .btn-danger:hover {
    background-color: var(--error-color-dark);
  }
</style>