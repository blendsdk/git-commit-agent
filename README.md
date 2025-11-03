# Git Commit Agent

AI-powered git commit message generator using LangChain and OpenAI. Automatically analyzes code changes and creates high-quality conventional commit messages.

## Features

- 🤖 **AI-Powered Analysis** - Uses OpenAI to understand code changes
- 📝 **Conventional Commits** - Generates standardized commit messages
- 🔍 **Smart Detection** - Identifies commit type, scope, and impact
- ⚙️ **Flexible Configuration** - CLI options, environment variables, and global config
- 🛡️ **Error Handling** - Comprehensive error handling with recovery suggestions
- 🌍 **Global Configuration** - Support for user-wide settings via `~/.agent-config`

## Installation

### Option 1: NPM/Yarn (Recommended)

```bash
# Using npm
npm install -g @blendsdk/git-commit-agent

# Using yarn
yarn global add @blendsdk/git-commit-agent
```

### Option 2: From Source

```bash
# Clone the repository
git clone https://github.com/blendsdk/git-commit-agent.git
cd git-commit-agent

# Install dependencies
yarn install

# Build
yarn build

# Link globally for testing
yarn link
```

## Quick Start

```bash
# Navigate to your git repository
cd your-project

# Make some changes
# ... edit files ...

# Run the agent
git-commit-agent
```

The agent will:
1. Analyze all changes in your repository
2. Generate a comprehensive conventional commit message
3. Stage all changes (configurable)
4. Create the commit with proper multi-line formatting

## Configuration

### Environment Variables

Create a `.env` file in your project root or `~/.agent-config` in your home directory:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional - Model configuration
OPENAI_MODEL=gpt-4

# Optional - LangChain configuration
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langchain_api_key

# Optional - Commit format defaults
COMMIT_TYPE=feat
COMMIT_SCOPE=api
COMMIT_SUBJECT_MAX_LENGTH=72
COMMIT_DETAIL_LEVEL=normal
COMMIT_FILE_BREAKDOWN=true

# Optional - Behavior defaults
AUTO_STAGE=all
ALLOW_PUSH=false
SKIP_VERIFICATION=false
CONVENTIONAL_STRICT=true

# Optional - Execution defaults
DRY_RUN=false
VERBOSE=false
```

### Global Configuration

For user-wide settings, create `~/.agent-config`:

```bash
# Linux/Mac
echo "OPENAI_API_KEY=your_key_here" > ~/.agent-config

# Windows
echo OPENAI_API_KEY=your_key_here > %USERPROFILE%\.agent-config
```

**Note:** Local `.env` files override global settings.

### Configuration Priority

Configuration values are merged from three sources:

1. **CLI Arguments** (highest priority)
2. **Environment Variables** (from `.env` file)
3. **Built-in Defaults** (lowest priority)

## Usage

### Basic Commands

```bash
# Use default configuration
git-commit-agent

# Preview commit message without committing
git-commit-agent --dry-run

# Enable verbose output for debugging
git-commit-agent --verbose

# Get help
git-commit-agent --help

# Show version
git-commit-agent --version
```

### CLI Options

#### Commit Message Format

**`--commit-type <type>`**  
Force a specific commit type instead of letting the agent determine it.

Choices: `feat`, `fix`, `refactor`, `docs`, `test`, `build`, `ci`, `perf`, `style`, `chore`

```bash
git-commit-agent --commit-type feat
```

**`--scope <scope>`**  
Set the commit scope (e.g., auth, api, ui).

```bash
git-commit-agent --scope auth
```

**`--subject-max-length <number>`**  
Maximum length for the commit subject line (default: 72).

```bash
git-commit-agent --subject-max-length 50
```

**`--detail-level <level>`**  
Control the level of detail in the commit message body.

Choices: `brief`, `normal`, `detailed` (default: `normal`)

- `brief`: Minimal description (1-2 sentences)
- `normal`: Standard description with key changes
- `detailed`: Comprehensive description with file-by-file breakdown

```bash
git-commit-agent --detail-level detailed
```

**`--file-breakdown` / `--no-file-breakdown`**  
Include or exclude file-by-file breakdown in the commit body (default: `true`).

```bash
git-commit-agent --no-file-breakdown
```

#### Behavior Controls

**`--auto-stage <mode>`**  
Control automatic staging behavior before commit.

Choices: `all`, `modified`, `none` (default: `all`)

- `all`: Stage all changes including untracked files (`git add .`)
- `modified`: Stage only modified and deleted files (`git add -u`)
- `none`: Don't stage anything, commit only what's already staged

```bash
git-commit-agent --auto-stage modified
```

**`--allow-push`**  
Allow pushing to remote repository after commit (default: `false`).

```bash
git-commit-agent --allow-push
```

**`--no-verify`**  
Skip commit verification hooks (pre-commit, commit-msg) (default: `false`).

```bash
git-commit-agent --no-verify
```

**`--conventional-strict`**  
Enforce strict conventional commit format (default: `true`).

```bash
git-commit-agent --conventional-strict
```

#### Execution Options

**`--dry-run`**  
Analyze changes and generate commit message without actually committing (default: `false`).

```bash
git-commit-agent --dry-run
```

**`--verbose`**  
Enable verbose logging to see detailed execution information (default: `false`).

```bash
git-commit-agent --verbose
```

**`--config <path>`**  
Path to custom configuration file (future feature).

```bash
git-commit-agent --config ./custom-config.json
```

### Usage Examples

#### Basic Usage

```bash
# Use all defaults
git-commit-agent

