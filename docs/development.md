# MarkS3 Development Guide

This guide provides comprehensive information for developers working on MarkS3, including setup instructions, development workflows, coding standards, and contribution guidelines.

## Table of Contents

- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Strategy](#testing-strategy)
- [Debugging Guide](#debugging-guide)
- [Performance Optimization](#performance-optimization)
- [Deployment Process](#deployment-process)
- [Troubleshooting](#troubleshooting)

## Development Environment Setup

### Prerequisites

Ensure you have the following installed:

- **Node.js 18+** (LTS recommended)
- **pnpm** (package manager)
- **Git** (version control)
- **AWS CLI** (for AWS operations)
- **Terraform** (infrastructure management)
- **VS Code** (recommended editor)

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/marks3.git
   cd marks3
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Set Up Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Configure AWS Credentials**
   ```bash
   aws configure
   # Or use AWS SSO: aws sso login
   ```

5. **Initialize Development Infrastructure** (Optional)
   ```bash
   cd terraform/environments/dev
   terraform init
   terraform plan
   terraform apply
   ```

### VS Code Setup

#### Recommended Extensions

Install these VS Code extensions for the best development experience:

```json
{
  "recommendations": [
    "svelte.svelte-vscode",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-eslint",
    "hashicorp.terraform",
    "amazonwebservices.aws-toolkit-vscode",
    "ms-playwright.playwright",
    "vitest.explorer"
  ]
}
```

#### VS Code Settings

Create `.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "svelte.enable-ts-plugin": true,
  "files.associations": {
    "*.md": "markdown"
  },
  "emmet.includeLanguages": {
    "svelte": "html"
  }
}
```

### Environment Configuration

#### Development Environment Variables

```env
# Application Configuration
VITE_APP_NAME=MarkS3 Dev
VITE_APP_ENVIRONMENT=development
VITE_APP_VERSION=1.0.0-dev

# AWS Configuration
VITE_AWS_REGION=us-east-1
VITE_AWS_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_AWS_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_AWS_COGNITO_IDENTITY_POOL_ID=us-east-1:xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_AWS_S3_PAGES_BUCKET=marks3-pages-dev
VITE_AWS_S3_FILES_BUCKET=marks3-files-dev
VITE_AWS_S3_WEBSITE_BUCKET=marks3-website-dev

# Development Features
VITE_DEV_MODE=true
VITE_DEBUG_LOGGING=true
VITE_MOCK_AWS=false

# Optional: Custom Domain
VITE_CUSTOM_DOMAIN=dev.marks3.local
```

## Project Structure

### Directory Layout

```
marks3/
├── .github/                 # GitHub workflows and templates
├── .kiro/                   # Kiro IDE specifications
├── .vscode/                 # VS Code configuration
├── docs/                    # Documentation
├── scripts/                 # Build and deployment scripts
├── src/                     # Source code
│   ├── lib/                # Library code
│   │   ├── components/     # Svelte components
│   │   ├── services/       # Business logic services
│   │   ├── stores/         # State management
│   │   ├── types/          # TypeScript definitions
│   │   └── utils/          # Utility functions
│   ├── routes/             # SvelteKit routes
│   ├── app.html            # HTML template
│   └── app.css             # Global styles
├── static/                  # Static assets
├── terraform/               # Infrastructure as Code
├── tests/                   # Test files
├── package.json            # Dependencies and scripts
├── svelte.config.js        # Svelte configuration
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite configuration
└── vitest.config.ts        # Test configuration
```

### Key Files and Their Purpose

| File/Directory | Purpose |
|----------------|---------|
| `src/lib/components/` | Reusable Svelte components |
| `src/lib/services/` | Business logic and AWS integrations |
| `src/lib/stores/` | Reactive state management |
| `src/lib/types/` | TypeScript type definitions |
| `src/routes/` | SvelteKit pages and layouts |
| `terraform/` | AWS infrastructure definitions |
| `tests/` | Unit, integration, and E2E tests |
| `scripts/` | Build, deployment, and utility scripts |

## Development Workflow

### Daily Development Process

1. **Start Development Server**
   ```bash
   pnpm dev
   ```

2. **Run Tests in Watch Mode**
   ```bash
   pnpm test:watch
   ```

3. **Type Checking**
   ```bash
   pnpm check:watch
   ```

4. **Linting and Formatting**
   ```bash
   pnpm lint
   pnpm format
   ```

### Feature Development Workflow

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Implement Feature**
   - Write code following coding standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Test Implementation**
   ```bash
   pnpm test
   pnpm check
   pnpm lint
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

5. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request on GitHub
   ```

### Git Workflow

#### Branch Naming Convention

- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `docs/update-description` - Documentation updates
- `refactor/component-name` - Code refactoring
- `test/test-description` - Test improvements

#### Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Maintenance tasks

**Examples:**
```bash
feat(auth): add OAuth2 integration
fix(editor): resolve markdown parsing issue
docs(readme): update installation instructions
refactor(wiki): extract page service logic
test(auth): add integration tests for login flow
```

## Coding Standards

### TypeScript Guidelines

#### Type Definitions

```typescript
// Use interfaces for object shapes
interface WikiPage {
  path: string;
  title: string;
  content: string;
  metadata: PageMetadata;
}

// Use type aliases for unions and primitives
type UserRole = 'admin' | 'regular' | 'guest';
type PagePath = string;

// Use enums for constants
enum FileType {
  IMAGE = 'image',
  DOCUMENT = 'document',
  ARCHIVE = 'archive'
}
```

#### Function Signatures

```typescript
// Use explicit return types for public functions
export async function getPage(path: string): Promise<WikiPage> {
  // Implementation
}

// Use proper error handling
export async function savePage(page: WikiPage): Promise<WikiPage> {
  try {
    // Implementation
  } catch (error) {
    throw new WikiError('Failed to save page', error);
  }
}

// Use generic types when appropriate
export function createCache<T>(): Cache<T> {
  return new Map<string, T>();
}
```

#### Import/Export Patterns

```typescript
// Named exports for utilities
export { validatePagePath, sanitizeContent };

// Default exports for main classes/components
export default class WikiService {
  // Implementation
}

// Type-only imports
import type { WikiPage, PageMetadata } from '$lib/types/wiki';

// Barrel exports in index files
export * from './auth';
export * from './wiki';
export * from './files';
```

### Svelte Component Guidelines

#### Component Structure

```svelte
<script lang="ts">
  // 1. Imports
  import { onMount } from 'svelte';
  import type { WikiPage } from '$lib/types/wiki';
  
  // 2. Props
  export let page: WikiPage;
  export let editable: boolean = false;
  
  // 3. Local variables
  let isLoading = false;
  let error: string | null = null;
  
  // 4. Reactive statements
  $: canEdit = editable && !isLoading;
  
  // 5. Functions
  async function handleSave() {
    // Implementation
  }
  
  // 6. Lifecycle
  onMount(() => {
    // Initialization
  });
</script>

<!-- 7. HTML template -->
<div class="page-editor">
  {#if isLoading}
    <div class="loading">Loading...</div>
  {:else if error}
    <div class="error">{error}</div>
  {:else}
    <div class="content">
      <!-- Content -->
    </div>
  {/if}
</div>

<!-- 8. Styles -->
<style>
  .page-editor {
    /* Component styles */
  }
</style>
```

#### Component Naming

- Use PascalCase for component files: `PageEditor.svelte`
- Use kebab-case for CSS classes: `page-editor`
- Use camelCase for JavaScript variables: `isLoading`

### CSS Guidelines

#### Styling Approach

```css
/* Use CSS custom properties for theming */
:root {
  --color-primary: #2563eb;
  --color-secondary: #64748b;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
}

/* Component-scoped styles */
.component {
  color: var(--color-primary);
  padding: var(--spacing-md);
}

/* Responsive design */
@media (min-width: 768px) {
  .component {
    padding: var(--spacing-lg);
  }
}
```

#### CSS Organization

1. **Global styles** in `src/app.css`
2. **Component styles** in `<style>` blocks
3. **Utility classes** for common patterns
4. **CSS custom properties** for theming

### Error Handling

#### Service Layer Errors

```typescript
// Define custom error classes
export class WikiError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public cause?: Error
  ) {
    super(message);
    this.name = 'WikiError';
  }
}

// Use consistent error handling
export async function getPage(path: string): Promise<WikiPage> {
  try {
    const result = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: `pages/${path}.md`
    }));
    
    return parseWikiPage(result);
  } catch (error) {
    if (error.name === 'NoSuchKey') {
      throw new WikiError(
        `Page not found: ${path}`,
        'PAGE_NOT_FOUND',
        404,
        error
      );
    }
    
    throw new WikiError(
      'Failed to retrieve page',
      'RETRIEVAL_ERROR',
      500,
      error
    );
  }
}
```

#### Component Error Handling

```svelte
<script lang="ts">
  import { WikiError } from '$lib/services/wiki';
  
  let error: string | null = null;
  
  async function loadPage() {
    try {
      error = null;
      const page = await wikiService.getPage(path);
      // Handle success
    } catch (err) {
      if (err instanceof WikiError) {
        error = err.message;
      } else {
        error = 'An unexpected error occurred';
        console.error('Unexpected error:', err);
      }
    }
  }
</script>

{#if error}
  <div class="error-message" role="alert">
    {error}
  </div>
{/if}
```

## Testing Strategy

### Test Types and Structure

```
tests/
├── unit/                   # Unit tests
│   ├── services/          # Service layer tests
│   ├── utils/             # Utility function tests
│   └── components/        # Component tests
├── integration/           # Integration tests
│   ├── auth-flow.test.ts  # Authentication flow
│   ├── aws-sdk.test.ts    # AWS SDK integration
│   └── file-operations.test.ts
└── e2e/                   # End-to-end tests
    ├── user-flows.test.ts # Complete user workflows
    └── admin-panel.test.ts
```

### Unit Testing

#### Service Tests

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WikiService } from '$lib/services/wiki';
import type { WikiPage } from '$lib/types/wiki';

describe('WikiService', () => {
  let wikiService: WikiService;
  
  beforeEach(() => {
    wikiService = new WikiService();
  });
  
  describe('getPage', () => {
    it('should retrieve a page successfully', async () => {
      const mockPage: WikiPage = {
        path: 'test-page',
        title: 'Test Page',
        content: '# Test Content',
        metadata: {
          author: 'test@example.com',
          created: new Date(),
          modified: new Date(),
          tags: []
        }
      };
      
      // Mock S3 response
      vi.mocked(s3Client.send).mockResolvedValue({
        Body: {
          transformToString: () => Promise.resolve(JSON.stringify(mockPage))
        }
      });
      
      const result = await wikiService.getPage('test-page');
      
      expect(result).toEqual(mockPage);
    });
    
    it('should throw error for non-existent page', async () => {
      vi.mocked(s3Client.send).mockRejectedValue({
        name: 'NoSuchKey'
      });
      
      await expect(wikiService.getPage('non-existent'))
        .rejects
        .toThrow('Page not found');
    });
  });
});
```

#### Component Tests

```typescript
import { render, screen, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import PageEditor from '$lib/components/editor/PageEditor.svelte';

describe('PageEditor', () => {
  it('should render page content', () => {
    const page = {
      path: 'test',
      title: 'Test Page',
      content: '# Hello World',
      metadata: { /* ... */ }
    };
    
    render(PageEditor, { props: { page } });
    
    expect(screen.getByDisplayValue('Test Page')).toBeInTheDocument();
    expect(screen.getByText('# Hello World')).toBeInTheDocument();
  });
  
  it('should handle save action', async () => {
    const mockSave = vi.fn();
    const page = { /* ... */ };
    
    render(PageEditor, { 
      props: { page, onSave: mockSave } 
    });
    
    const saveButton = screen.getByRole('button', { name: /save/i });
    await fireEvent.click(saveButton);
    
    expect(mockSave).toHaveBeenCalledWith(page);
  });
});
```

### Integration Testing

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { authService } from '$lib/services/auth';

describe('Authentication Integration', () => {
  beforeAll(async () => {
    // Set up test environment
    await setupTestCognito();
  });
  
  afterAll(async () => {
    // Clean up test resources
    await cleanupTestCognito();
  });
  
  it('should complete full authentication flow', async () => {
    // Sign up
    const signUpResult = await authService.signUp(
      'test@example.com',
      'TestPassword123!'
    );
    
    expect(signUpResult.userSub).toBeDefined();
    
    // Confirm sign up (mock confirmation)
    await authService.confirmSignUp('test@example.com', '123456');
    
    // Sign in
    const signInResult = await authService.signIn(
      'test@example.com',
      'TestPassword123!'
    );
    
    expect(signInResult.AccessToken).toBeDefined();
    
    // Get current user
    const user = await authService.getCurrentUser();
    expect(user?.email).toBe('test@example.com');
  });
});
```

### E2E Testing

```typescript
import { test, expect } from '@playwright/test';

test.describe('Wiki Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Log in before each test
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'test@example.com');
    await page.fill('[data-testid="password"]', 'TestPassword123!');
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/');
  });
  
  test('should create and edit a page', async ({ page }) => {
    // Create new page
    await page.click('[data-testid="new-page-button"]');
    await page.fill('[data-testid="page-title"]', 'Test Page');
    await page.fill('[data-testid="page-content"]', '# Hello World\n\nThis is a test page.');
    await page.click('[data-testid="save-button"]');
    
    // Verify page was created
    await expect(page).toHaveURL('/pages/test-page');
    await expect(page.locator('h1')).toContainText('Hello World');
    
    // Edit page
    await page.click('[data-testid="edit-button"]');
    await page.fill('[data-testid="page-content"]', '# Updated Content\n\nThis page has been updated.');
    await page.click('[data-testid="save-button"]');
    
    // Verify changes
    await expect(page.locator('h1')).toContainText('Updated Content');
  });
});
```

### Test Configuration

#### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*'
      ]
    }
  }
});
```

#### Test Setup

```typescript
// tests/setup.ts
import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn()
  })),
  GetObjectCommand: vi.fn(),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn()
}));

