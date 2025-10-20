/**
 * Client-side monitoring and error tracking service
 * Provides performance monitoring, error tracking, and deployment metrics
 */

interface ErrorEvent {
  message: string;
  stack?: string;
  url: string;
  line?: number;
  column?: number;
  timestamp: number;
  userAgent: string;
  userId?: string;
  sessionId: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  url: string;
  sessionId: string;
  userId?: string;
}

interface DeploymentMetric {
  type: 'page_load' | 'aws_sdk_init' | 'auth_success' | 'file_operation';
  success: boolean;
  duration?: number;
  error?: string;
  timestamp: number;
  sessionId: string;
  userId?: string;
}

class MonitoringService {
  private sessionId: string;
  private userId?: string;
  private isEnabled: boolean;
  private errorQueue: ErrorEvent[] = [];
  private metricsQueue: PerformanceMetric[] = [];
  private deploymentQueue: DeploymentMetric[] = [];
  private flushInterval: number;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isEnabled = this.shouldEnableMonitoring();
    this.flushInterval = 30000; // 30 seconds

    if (this.isEnabled) {
      this.initializeMonitoring();
    }
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldEnableMonitoring(): boolean {
    // Enable monitoring in production or when explicitly enabled
    return import.meta.env.PROD || import.meta.env.VITE_ENABLE_MONITORING === 'true';
  }