# Preview commit message without committing
git-commit-agent --dry-run

# Enable verbose output for debugging
git-commit-agent --verbose
```

#### Commit Message Customization

```bash
# Force specific commit type and scope
git-commit-agent --commit-type feat --scope auth

# Brief commit message without file breakdown
git-commit-agent --detail-level brief --no-file-breakdown

# Detailed commit with longer subject line
git-commit-agent --detail-level detailed --subject-max-length 100

# Quick fix with minimal detail
git-commit-agent --commit-type fix --detail-level brief
```

#### Staging Control

```bash
# Stage all files including untracked (default)
git-commit-agent --auto-stage all

# Only stage modified files
git-commit-agent --auto-stage modified

# Only commit already staged files
git-commit-agent --auto-stage none
```

#### Advanced Workflows

```bash
# Complete workflow: stage all, commit, and push
git-commit-agent --auto-stage all --allow-push

# Skip pre-commit hooks
git-commit-agent --no-verify

# Dry run with verbose output to see what would happen
git-commit-agent --dry-run --verbose

# Feature commit with detailed breakdown
git-commit-agent --commit-type feat --scope api --detail-level detailed
```

#### Team Workflows

```bash
# Consistent brief commits for the team
git-commit-agent --detail-level brief --subject-max-length 50

# Detailed commits for major features
git-commit-agent --detail-level detailed --commit-type feat

# Quick fixes without verification
git-commit-agent --commit-type fix --no-verify --detail-level brief
```

### Configuration Presets

#### Preset 1: Quick Commits
For rapid development with minimal commit messages:

```bash
git-commit-agent --detail-level brief --no-file-breakdown
```

Or in `.env`:
```env
COMMIT_DETAIL_LEVEL=brief
COMMIT_FILE_BREAKDOWN=false
AUTO_STAGE=all
```

#### Preset 2: Detailed Documentation
For comprehensive commit history:

```bash
git-commit-agent --detail-level detailed --file-breakdown --subject-max-length 72
```

Or in `.env`:
```env
COMMIT_DETAIL_LEVEL=detailed
COMMIT_FILE_BREAKDOWN=true
COMMIT_SUBJECT_MAX_LENGTH=72
```

#### Preset 3: CI/CD Pipeline
For automated commits in CI/CD:

```bash
git-commit-agent --auto-stage all --no-verify --allow-push --detail-level normal
```

Or in `.env`:
```env
AUTO_STAGE=all
SKIP_VERIFICATION=true
ALLOW_PUSH=true
COMMIT_DETAIL_LEVEL=normal
```

## Commit Message Format

The agent generates commit messages following the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

| Type       | Description                     |
| ---------- | ------------------------------- |
| `feat`     | New feature                     |
| `fix`      | Bug fix                         |
| `docs`     | Documentation changes           |
| `style`    | Code style changes (formatting) |
| `refactor` | Code refactoring                |
| `perf`     | Performance improvements        |
| `test`     | Adding or updating tests        |
| `build`    | Build system changes            |
| `ci`       | CI configuration changes        |
| `chore`    | Other changes                   |

### Example Output

```
feat(auth): add OAuth2 authentication support

- Implement OAuth2 flow with Google and GitHub providers
- Add token refresh mechanism
- Create user session management
- Update authentication middleware to support OAuth tokens

This enables users to sign in using their existing social accounts,
improving user experience and reducing friction in the signup process.

Closes #234
```

## Troubleshooting

### "Not a git repository" Error

Make sure you're in a git repository:

```bash
git init  # If starting a new repo
```

### "OPENAI_API_KEY not found" Error

Set your API key:

```bash
export OPENAI_API_KEY=your_key_here
# Or add to .env file
```

### "No changes to commit" Error

Make sure you have uncommitted changes:

```bash
git status  # Check for changes
```

### Commit message too long

Reduce `--subject-max-length` or use `--detail-level brief`:

```bash
git-commit-agent --subject-max-length 50 --detail-level brief
```

### Wrong files staged

Use `--auto-stage none` and manually stage files first:

```bash
git add file1.js file2.js
git-commit-agent --auto-stage none
```

### Pre-commit hooks failing

Use `--no-verify` to skip hooks (use cautiously):

```bash
git-commit-agent --no-verify
```

### Need to see what's happening

Use `--verbose` and `--dry-run` together:

```bash
git-commit-agent --verbose --dry-run
```

### Build Errors (when installing from source)

```bash
# Clear node_modules and reinstall
rm -rf node_modules yarn.lock
yarn install
yarn build
```

## Tips and Best Practices

1. **Use `.env` for team defaults**: Set common configuration in `.env` and commit it to your repository
2. **Override with CLI for special cases**: Use CLI arguments for one-off changes
3. **Dry run first**: Use `--dry-run` to preview the commit message before committing
4. **Verbose for debugging**: Enable `--verbose` when troubleshooting issues
5. **Consistent subject length**: Stick to 72 characters for better GitHub display
6. **Detail level by context**: Use `brief` for small changes, `detailed` for major features

## Documentation

- **[DEVELOPMENT.md](./DEVELOPMENT.md)** - Development guide, architecture, and contributing

## License

ISC License - see LICENSE file for details.

## Acknowledgments

- [LangChain](https://github.com/langchain-ai/langchainjs) - Framework for LLM applications
- [OpenAI](https://openai.com/) - AI model provider
- [Conventional Commits](https://www.conventionalcommits.org/) - Commit message specification

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/blendsdk/git-commit-agent).

---

**Note:** Remember to replace repository URLs with your actual GitHub repository.