// Mock Cognito SDK
vi.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: vi.fn(() => ({
    send: vi.fn()
  })),
  InitiateAuthCommand: vi.fn(),
  SignUpCommand: vi.fn()
}));

// Global test utilities
global.testUtils = {
  createMockPage: () => ({
    path: 'test-page',
    title: 'Test Page',
    content: '# Test Content',
    metadata: {
      author: 'test@example.com',
      created: new Date(),
      modified: new Date(),
      tags: []
    }
  })
};
```

## Debugging Guide

### Browser DevTools

#### Console Debugging

```typescript
// Use structured logging
console.group('Wiki Service');
console.log('Loading page:', path);
console.time('page-load');

try {
  const page = await getPage(path);
  console.timeEnd('page-load');
  console.log('Page loaded:', page);
} catch (error) {
  console.error('Failed to load page:', error);
} finally {
  console.groupEnd();
}
```

#### Network Debugging

1. **Monitor AWS API Calls**
   - Open Network tab in DevTools
   - Filter by "amazonaws.com"
   - Check request/response details

2. **S3 Request Debugging**
   ```typescript
   // Add request logging
   const s3Client = new S3Client({
     region: 'us-east-1',
     logger: {
       debug: console.debug,
       info: console.info,
       warn: console.warn,
       error: console.error
     }
   });
   ```

### VS Code Debugging

#### Launch Configuration

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug SvelteKit",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/@sveltejs/kit/src/exports/vite/dev/index.js",
      "args": ["--port", "5173"],
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "name": "Debug Tests",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/vitest/vitest.mjs",
      "args": ["run", "--reporter=verbose"],
      "console": "integratedTerminal"
    }
  ]
}
```

