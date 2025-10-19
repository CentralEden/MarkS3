# Commit Message Conventions

This document outlines the commit message conventions used in the MarkS3 project. Following these conventions helps maintain a clean and readable git history, enables automated changelog generation, and facilitates semantic versioning.

## Format

All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Examples

```bash
feat(auth): add OAuth2 integration
fix(editor): resolve markdown parsing issue
docs(readme): update installation instructions
style(components): format code with prettier
refactor(wiki): extract page service logic
test(auth): add integration tests for login flow
chore(deps): update dependencies to latest versions
```

## Commit Types

### Primary Types

#### `feat` - New Features
Use when adding new functionality or features.

```bash
feat(editor): add real-time collaboration
feat(search): implement full-text search
feat(admin): add user management panel
```

#### `fix` - Bug Fixes
Use when fixing bugs or issues.

```bash
fix(auth): resolve token expiration handling
fix(upload): handle large file uploads correctly
fix(mobile): improve responsive design on tablets
```

#### `docs` - Documentation
Use when adding or updating documentation.

```bash
docs(api): add authentication examples
docs(deployment): update AWS setup guide
docs(readme): fix broken links
```

### Secondary Types

#### `style` - Code Style
Use for formatting, missing semicolons, etc. (no production code change).

```bash
style(components): format with prettier
style(css): fix indentation in stylesheets
style(lint): resolve ESLint warnings
```

#### `refactor` - Code Refactoring
Use when refactoring code without changing functionality.

```bash
refactor(services): extract common AWS utilities
refactor(components): simplify page editor logic
refactor(types): consolidate interface definitions
```

#### `test` - Tests
Use when adding or updating tests.

```bash
test(auth): add unit tests for login service
test(e2e): add page creation workflow test
test(integration): add S3 upload tests
```

#### `chore` - Maintenance
Use for maintenance tasks, dependency updates, etc.

```bash
chore(deps): update svelte to v4.2.8
chore(build): optimize webpack configuration
chore(ci): update GitHub Actions workflows
```

### Special Types

#### `perf` - Performance Improvements
Use when improving performance.

```bash
perf(editor): optimize markdown rendering
perf(search): implement search result caching
perf(images): add lazy loading for page images
```

#### `ci` - Continuous Integration
Use for CI/CD related changes.

```bash
ci(github): add automated testing workflow
ci(deploy): optimize deployment pipeline
ci(security): add dependency vulnerability scanning
```

#### `build` - Build System
Use for build system or external dependency changes.

```bash
build(vite): update build configuration
build(terraform): optimize infrastructure modules
build(docker): add containerization support
```

#### `revert` - Reverts
Use when reverting previous commits.

```bash
revert: feat(auth): add OAuth2 integration

This reverts commit 1234567890abcdef.
Reason: OAuth2 integration causing authentication issues.
```

## Scopes

Scopes provide additional context about which part of the codebase is affected. Use lowercase and be consistent.

### Common Scopes

#### Frontend Scopes
- `auth` - Authentication related changes
- `editor` - Markdown editor components
- `ui` - User interface components
- `pages` - Page management functionality
- `files` - File upload and management
- `search` - Search functionality
- `admin` - Admin panel features
- `mobile` - Mobile-specific changes

#### Backend/Infrastructure Scopes
- `api` - API related changes
- `aws` - AWS service integrations
- `s3` - S3 specific functionality
- `cognito` - Cognito authentication
- `terraform` - Infrastructure as code
- `deploy` - Deployment scripts and processes

#### Development Scopes
- `deps` - Dependencies
- `config` - Configuration files
- `build` - Build system
- `ci` - Continuous integration
- `test` - Testing infrastructure
- `docs` - Documentation

### Scope Examples

```bash
feat(auth): add multi-factor authentication
fix(editor): resolve image upload in markdown
docs(api): update authentication endpoints
test(s3): add integration tests for file operations
chore(deps): update AWS SDK to v3.400.0
```

## Message Description

### Guidelines

1. **Use imperative mood**: "add feature" not "added feature"
2. **Start with lowercase**: Unless it's a proper noun
3. **No period at the end**: Keep it concise
4. **Limit to 50 characters**: For better readability in git logs
5. **Be descriptive but concise**: Explain what the commit does

### Good Examples

```bash
feat(auth): add password reset functionality
fix(editor): prevent XSS in markdown content
docs(readme): update installation requirements
refactor(utils): extract validation helpers
```

### Bad Examples

```bash
# Too vague
fix: bug fix

# Past tense
feat: added new feature

# Too long
feat(auth): add a comprehensive multi-factor authentication system with SMS and email verification

# Unclear scope
update: some changes to files
```

## Message Body

Use the body to explain **what** and **why**, not **how**. The body should be wrapped at 72 characters.

### Format

```
<type>(scope): <description>

More detailed explanatory text, if necessary. Wrap it to about 72
characters or so. In some contexts, the first line is treated as the
subject of the commit and the rest of the text as the body.

The blank line separating the summary from the body is critical
(unless you omit the body entirely); various tools like `log`,
`shortlog` and `rebase` can get confused if you run the two together.

Explain the problem that this commit is solving. Focus on why you
are making this change as opposed to how (the code explains that).
Are there side effects or other unintuitive consequences of this
change? Here's the place to explain them.
```

### Example with Body

```bash
feat(search): implement full-text search with indexing

Add comprehensive search functionality that indexes all page content
and metadata. The search supports:

- Full-text search across page titles and content
- Tag-based filtering
- Author and date range filters
- Fuzzy matching for typos

This addresses the user feedback about difficulty finding content
in large wikis. The search index is updated automatically when
pages are created, modified, or deleted.

Performance testing shows sub-100ms response times for typical
queries on wikis with up to 10,000 pages.
```

