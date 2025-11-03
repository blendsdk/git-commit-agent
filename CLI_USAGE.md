# Git Commit Agent - CLI Usage Guide

This guide explains how to use the command-line interface and configuration options for the Git Commit Agent.

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration Priority](#configuration-priority)
- [CLI Options](#cli-options)
- [Environment Variables](#environment-variables)
- [Usage Examples](#usage-examples)
- [Configuration Presets](#configuration-presets)

## Quick Start

```bash
# Use default configuration
git-commit-agent

# Get help
git-commit-agent --help

# Show version
git-commit-agent --version
```

## Configuration Priority

Configuration values are merged from three sources with the following priority:

1. **CLI Arguments** (highest priority)
2. **Environment Variables** (from `.env` file)
3. **Built-in Defaults** (lowest priority)

## CLI Options

### Commit Message Format

#### `--commit-type <type>`
Force a specific commit type instead of letting the agent determine it.

**Choices:** `feat`, `fix`, `refactor`, `docs`, `test`, `build`, `ci`, `perf`, `style`, `chore`

```bash
git-commit-agent --commit-type feat
```

#### `--scope <scope>`
Set the commit scope (e.g., auth, api, ui).

```bash
git-commit-agent --scope auth
```

#### `--subject-max-length <number>`
Maximum length for the commit subject line.

**Default:** 72 characters (standard git convention)

```bash
git-commit-agent --subject-max-length 50
```

#### `--detail-level <level>`
Control the level of detail in the commit message body.

**Choices:** `brief`, `normal`, `detailed`  
**Default:** `normal`

- `brief`: Minimal description (1-2 sentences)
- `normal`: Standard description with key changes
- `detailed`: Comprehensive description with file-by-file breakdown

```bash
git-commit-agent --detail-level detailed
```

#### `--file-breakdown` / `--no-file-breakdown`
Include or exclude file-by-file breakdown in the commit body.

**Default:** `true`

```bash
git-commit-agent --no-file-breakdown
```

### Behavior Controls

#### `--auto-stage <mode>`
Control automatic staging behavior before commit.

**Choices:** `all`, `modified`, `none`  
**Default:** `all`

- `all`: Stage all changes including untracked files (`git add .`)
- `modified`: Stage only modified and deleted files (`git add -u`)
- `none`: Don't stage anything, commit only what's already staged

```bash
git-commit-agent --auto-stage modified
```

#### `--allow-push`
Allow pushing to remote repository after commit.

**Default:** `false`

```bash
git-commit-agent --allow-push
```

#### `--no-verify`
Skip commit verification hooks (pre-commit, commit-msg).

**Default:** `false`

```bash
git-commit-agent --no-verify
```

#### `--conventional-strict`
Enforce strict conventional commit format.

**Default:** `true`

```bash
git-commit-agent --conventional-strict
```

### Execution Options

#### `--dry-run`
Analyze changes and generate commit message without actually committing.

**Default:** `false`

```bash
git-commit-agent --dry-run
```

#### `--verbose`
Enable verbose logging to see detailed execution information.

**Default:** `false`

```bash
git-commit-agent --verbose
```

#### `--config <path>`
Path to custom configuration file (future feature).

```bash
git-commit-agent --config ./custom-config.json
```

## Environment Variables

You can set default values in your `.env` file:

```bash
# Commit Format
COMMIT_TYPE=feat
COMMIT_SCOPE=api
COMMIT_SUBJECT_MAX_LENGTH=72
COMMIT_DETAIL_LEVEL=normal
COMMIT_FILE_BREAKDOWN=true

# Behavior
AUTO_STAGE=all
ALLOW_PUSH=false
SKIP_VERIFICATION=false
CONVENTIONAL_STRICT=true

# Execution
DRY_RUN=false
VERBOSE=false

# OpenAI Configuration
OPENAI_API_KEY=your-api-key-here
OPENAI_MODEL=gpt-4
```

## Usage Examples

### Basic Usage

```bash
# Use all defaults
git-commit-agent

# Preview commit message without committing
git-commit-agent --dry-run

# Enable verbose output for debugging
git-commit-agent --verbose
```

### Commit Message Customization

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

### Staging Control

```bash
# Stage all files including untracked
git-commit-agent --auto-stage all

# Only commit already staged files
git-commit-agent --auto-stage none

# Stage all files including untracked (default)
git-commit-agent
```

### Advanced Workflows

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

### Team Workflows

```bash
# Consistent brief commits for the team
git-commit-agent --detail-level brief --subject-max-length 50

# Detailed commits for major features
git-commit-agent --detail-level detailed --commit-type feat

# Quick fixes without verification
git-commit-agent --commit-type fix --no-verify --detail-level brief
```

## Configuration Presets

### Preset 1: Quick Commits
For rapid development with minimal commit messages:

```bash
git-commit-agent --detail-level brief --no-file-breakdown
```

Or in `.env`:
```bash
COMMIT_DETAIL_LEVEL=brief
COMMIT_FILE_BREAKDOWN=false
AUTO_STAGE=all
```

### Preset 2: Detailed Documentation
For comprehensive commit history:

```bash
git-commit-agent --detail-level detailed --file-breakdown --subject-max-length 72
```

Or in `.env`:
```bash
COMMIT_DETAIL_LEVEL=detailed
COMMIT_FILE_BREAKDOWN=true
COMMIT_SUBJECT_MAX_LENGTH=72
```

### Preset 3: CI/CD Pipeline
For automated commits in CI/CD:

```bash
git-commit-agent --auto-stage all --no-verify --allow-push --detail-level normal
```

Or in `.env`:
```bash
AUTO_STAGE=all
SKIP_VERIFICATION=true
ALLOW_PUSH=true
COMMIT_DETAIL_LEVEL=normal
```

## Tips and Best Practices

1. **Use `.env` for team defaults**: Set common configuration in `.env` and commit it to your repository
2. **Override with CLI for special cases**: Use CLI arguments for one-off changes
3. **Dry run first**: Use `--dry-run` to preview the commit message before committing
4. **Verbose for debugging**: Enable `--verbose` when troubleshooting issues
5. **Consistent subject length**: Stick to 72 characters for better GitHub display
6. **Detail level by context**: Use `brief` for small changes, `detailed` for major features

## Troubleshooting

### Issue: Commit message too long
**Solution:** Reduce `--subject-max-length` or use `--detail-level brief`

### Issue: Wrong files staged
**Solution:** Use `--auto-stage none` and manually stage files first

### Issue: Pre-commit hooks failing
**Solution:** Use `--no-verify` to skip hooks (use cautiously)

### Issue: Need to see what's happening
**Solution:** Use `--verbose` and `--dry-run` together

## Getting Help

```bash
# Show all available options
git-commit-agent --help

# Show version
git-commit-agent --version
```

For more information, visit: https://github.com/blendsdk/git-commit-agent