  private initializeMonitoring(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename || window.location.href,
        line: event.lineno,
        column: event.colno,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        userId: this.userId,
        sessionId: this.sessionId
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        userId: this.userId,
        sessionId: this.sessionId
      });
    });

    // Performance observer for Core Web Vitals
    if ('PerformanceObserver' in window) {
      this.initializePerformanceObserver();
    }

    // Page load metrics
    window.addEventListener('load', () => {
      this.trackPageLoadMetrics();
    });

    // Periodic flush of queued data
    setInterval(() => {
      this.flushData();
    }, this.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flushData();
    });
  }

  private initializePerformanceObserver(): void {
    try {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.trackPerformanceMetric({
          name: 'LCP',
          value: lastEntry.startTime,
          timestamp: Date.now(),
          url: window.location.href,
          sessionId: this.sessionId,
          userId: this.userId
        });
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.trackPerformanceMetric({
            name: 'FID',
            value: entry.processingStart - entry.startTime,
            timestamp: Date.now(),
            url: window.location.href,
            sessionId: this.sessionId,
            userId: this.userId
          });
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.trackPerformanceMetric({
          name: 'CLS',
          value: clsValue,
          timestamp: Date.now(),
          url: window.location.href,
          sessionId: this.sessionId,
          userId: this.userId
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

    } catch (error) {
      console.warn('Performance observer initialization failed:', error);
    }
  }

  private trackPageLoadMetrics(): void {
    if (!performance.timing) return;

    const timing = performance.timing;
    const navigationStart = timing.navigationStart;

    const metrics = [
      { name: 'DNS_Lookup', value: timing.domainLookupEnd - timing.domainLookupStart },
      { name: 'TCP_Connection', value: timing.connectEnd - timing.connectStart },
      { name: 'Request_Response', value: timing.responseEnd - timing.requestStart },
      { name: 'DOM_Processing', value: timing.domComplete - timing.domLoading },
      { name: 'Page_Load_Time', value: timing.loadEventEnd - navigationStart }
    ];

    metrics.forEach(metric => {
      if (metric.value > 0) {
        this.trackPerformanceMetric({
          name: metric.name,
          value: metric.value,
          timestamp: Date.now(),
          url: window.location.href,
          sessionId: this.sessionId,
          userId: this.userId
        });
      }
    });
  }

  public setUserId(userId: string): void {
    this.userId = userId;
  }

  public trackError(error: Partial<ErrorEvent>): void {
    if (!this.isEnabled) return;

    const errorEvent: ErrorEvent = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      url: error.url || window.location.href,
      line: error.line,
      column: error.column,
      timestamp: error.timestamp || Date.now(),
      userAgent: navigator.userAgent,
      userId: this.userId,
      sessionId: this.sessionId
    };

    this.errorQueue.push(errorEvent);
    console.error('Tracked error:', errorEvent);

    // Immediate flush for critical errors
    if (this.errorQueue.length >= 5) {
      this.flushData();
    }
  }

  public trackPerformanceMetric(metric: PerformanceMetric): void {
    if (!this.isEnabled) return;

    this.metricsQueue.push(metric);
  }

  public trackDeploymentMetric(metric: Omit<DeploymentMetric, 'timestamp' | 'sessionId' | 'userId'>): void {
    if (!this.isEnabled) return;

    const deploymentMetric: DeploymentMetric = {
      ...metric,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId
    };

    this.deploymentQueue.push(deploymentMetric);
  }

  public trackAWSSDKInitialization(success: boolean, duration: number, error?: string): void {
    this.trackDeploymentMetric({
      type: 'aws_sdk_init',
      success,
      duration,
      error
    });
  }

  public trackAuthenticationSuccess(duration: number): void {
    this.trackDeploymentMetric({
      type: 'auth_success',
      success: true,
      duration
    });
  }

  public trackFileOperation(success: boolean, duration: number, error?: string): void {
    this.trackDeploymentMetric({
      type: 'file_operation',
      success,
      duration,
      error
    });
  }

  public trackPageLoad(success: boolean, duration: number, error?: string): void {
    this.trackDeploymentMetric({
      type: 'page_load',
      success,
      duration,
      error
    });
  }

  private async flushData(): void {
    if (!this.isEnabled) return;

    const hasData = this.errorQueue.length > 0 || 
                   this.metricsQueue.length > 0 || 
                   this.deploymentQueue.length > 0;

    if (!hasData) return;

    try {
      const payload = {
        errors: [...this.errorQueue],
        metrics: [...this.metricsQueue],
        deploymentMetrics: [...this.deploymentQueue],
        sessionId: this.sessionId,
        userId: this.userId,
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent
      };

      // Clear queues immediately to prevent duplicate sends
      this.errorQueue = [];
      this.metricsQueue = [];
      this.deploymentQueue = [];

      // Send to monitoring endpoint (could be CloudWatch, S3, or external service)
      await this.sendToMonitoringEndpoint(payload);

    } catch (error) {
      console.warn('Failed to flush monitoring data:', error);
    }
  }

  private async sendToMonitoringEndpoint(payload: any): Promise<void> {
    // In a real implementation, this would send to CloudWatch Logs, S3, or an external service
    // For now, we'll store in localStorage for debugging and log to console
    
    try {
      // Store in localStorage for debugging (with size limit)
      const storageKey = 'marks3_monitoring_data';
      const existingData = JSON.parse(localStorage.getItem(storageKey) || '[]');
      existingData.push(payload);
      
      // Keep only last 50 entries to prevent storage overflow
      if (existingData.length > 50) {
        existingData.splice(0, existingData.length - 50);
      }
      
      localStorage.setItem(storageKey, JSON.stringify(existingData));
      
      // Log summary to console in development
      if (import.meta.env.DEV) {
        console.log('Monitoring data flushed:', {
          errors: payload.errors.length,
          metrics: payload.metrics.length,
          deploymentMetrics: payload.deploymentMetrics.length,
          sessionId: payload.sessionId
        });
      }

      // In production, you could send to CloudWatch Logs via AWS SDK
      // or to an external monitoring service like Sentry, DataDog, etc.
      
    } catch (error) {
      console.warn('Failed to store monitoring data:', error);
    }
  }

  public getStoredData(): any[] {
    try {
      return JSON.parse(localStorage.getItem('marks3_monitoring_data') || '[]');
    } catch {
      return [];
    }
  }

  public clearStoredData(): void {
    localStorage.removeItem('marks3_monitoring_data');
  }

  public getSessionId(): string {
    return this.sessionId;
  }

  public isMonitoringEnabled(): boolean {
    return this.isEnabled;
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();
export type { ErrorEvent, PerformanceMetric, DeploymentMetric };