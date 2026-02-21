# Contributing to VPN Deployment Platform

Thank you for your interest in contributing to the VPN Deployment Platform! This document provides guidelines and instructions for contributing.

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report, include:

- **Clear title and description**: Explain the problem succinctly
- **Steps to reproduce**: Detailed steps to reproduce the issue
- **Expected behavior**: What you expected to happen
- **Actual behavior**: What actually happened
- **Environment**: OS, Node.js version, browser version (if applicable)
- **Logs/screenshots**: Any relevant error messages or screenshots

### Suggesting Enhancements

Enhancement suggestions are welcome! Please provide:

- **Clear title and description**
- **Use cases**: Why this enhancement would be useful
- **Proposed solution**: How you envision it working
- **Alternatives considered**: Other approaches you've thought about

### Pull Requests

1. **Fork the repository** and create your branch from `main`
2. **Make your changes** with clear, descriptive commit messages
3. **Write tests** if applicable (we're working on adding test coverage)
4. **Ensure code passes** linting and builds successfully
5. **Update documentation** if you've changed functionality
6. **Submit a pull request** with a clear description of changes

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- MySQL 8.0+
- SSH access to a VPS for testing deployments

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/vpn-deployment.git
cd vpn-deployment
```

2. Install dependencies:
```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

3. Configure environment:
```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your database credentials
```

4. Start development servers:
```bash
# Backend
cd backend
npm run start:dev

# Frontend (in another terminal)
cd frontend
npm run dev
```

## Coding Standards

### Code Style

- **TypeScript**: Use TypeScript for type safety
- **Naming**: Use camelCase for variables/funcs, PascalCase for classes/types
- **Comments**: Document complex logic and public APIs
- **Console logs**: Remove or replace with proper logging before committing

### Backend (NestJS)

- Follow [NestJS style guide](https://docs.nestjs.com/first-steps)
- Use DTOs for API validation
- Implement proper error handling
- Use decorators for dependency injection

### Frontend (Vue 3)

- Follow [Vue 3 style guide](https://vuejs.org/style-guide/)
- Use Composition API
- Implement proper TypeScript types
- Handle loading and error states in UI

## Commit Messages

Use clear, descriptive commit messages:

- **feat**: Add new feature
- **fix**: Fix bug
- **docs**: Update documentation
- **style**: Format code (no logic change)
- **refactor**: Refactor code
- **test**: Add/update tests
- **chore**: Update build/config

Examples:
```
feat: add support for Trojan protocol
fix: resolve SSH connection timeout issue
docs: update deployment instructions
```

## Testing

We're working on comprehensive test coverage. In the meantime:

- Manually test all changes
- Test deployment process on a VPS
- Verify UI flows work correctly
- Check for console errors

## Questions?

Feel free to open an issue with the `question` label. We'll do our best to help!

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
