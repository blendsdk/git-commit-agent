# Git Commit Agent

AI-powered git commit message generator using LangChain and OpenAI. Automatically analyzes code changes and creates high-quality conventional commit messages.

## Features

-   🤖 **AI-Powered Analysis** - Uses OpenAI to understand code changes
-   📝 **Conventional Commits** - Generates standardized commit messages
-   🔍 **Smart Detection** - Identifies commit type, scope, and impact
-   🛡️ **Error Handling** - Comprehensive error handling with recovery suggestions (enhanced version)
-   🌍 **Global Configuration** - Support for user-wide settings via `~/.agent-config`
-   🚀 **CI/CD Ready** - GitHub Actions workflow for automated builds and releases

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
git clone https://github.com/yourusername/git-commit-agent.git
cd git-commit-agent

# Install dependencies
yarn install

# Build
yarn build

# Run
yarn start
```

## Configuration

### Environment Variables

Create a `.env` file in your project root or `~/.agent-config` in your home directory:

```env
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional - Model configuration
OPENAI_MODEL=gpt-4
OPENAI_TEMPERATURE=0.7

# Optional - LangChain configuration
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langchain_api_key
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

## Usage

### Basic Usage

```bash
# Navigate to your git repository
cd your-project

# Make some changes
# ... edit files ...

# Run the agent
git-commit-agent

# Or if installed from source
yarn start
```

The agent will:

1. Analyze all changes in your repository
2. Generate a conventional commit message
3. Stage all changes
4. Create the commit

### Enhanced Version

For the version with comprehensive error handling:

```bash
yarn start:enhanced
```

### Development Mode

```bash
# Watch mode - rebuilds on file changes
yarn dev

# In another terminal
yarn go
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

## Documentation

-   [ENHANCEMENTS.md](./ENHANCEMENTS.md) - Technical documentation of enhancements
-   [COMMIT_PROMPT_GUIDE.md](./COMMIT_PROMPT_GUIDE.md) - Comprehensive commit message guide

## Project Structure

```
git-commit-agent/
├── src/
│   ├── index.ts              # Main agent (basic version)
│   └── index-enhanced.ts     # Enhanced version with error handling
├── dist/                     # Compiled JavaScript (generated)
├── .github/
│   └── workflows/
│       └── build-and-release.yml  # CI/CD pipeline
├── package.json              # Project metadata and scripts
├── tsconfig.json            # TypeScript configuration
├── ENHANCEMENTS.md          # Technical documentation
├── COMMIT_PROMPT_GUIDE.md   # Commit message guide
└── README.md                # This file
```

## Development

### Building

```bash
# Clean and build
yarn build

# Clean only
yarn clean
```

### Scripts

```bash
yarn build          # Compile TypeScript
yarn dev            # Watch mode
yarn start          # Run basic version
yarn start:enhanced # Run enhanced version
yarn go             # Clear console and run
yarn clean          # Remove dist folder
```

## CI/CD

The project includes a GitHub Actions workflow that:

1. **Build & Test** - Runs on Node 18.x and 20.x
2. **Release** - Creates GitHub releases on version tags
3. **NPM Publishing** - Optional automated publishing to NPM

### Creating a Release

```bash
# Tag a new version
git tag v1.0.0
git push origin v1.0.0

# GitHub Actions will automatically:
# - Build the project
# - Run tests
# - Create a GitHub release with artifacts
# - (Optional) Publish to NPM
```

### Publishing to NPM

To enable automatic NPM publishing:

1. Add `NPM_TOKEN` secret to your GitHub repository
2. Uncomment the publish line in `.github/workflows/build-and-release.yml`
3. Push a version tag to trigger the release

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

### Build Errors

```bash
# Clear node_modules and reinstall
rm -rf node_modules yarn.lock
yarn install
yarn build
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC License - see LICENSE file for details

## Acknowledgments

-   [LangChain](https://github.com/langchain-ai/langchainjs) - Framework for LLM applications
-   [OpenAI](https://openai.com/) - AI model provider
-   [Conventional Commits](https://www.conventionalcommits.org/) - Commit message specification

## Support

For issues, questions, or contributions, please visit the [GitHub repository](https://github.com/yourusername/git-commit-agent).

---

**Note:** Remember to replace `yourusername` with your actual GitHub username in URLs and configurations.