### AWS Debugging

#### CloudWatch Logs

```typescript
// Add custom logging for AWS operations
import { CloudWatchLogsClient, PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

class Logger {
  private cloudWatchClient = new CloudWatchLogsClient({ region: 'us-east-1' });
  
  async logToCloudWatch(message: string, level: 'INFO' | 'ERROR' | 'DEBUG') {
    if (process.env.NODE_ENV === 'production') {
      await this.cloudWatchClient.send(new PutLogEventsCommand({
        logGroupName: '/marks3/application',
        logStreamName: `${Date.now()}`,
        logEvents: [{
          timestamp: Date.now(),
          message: JSON.stringify({ level, message, timestamp: new Date().toISOString() })
        }]
      }));
    } else {
      console.log(`[${level}] ${message}`);
    }
  }
}
```

#### S3 Request Tracing

```typescript
// Enable S3 request tracing
const s3Client = new S3Client({
  region: 'us-east-1',
  requestHandler: {
    metadata: { handlerProtocol: 'http/1.1' },
    handle: async (request, { abortSignal }) => {
      console.log('S3 Request:', {
        method: request.method,
        path: request.path,
        headers: request.headers
      });
      
      const response = await defaultRequestHandler.handle(request, { abortSignal });
      
      console.log('S3 Response:', {
        statusCode: response.response.statusCode,
        headers: response.response.headers
      });
      
      return response;
    }
  }
});
```

