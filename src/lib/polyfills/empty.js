// Empty module for Node.js modules that should not be bundled in browser
export default {};

// Common Node.js exports
export const constants = {};
export const Agent = class {};
export const request = () => {};
export const get = () => {};
export const createHash = () => ({});
export const createHmac = () => ({});
export const randomBytes = () => new Uint8Array(0);
export const pbkdf2 = () => {};
export const scrypt = () => {};
export const timingSafeEqual = () => false;
export const crc32 = () => 0;

// AWS SDK / Smithy specific exports
export const resolveDefaultsModeConfig = () => ({});
export const loadNodeConfig = () => ({});
export const loadConfig = () => ({});
export const fromNodeProviderChain = () => ({});
export const fromEnv = () => ({});
export const fromIni = () => ({});
export const fromProcess = () => ({});
export const fromSSO = () => ({});
export const fromTokenFile = () => ({});
export const fromWebToken = () => ({});
export const fromContainerMetadata = () => ({});
export const fromInstanceMetadata = () => ({});
export const getInstanceMetadataEndpoint = () => ({});
export const httpRequest = () => ({});
export const NodeHttpHandler = class {};
export const NodeHttp2Handler = class {};
export const streamCollector = () => ({});
export const getDefaultRoleAssumer = () => ({});
export const getDefaultRoleAssumerWithWebIdentity = () => ({});
export const decorateDefaultCredentialProvider = () => ({});

// Config provider functions
export const booleanSelector = () => false;
export const numberSelector = () => 0;
export const stringSelector = () => '';
export const SelectorType = {};

// Credential provider functions
export const chain = () => ({});
export const memoize = () => ({});
export const CredentialsProviderError = class extends Error {};

// Retry and error handling
export const isRetryableByTrait = () => false;
export const isClockSkewError = () => false;
export const isThrottlingError = () => false;
export const isTransientError = () => false;
export const getRetryAfterHint = () => undefined;
export const DEFAULT_RETRY_MODE = 'standard';
export const RETRY_MODES = { standard: 'standard', adaptive: 'adaptive' };

// Body length calculation
export const calculateBodyLength = () => 0;

// User agent functions
export const defaultUserAgent = () => ({});
export const getUserAgentMiddleware = () => ({});
export const getUserAgentPlugin = () => ({});

// Middleware functions
export const getRetryMiddleware = () => ({});
export const getRetryPlugin = () => ({});
export const retryMiddleware = () => ({});
export const retryMiddlewareOptions = {};
export const resolveRetryConfig = () => ({});

// Content length middleware
export const getContentLengthPlugin = () => ({});

// Endpoint middleware
export const resolveEndpointConfig = () => ({});

// HTTP auth scheme
export const resolveHttpAuthSchemeConfig = () => ({});
export const defaultCognitoIdentityProviderHttpAuthSchemeParametersProvider = () => ({});

// Node.js config options
export const NODE_MAX_ATTEMPT_CONFIG_OPTIONS = {};
export const NODE_RETRY_MODE_CONFIG_OPTIONS = {};
export const NODE_REGION_CONFIG_FILE_OPTIONS = {};
export const NODE_REGION_CONFIG_OPTIONS = {};
export const NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS = {};
export const NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS = {};
export const NODE_APP_ID_CONFIG_OPTIONS = {};
export const NODE_CLIENT_CONFIG_OPTIONS = {};

// Hash functions
export const Hash = class {};
export const Md5 = class {};
export const Sha1 = class {};
export const Sha256 = class {};

// Stream functions
export const sdkStreamMixin = () => ({});

// Request handlers
export const RequestHandler = class {};

// Abort controller
export const AbortController = globalThis.AbortController || class {
  constructor() {
    this.signal = { aborted: false };
  }
  abort() {
    this.signal.aborted = true;
  }
};