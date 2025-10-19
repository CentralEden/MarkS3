# Contributing to MarkS3

Thank you for your interest in contributing to MarkS3! This document provides guidelines and information for contributors.

## 🌟 Ways to Contribute

- 🐛 **Bug Reports**: Help us identify and fix issues
- 💡 **Feature Requests**: Suggest new features or improvements
- 📝 **Documentation**: Improve documentation and examples
- 🔧 **Code Contributions**: Submit bug fixes and new features
- 🧪 **Testing**: Help improve test coverage and quality
- 🎨 **Design**: Contribute to UI/UX improvements

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Git
- AWS Account (for testing infrastructure changes)
- Basic knowledge of TypeScript, Svelte, and AWS services

### Development Setup

1. **Fork and Clone**
   ```bash
   # Fork the repository on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/marks3.git
   cd marks3
   
   # Add upstream remote
   git remote add upstream https://github.com/ORIGINAL_OWNER/marks3.git
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Set Up Environment**
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Configure your AWS credentials and other settings
   # Note: You may need to create test AWS resources
   ```

4. **Start Development Server**
   ```bash
   pnpm dev
   ```

5. **Run Tests**
   ```bash
   # Run all tests
   pnpm test
   
   # Run tests in watch mode
   pnpm test:watch
   
   # Run specific test types
   pnpm test:unit
   pnpm test:integration
   pnpm test:e2e
   ```

## 📋 Development Workflow

### 1. Create a Feature Branch

```bash
# Sync with upstream
git fetch upstream
git checkout main
git merge upstream/main

# Create feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Follow the existing code style and conventions
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass

### 3. Commit Your Changes

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

```bash
# Format: type(scope): description
git commit -m "feat(auth): add OAuth2 integration"
git commit -m "fix(editor): resolve markdown parsing issue"
git commit -m "docs(readme): update installation instructions"
```

**Commit Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 4. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create pull request on GitHub
```

## 🧪 Testing Guidelines

### Test Types

1. **Unit Tests** (`src/**/*.test.ts`)
   - Test individual functions and components
   - Mock external dependencies
   - Fast execution

2. **Integration Tests** (`tests/integration/`)
   - Test service interactions
   - Test AWS SDK integrations
   - May require AWS resources

3. **End-to-End Tests** (`tests/e2e/`)
   - Test complete user workflows
   - Test in browser environment
   - Require full application setup

### Writing Tests

```typescript
// Example unit test
import { describe, it, expect } from 'vitest';
import { validatePagePath } from '$lib/utils/validation';

describe('validatePagePath', () => {
  it('should accept valid page paths', () => {
    expect(validatePagePath('docs/getting-started')).toBe(true);
  });

  it('should reject invalid characters', () => {
    expect(validatePagePath('docs/<script>')).toBe(false);
  });
});
```

### Test Requirements

- All new features must include tests
- Bug fixes should include regression tests
- Aim for >80% code coverage
- Tests should be deterministic and fast

## 📝 Code Style Guidelines

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow existing ESLint and Prettier configurations
- Use meaningful variable and function names
- Add JSDoc comments for public APIs

```typescript
/**
 * Validates a wiki page path for security and format compliance
 * @param path - The page path to validate
 * @returns True if the path is valid, false otherwise
 */
export function validatePagePath(path: string): boolean {
  // Implementation...
}
```

### Svelte Components

- Use TypeScript in Svelte components
- Follow component naming conventions (PascalCase)
- Keep components focused and reusable
- Use proper prop typing

```svelte
<script lang="ts">
  export let title: string;
  export let content: string;
  export let editable: boolean = false;
</script>
```

### CSS/Styling

- Use CSS custom properties for theming
- Follow BEM methodology for class names
- Prefer component-scoped styles
- Ensure responsive design

## 🏗️ Architecture Guidelines

### Project Structure

Follow the established project structure:

```
src/
├── lib/
│   ├── components/     # Reusable Svelte components
│   ├── services/       # Business logic and API calls
│   ├── stores/         # State management
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
├── routes/             # SvelteKit routes
└── app.html           # HTML template
```