## Performance Optimization

### Bundle Analysis

```bash
# Analyze bundle size
pnpm build
pnpm run analyze

# Check for unused dependencies
npx depcheck

# Audit dependencies
pnpm audit
```

### Code Splitting

```typescript
// Route-based code splitting (automatic with SvelteKit)
// Component-based code splitting
const LazyComponent = lazy(() => import('./HeavyComponent.svelte'));

// Dynamic imports for large libraries
async function loadEditor() {
  const { Editor } = await import('@milkdown/core');
  return new Editor();
}
```

### Performance Monitoring

```typescript
// Performance API usage
class PerformanceMonitor {
  static measurePageLoad(pagePath: string) {
    performance.mark('page-load-start');
    
    return {
      end: () => {
        performance.mark('page-load-end');
        performance.measure('page-load', 'page-load-start', 'page-load-end');
        
        const measure = performance.getEntriesByName('page-load')[0];
        console.log(`Page ${pagePath} loaded in ${measure.duration}ms`);
        
        // Send to analytics
        if (typeof gtag !== 'undefined') {
          gtag('event', 'page_load_time', {
            custom_parameter: measure.duration,
            page_path: pagePath
          });
        }
      }
    };
  }
}

// Usage in components
onMount(() => {
  const monitor = PerformanceMonitor.measurePageLoad(page.path);
  
  // Load page content
  loadPageContent().finally(() => {
    monitor.end();
  });
});
```

