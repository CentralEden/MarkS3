# MarkS3 - S3 Markdown Wiki

A serverless markdown wiki system hosted on AWS S3 with Cognito authentication.

## Overview

MarkS3 is a self-hosted markdown wiki application that runs entirely on AWS infrastructure without requiring backend servers. It uses:

- **Frontend**: TypeScript/Svelte SPA with Milkdown editor
- **Authentication**: AWS Cognito
- **Storage**: AWS S3 (direct browser access)
- **Infrastructure**: Terraform for AWS resource management
- **Hosting**: S3 static website with CloudFront CDN

## Features

- 📝 Rich markdown editing with Milkdown editor
- 🔐 Role-based access control (Guest, Regular, Admin)
- 📁 Hierarchical page organization
- 🔍 Full-text search functionality
- 📎 File upload and management
- 🔄 Optimistic locking for concurrent editing
- 🌐 Custom domain support with SSL
- 🚀 Serverless architecture (cost-effective)

## Quick Start

> **Note**: This project is currently in development. Full setup instructions will be available once implementation is complete.

### Prerequisites

- AWS Account with appropriate permissions
- Node.js 18+ and pnpm
- Terraform 1.0+

### Installation

1. Clone the repository
2. Install dependencies: `pnpm install`
3. Configure AWS credentials
4. Run Terraform to create infrastructure
5. Build and deploy the application

Detailed setup instructions will be provided in the complete documentation.

### Development Commands

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Type checking
pnpm check

# Lint and format
pnpm lint
pnpm format
```

## Project Structure

```
├── .kiro/                    # Kiro IDE specifications
│   └── specs/               # Feature specifications
├── src/                     # Source code (to be created)
├── terraform/               # Infrastructure as code (to be created)
├── docs/                    # Documentation (to be created)
└── README.md               # This file
```

## Development Status

This project is currently in the specification and design phase. Implementation is in progress following the detailed specifications in `.kiro/specs/s3-markdown-wiki/`.

## License

MIT License (to be added)

## Contributing

Contribution guidelines will be available once the initial implementation is complete.