### Service Layer

- Keep business logic in service files
- Use dependency injection where appropriate
- Handle errors gracefully
- Provide clear interfaces

### State Management

- Use Svelte stores for global state
- Keep state minimal and normalized
- Provide clear update patterns

## 🔒 Security Considerations

### Input Validation

- Validate all user inputs
- Sanitize markdown content with DOMPurify
- Use parameterized queries/operations

### AWS Security

- Follow principle of least privilege
- Use IAM roles and policies appropriately
- Validate S3 bucket policies
- Ensure proper CORS configuration

### Authentication

- Never store credentials in code
- Use AWS Cognito best practices
- Implement proper session management

## 📚 Documentation Standards

### Code Documentation

- Document all public APIs
- Include usage examples
- Explain complex algorithms
- Keep documentation up to date

### User Documentation

- Write clear, step-by-step instructions
- Include screenshots where helpful
- Provide troubleshooting information
- Test all documented procedures

## 🐛 Bug Reports

When reporting bugs, please include:

### Required Information

- **Environment**: OS, Node.js version, browser
- **Steps to Reproduce**: Clear, numbered steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Screenshots**: If applicable
- **Error Messages**: Full error text and stack traces

### Bug Report Template

```markdown
**Environment:**
- OS: [e.g., macOS 12.0]
- Node.js: [e.g., 18.17.0]
- Browser: [e.g., Chrome 115.0]
- MarkS3 Version: [e.g., 1.2.0]

**Steps to Reproduce:**
1. Go to '...'
2. Click on '...'
3. Scroll down to '...'
4. See error

**Expected Behavior:**
A clear description of what you expected to happen.

**Actual Behavior:**
A clear description of what actually happened.

**Screenshots:**
If applicable, add screenshots to help explain your problem.

**Additional Context:**
Add any other context about the problem here.
```

## 💡 Feature Requests

When requesting features, please include:

- **Problem Statement**: What problem does this solve?
- **Proposed Solution**: How should it work?
- **Alternatives**: Other solutions you've considered
- **Use Cases**: Specific scenarios where this would be useful
- **Priority**: How important is this feature?

## 📋 Pull Request Guidelines

### Before Submitting

- [ ] Tests pass locally
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] Commit messages follow conventions
- [ ] Branch is up to date with main

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No new warnings or errors
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs tests and linting
2. **Code Review**: Maintainers review code and provide feedback
3. **Testing**: Changes are tested in various environments
4. **Approval**: At least one maintainer approval required
5. **Merge**: Changes are merged to main branch

## 🏷️ Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Workflow

1. **Feature Freeze**: No new features for release
2. **Testing**: Comprehensive testing of release candidate
3. **Documentation**: Update changelog and documentation
4. **Tagging**: Create git tag with version number
5. **Release**: Publish release with notes

## 🤝 Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please read our [Code of Conduct](CODE_OF_CONDUCT.md).

### Communication

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and community discussion
- **Pull Requests**: Code contributions and reviews

### Getting Help

- Check existing issues and documentation first
- Provide detailed information when asking questions
- Be patient and respectful with maintainers and contributors

## 🎯 Contribution Areas

### High Priority

- 🐛 Bug fixes for reported issues
- 📝 Documentation improvements
- 🧪 Test coverage improvements
- ♿ Accessibility enhancements

### Medium Priority

- 🎨 UI/UX improvements
- ⚡ Performance optimizations
- 🔧 Developer experience improvements
- 🌐 Internationalization

### Future Enhancements

- 🔌 Plugin system
- 📊 Advanced analytics
- 🔍 Enhanced search capabilities
- 📱 Mobile app

## 📞 Contact

- **Maintainers**: [List of maintainers]
- **Email**: [Contact email if applicable]
- **Discord/Slack**: [Community chat if applicable]

## 🙏 Recognition

Contributors are recognized in:

- README.md contributors section
- Release notes
- GitHub contributors page
- Special recognition for significant contributions

Thank you for contributing to MarkS3! 🚀