## Deployment Process

### Development Deployment

```bash
# Deploy to development environment
pnpm run deploy:dev

# Or step by step
cd terraform/environments/dev
terraform plan
terraform apply
cd ../../../
pnpm build
pnpm run deploy:s3:dev
```

### Production Deployment

```bash
# Deploy to production
pnpm run deploy:prod

# With confirmation
pnpm run deploy:prod --confirm
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to AWS

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - run: pnpm install
      - run: pnpm test
      - run: pnpm check
      - run: pnpm lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      
      - run: pnpm install
      - run: pnpm build
      - run: pnpm run deploy:prod
```

## Troubleshooting

### Common Issues

#### Build Issues

**Issue**: TypeScript compilation errors
```bash
# Solution: Check types and update
pnpm check
# Fix type errors in reported files
```

**Issue**: Dependency conflicts
```bash
# Solution: Clear cache and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

#### Runtime Issues

**Issue**: AWS authentication failures
```typescript
// Debug: Check credentials and permissions
console.log('AWS Config:', {
  region: process.env.VITE_AWS_REGION,
  userPoolId: process.env.VITE_AWS_COGNITO_USER_POOL_ID,
  // Don't log sensitive values
});

// Verify Cognito configuration
const user = await Auth.currentAuthenticatedUser();
console.log('Current user:', user);
```

**Issue**: S3 access denied
```bash
# Check bucket policies and IAM permissions
aws s3api get-bucket-policy --bucket your-bucket-name
aws iam get-role-policy --role-name your-role-name --policy-name your-policy-name
```

#### Performance Issues

**Issue**: Slow page loads
```typescript
// Profile component rendering
import { onMount, afterUpdate } from 'svelte';

let renderTime = 0;

onMount(() => {
  const start = performance.now();
  
  afterUpdate(() => {
    renderTime = performance.now() - start;
    console.log(`Component rendered in ${renderTime}ms`);
  });
});
```

### Debug Tools

#### Custom Debug Panel

```svelte
<!-- DebugPanel.svelte -->
<script lang="ts">
  import { dev } from '$app/environment';
  import { authStore } from '$lib/stores/auth';
  
  let showDebug = false;
  
  $: if (dev) {
    // Auto-show in development
    showDebug = true;
  }
</script>

{#if showDebug}
  <div class="debug-panel">
    <h3>Debug Information</h3>
    
    <details>
      <summary>Authentication</summary>
      <pre>{JSON.stringify($authStore, null, 2)}</pre>
    </details>
    
    <details>
      <summary>Environment</summary>
      <pre>{JSON.stringify({
        NODE_ENV: process.env.NODE_ENV,
        AWS_REGION: import.meta.env.VITE_AWS_REGION,
        // Add other relevant env vars
      }, null, 2)}</pre>
    </details>
    
    <details>
      <summary>Performance</summary>
      <pre>{JSON.stringify(performance.getEntriesByType('navigation'), null, 2)}</pre>
    </details>
  </div>
{/if}

<style>
  .debug-panel {
    position: fixed;
    bottom: 0;
    right: 0;
    width: 400px;
    max-height: 50vh;
    overflow-y: auto;
    background: rgba(0, 0, 0, 0.9);
    color: white;
    padding: 1rem;
    font-family: monospace;
    font-size: 0.8rem;
    z-index: 9999;
  }
  
  details {
    margin: 0.5rem 0;
  }
  
  summary {
    cursor: pointer;
    font-weight: bold;
  }
  
  pre {
    margin: 0.5rem 0;
    white-space: pre-wrap;
    word-break: break-all;
  }
</style>
```

---

This development guide is continuously updated as the project evolves. For the latest information, check the source code and commit history.