## Message Footer

Use the footer for referencing issues, breaking changes, and other metadata.

### Issue References

```bash
feat(auth): add OAuth2 integration

Closes #123
Fixes #456
Refs #789
```

### Breaking Changes

```bash
feat(api): update authentication API

BREAKING CHANGE: The authentication API now requires OAuth2 tokens
instead of API keys. Existing integrations need to be updated to use
the new OAuth2 flow.

Migration guide: docs/migration/oauth2.md
```

### Co-authored Commits

```bash
feat(editor): add collaborative editing

Co-authored-by: Jane Doe <jane@example.com>
Co-authored-by: John Smith <john@example.com>
```

## Complete Examples

### Simple Feature Addition

```bash
feat(files): add drag-and-drop upload support
```

### Bug Fix with Details

```bash
fix(auth): resolve token refresh race condition

Fix race condition where multiple simultaneous requests could
trigger multiple token refresh attempts, leading to authentication
errors.

The fix implements a token refresh queue that ensures only one
refresh request is active at a time, with subsequent requests
waiting for the active refresh to complete.

Fixes #234
```

### Breaking Change

```bash
feat(api): redesign page API for better performance

BREAKING CHANGE: The page API endpoints have been restructured:
- GET /api/pages/:id -> GET /api/v2/pages/:id
- POST /api/pages -> POST /api/v2/pages
- PUT /api/pages/:id -> PATCH /api/v2/pages/:id

The new API provides better performance and more consistent
response formats. See migration guide for details.

Closes #345
```

### Documentation Update

```bash
docs(deployment): add troubleshooting section

Add comprehensive troubleshooting guide covering:
- Common deployment issues
- AWS permission problems
- CloudFront configuration errors
- Performance optimization tips

Based on community feedback and support requests.

Refs #456
```

## Automated Tools

### Commitizen

Use [Commitizen](https://github.com/commitizen/cz-cli) for interactive commit message creation:

```bash
# Install globally
npm install -g commitizen cz-conventional-changelog

# Configure for project
echo '{ "path": "cz-conventional-changelog" }' > ~/.czrc

# Use instead of git commit
git cz
```

### Commitlint

Use [Commitlint](https://commitlint.js.org/) to validate commit messages:

```bash
# Install
npm install --save-dev @commitlint/cli @commitlint/config-conventional

# Configure
echo "module.exports = {extends: ['@commitlint/config-conventional']}" > commitlint.config.js

# Add to package.json
{
  "husky": {
    "hooks": {
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  }
}
```

### VS Code Extension

Install the [Conventional Commits](https://marketplace.visualstudio.com/items?itemName=vivaxy.vscode-conventional-commits) extension for VS Code to get commit message assistance.

## Git Hooks

### Pre-commit Hook

```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run linting and tests before commit
npm run lint
npm run test:unit

# Check for TODO/FIXME comments in staged files
if git diff --cached --name-only | xargs grep -l "TODO\|FIXME" > /dev/null; then
  echo "Warning: Found TODO/FIXME comments in staged files"
  echo "Consider addressing these before committing:"
  git diff --cached --name-only | xargs grep -n "TODO\|FIXME"
fi
```

### Commit Message Hook

```bash
#!/bin/sh
# .git/hooks/commit-msg

# Validate commit message format
npx commitlint --edit $1
```

## Release Notes Generation

Conventional commits enable automated changelog generation:

```bash
# Generate changelog
npx conventional-changelog -p angular -i CHANGELOG.md -s

# Generate release notes for specific version
npx conventional-changelog -p angular -r 2
```

## Best Practices

### Do's

✅ **Use present tense**: "add feature" not "added feature"
✅ **Be specific**: Include relevant scope and clear description
✅ **Reference issues**: Link to GitHub issues when applicable
✅ **Explain why**: Use the body to explain motivation and context
✅ **Keep it atomic**: One logical change per commit
✅ **Test before committing**: Ensure code works and tests pass

### Don'ts

❌ **Don't use vague messages**: "fix stuff" or "update code"
❌ **Don't mix concerns**: Combine unrelated changes in one commit
❌ **Don't commit broken code**: Always test before committing
❌ **Don't use past tense**: "fixed bug" should be "fix bug"
❌ **Don't exceed line limits**: Keep subject under 50 chars, body under 72
❌ **Don't forget the scope**: When the change affects a specific area

## Examples by Category

### Authentication Changes

```bash
feat(auth): add social login with Google OAuth
fix(auth): resolve session timeout handling
refactor(auth): extract token management utilities
test(auth): add comprehensive login flow tests
docs(auth): update authentication setup guide
```

### Editor Improvements

```bash
feat(editor): add syntax highlighting for code blocks
fix(editor): prevent data loss on browser refresh
perf(editor): optimize real-time preview rendering
style(editor): improve toolbar button spacing
test(editor): add markdown parsing edge cases
```

### Infrastructure Updates

```bash
feat(terraform): add multi-region deployment support
fix(deploy): resolve CloudFront cache invalidation
chore(aws): update SDK to latest version
ci(github): add automated security scanning
docs(deployment): add disaster recovery procedures
```

### Bug Fixes

```bash
fix(upload): handle network interruptions gracefully
fix(search): escape special characters in queries
fix(mobile): improve touch gesture handling
fix(performance): reduce memory usage in large wikis
fix(security): sanitize user input in comments
```

---

Following these conventions helps maintain a professional and organized codebase. When in doubt, refer to the [Conventional Commits specification](https://www.conventionalcommits.org/) for additional guidance.