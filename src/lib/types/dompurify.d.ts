/**
 * Type declaration for DOMPurify
 */

declare module 'dompurify' {
  interface DOMPurifyI {
    sanitize(dirty: string | Node, cfg?: any): string;
    addHook(entryPoint: string, hookFunction: (currentNode?: Element, data?: any, config?: any) => void): void;
    removeHook(entryPoint: string): void;
    removeHooks(entryPoint: string): void;
    removeAllHooks(): void;
    isValidAttribute(tag: string, attr: string, value: string): boolean;
  }

  const DOMPurify: DOMPurifyI;
  export default DOMPurify;
}