# Git Commit Agent - Development Guide

This guide covers the technical aspects of developing, building, and contributing to the Git Commit Agent project.

## Table of Contents

- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Development Setup](#development-setup)
- [Building](#building)
- [Scripts Reference](#scripts-reference)
- [CI/CD Pipeline](#cicd-pipeline)
- [Creating Releases](#creating-releases)
- [Contributing](#contributing)
- [Technical Documentation](#technical-documentation)

## Project Structure

```
git-commit-agent/
├── src/
│   ├── index.ts                      # Main agent entry point
│   ├── config/
│   │   ├── cli-parser.ts            # CLI argument parsing
│   │   ├── config-merger.ts         # Configuration merging logic
│   │   ├── env-loader.ts            # Environment configuration loader
│   │   └── prompt-config.ts         # Prompt configuration
│   ├── prompts/
│   │   ├── git-prompt-generator.ts  # Dynamic prompt generation
│   │   ├── git-prompt.ts            # Git-specific prompts
│   │   ├── system-prompt.ts         # System prompts
│   │   └── index.ts                 # Prompt exports
│   ├── tools/
│   │   └── git-master.tool.ts       # Master git command tool
│   └── utils/
│       ├── git-commands.ts          # Git command utilities
│       ├── git-error.ts             # Error handling
│       └── validators.ts            # Validation functions
├── dist/                             # Compiled JavaScript (generated)
├── .github/
│   └── workflows/
│       └── build-and-release.yml    # CI/CD pipeline
├── package.json                      # Project metadata and scripts
├── tsconfig.json                     # TypeScript configuration
├── ENHANCEMENTS.md                   # Technical documentation
├── COMMIT_PROMPT_GUIDE.md           # Commit message guide
├── DEVELOPMENT.md                    # This file
└── README.md                         # User-facing documentation
```

## Architecture

### Core Components

#### 1. Configuration System
- **cli-parser.ts**: Parses command-line arguments using a custom parser
- **env-loader.ts**: Loads environment variables from `.env` and `~/.agent-config`
- **config-merger.ts**: Merges configuration from CLI, environment, and defaults with proper priority
- **prompt-config.ts**: Manages prompt-specific configuration

#### 2. Prompt System
- **system-prompt.ts**: Defines the AI agent's behavior and constraints
- **git-prompt.ts**: Templates for git-specific prompts
- **git-prompt-generator.ts**: Dynamically generates prompts based on configuration
- Uses LangChain's prompt templates for structured AI interactions

#### 3. Git Tool System
- **git-master.tool.ts**: Single powerful tool that can execute any git command
- Includes comprehensive error handling and validation
- Safety checks block dangerous commands (reset --hard, push --force, etc.)
- Provides recovery suggestions for common errors

#### 4. Utilities
- **git-commands.ts**: Helper functions for common git operations
- **git-error.ts**: Custom error types and error handling logic
- **validators.ts**: Input validation and safety checks

### Data Flow

```
User Input (CLI)
    ↓
CLI Parser → Configuration Merger ← Environment Variables
    ↓
Prompt Generator
    ↓
LangChain Agent (OpenAI)
    ↓
Git Master Tool
    ↓
Git Commands Execution
    ↓
Commit Created
```

### Configuration Priority

1. **CLI Arguments** (highest priority)
2. **Environment Variables** (from `.env` file)
3. **Built-in Defaults** (lowest priority)

## Development Setup

### Prerequisites

- Node.js 18.x or 20.x
- Yarn or npm
- Git
- OpenAI API key

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/blendsdk/git-commit-agent.git
cd git-commit-agent

# Install dependencies
yarn install

# Create .env file
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Build the project
yarn build
```

### Development Workflow

```bash
# Watch mode - rebuilds on file changes
yarn dev

# In another terminal, run the agent
yarn go

# Or run directly
yarn start
```

### Testing Local Installation

Before publishing, test the CLI globally:

```bash
# Link the package globally
npm link
# or
yarn link

# Test from any git repository
cd /path/to/any/git/repo
git-commit-agent

# When done testing, unlink
npm unlink -g @blendsdk/git-commit-agent
# or
yarn unlink @blendsdk/git-commit-agent
```

## Building

### Build Commands

```bash
# Clean and build
yarn build

# Clean only (removes dist folder)
yarn clean

# Build without cleaning
yarn tsc
```

### Build Output

- Compiled JavaScript files are output to `dist/`
- Source maps are generated for debugging
- The `dist/` directory is excluded from git via `.gitignore`

## Scripts Reference

| Script | Command | Description |
|--------|---------|-------------|
| `build` | `yarn clean && tsc` | Clean and compile TypeScript |
| `dev` | `tsc --watch` | Watch mode for development |
| `start` | `node dist/index.js` | Run the compiled agent |
| `go` | `clear && yarn start` | Clear console and run |
| `clean` | `rm -rf dist` | Remove compiled files |

## CI/CD Pipeline

The project uses GitHub Actions for continuous integration and deployment.

### Workflow: Build and Release

**File:** `.github/workflows/build-and-release.yml`

#### Triggers
- Push to `main` branch
- Pull requests to `main` branch
- Version tags (e.g., `v1.0.0`)

#### Jobs

##### 1. Build & Test
- Runs on Node.js 18.x and 20.x
- Installs dependencies
- Compiles TypeScript
- Runs tests (if configured)
- Validates build artifacts

##### 2. Release (on tags only)
- Creates GitHub release
- Uploads build artifacts
- Generates release notes
- (Optional) Publishes to NPM

### Workflow Configuration

```yaml
name: Build and Release

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    # ... build steps

  release:
    needs: build
    if: startsWith(github.ref, 'refs/tags/v')
    # ... release steps
```

## Creating Releases

### Version Tagging

```bash
# Update version in package.json
npm version patch  # or minor, or major
# This creates a git tag automatically

# Push the tag to trigger release
git push origin v1.0.0

# Or push all tags
git push --tags
```

### Release Process

1. **Update Version**: Modify `package.json` version
2. **Create Tag**: `git tag v1.0.0`
3. **Push Tag**: `git push origin v1.0.0`
4. **GitHub Actions**: Automatically builds and creates release
5. **Verify**: Check GitHub releases page

### Publishing to NPM

To enable automatic NPM publishing:

1. Generate NPM token at https://www.npmjs.com/settings/tokens
2. Add `NPM_TOKEN` secret to GitHub repository settings
3. Uncomment the publish step in `.github/workflows/build-and-release.yml`
4. Push a version tag to trigger the release

```yaml
# Uncomment this section in the workflow file
- name: Publish to NPM
  run: npm publish
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Contributing

We welcome contributions! Here's how to get started:

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/yourusername/git-commit-agent.git
cd git-commit-agent
```

### 2. Create a Branch

```bash
git checkout -b feature/amazing-feature
```

### 3. Make Changes

- Follow the existing code style
- Add tests if applicable
- Update documentation as needed
- Ensure the build passes: `yarn build`

### 4. Commit Your Changes

```bash
# Use the agent itself!
git-commit-agent

# Or manually follow conventional commits
git commit -m 'feat: add amazing feature'
```

### 5. Push and Create PR

```bash
git push origin feature/amazing-feature
```

Then open a Pull Request on GitHub.

### Code Style Guidelines

- Use TypeScript strict mode
- Follow existing naming conventions
- Add JSDoc comments for public APIs
- Keep functions focused and single-purpose
- Use meaningful variable names

### Commit Message Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

## Technical Documentation

### Additional Resources

- **[ENHANCEMENTS.md](./ENHANCEMENTS.md)**: Detailed technical documentation of enhancements and architectural decisions
- **[COMMIT_PROMPT_GUIDE.md](./COMMIT_PROMPT_GUIDE.md)**: Comprehensive guide on commit message generation and prompt engineering
- **[README.md](./README.md)**: User-facing documentation and usage guide

### Key Technical Concepts

#### LangChain Integration
- Uses LangChain's agent framework
- Implements custom tools for git operations
- Leverages OpenAI's GPT models for intelligent commit message generation

#### Error Handling
- Custom error types for different failure scenarios
- Recovery suggestions for common git errors
- Graceful degradation when API calls fail

#### Safety Features
- Validates all git commands before execution
- Blocks dangerous operations (force push, hard reset)
- Confirms destructive actions with user

#### Configuration System
- Three-tier configuration (CLI > ENV > Defaults)
- Support for global user configuration
- Environment-specific overrides

## Troubleshooting Development Issues

### Build Errors

```bash
# Clear everything and reinstall
rm -rf node_modules yarn.lock dist
yarn install
yarn build
```

### TypeScript Errors

```bash
# Check TypeScript version
yarn tsc --version

# Verify tsconfig.json is correct
cat tsconfig.json
```

### Runtime Errors

```bash
# Enable verbose logging
yarn start --verbose

# Check environment variables
cat .env
```

### Git Tool Issues

```bash
# Test git commands manually
git status
git diff

# Verify git is in PATH
which git
```

## Support and Community

- **Issues**: Report bugs on [GitHub Issues](https://github.com/blendsdk/git-commit-agent/issues)
- **Discussions**: Join conversations on [GitHub Discussions](https://github.com/blendsdk/git-commit-agent/discussions)
- **Pull Requests**: Contribute code via [Pull Requests](https://github.com/blendsdk/git-commit-agent/pulls)

## License

ISC License - see LICENSE file for details.

---

**Happy coding!** 🚀
