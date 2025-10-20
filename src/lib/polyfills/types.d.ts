// Type declarations for polyfill modules

declare module 'crypto-browserify' {
  const crypto: any;
  export = crypto;
}

declare module 'readable-stream' {
  export class Readable {
    constructor(options?: any);
  }
  export class Writable {
    constructor(options?: any);
  }
  export class Transform {
    constructor(options?: any);
  }
  export class PassThrough {
    constructor(options?: any);
  }
}

declare module 'path-browserify' {
  const path: any;
  export = path;
}

declare module 'os-browserify/browser' {
  const os: any;
  export = os;
}

declare module 'querystring-es3' {
  const querystring: any;
  export = querystring;
}

// Extend global process type for browser compatibility
declare global {
  namespace NodeJS {
    interface Process {
      browser?: boolean;
      nextTick?: (fn: (...args: any[]) => void, ...args: any[]) => void;
      cwd?: () => string;
      chdir?: () => void;
      umask?: () => number;
    }
  }
  
  interface Window {
    Buffer: any;
    process: any;
    global: any;
  }
  
  var Buffer: any;
  var process: any;
  var global: any;
  var setImmediate: (fn: (...args: any[]) => void, ...args: any[]) => any;
  var clearImmediate: (id: any) => void;
}