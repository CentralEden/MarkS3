/**
 * Debounce utility for performance optimization
 * Delays function execution until after a specified delay has passed since the last call
 */

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

/**
 * Throttle utility for performance optimization
 * Limits function execution to at most once per specified interval
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  interval: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  let timeoutId: ReturnType<typeof setTimeout>;
  
  return (...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastCall >= interval) {
      lastCall = now;
      func(...args);
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        func(...args);
      }, interval - (now - lastCall));
    }
  };
}

/**
 * Request animation frame debounce for smooth UI updates
 */
export function rafDebounce<T extends (...args: any[]) => any>(
  func: T
): (...args: Parameters<T>) => void {
  let rafId: number;
  
  return (...args: Parameters<T>) => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(() => func(...args));
  };
}