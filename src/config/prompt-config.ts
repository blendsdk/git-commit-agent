/**
 * @fileoverview Configuration interface and defaults for prompt parameterization. Defines all configurable aspects
 * of the git commit agent's behavior and output format.
 * 
 * @module config/prompt-config
 */

/**
 * Configuration interface for prompt generation and agent behavior. All parameters can be set via CLI arguments,
 * environment variables, or use the provided defaults.
 */
export interface PromptConfig {
  // ============================================================================
  // COMMIT MESSAGE FORMAT
  // ============================================================================
  
  /**
   * Force a specific commit type (feat, fix, refactor, docs, test, build, ci, perf, style, chore).
   * If not set, the agent will determine the type based on changes.
   */
  commitType?: string;
  
  /**
   * Set the commit scope (e.g., "auth", "api", "ui").
   * If not set, the agent will determine the scope based on changes.
   */
  scope?: string;
  
  /**
   * Maximum length for the commit subject line.
   * @default 72 (standard git convention)
   */
  subjectMaxLength: number;
  
  /**
   * Level of detail in the commit message body.
   * - brief: Minimal description
   * - normal: Standard description with key changes
   * - detailed: Comprehensive description with file-by-file breakdown
   * @default 'normal'
   */
  detailLevel: 'brief' | 'normal' | 'detailed';
  
  /**
   * Whether to include a file-by-file breakdown in the commit body.
   * @default true
   */
  includeFileBreakdown: boolean;
  
  // ============================================================================
  // BEHAVIOR CONTROLS
  // ============================================================================
  
  /**
   * Automatic staging behavior before commit.
   * - all: Stage all changes including untracked files (git add .)
   * - modified: Stage only modified and deleted files (git add -u)
   * - none: Don't stage anything, commit only what's already staged
   * @default 'modified'
   */
  autoStage: 'all' | 'modified' | 'none';
  
  /**
   * Whether to allow pushing after commit.
   * @default false
   */
  allowPush: boolean;
  
  /**
   * Skip commit verification hooks.
   * @default false
   */
  skipVerification: boolean;
  
  /**
   * Enforce strict conventional commit format.
   * @default true
   */
  conventionalStrict: boolean;
  
  // ============================================================================
  // EXECUTION
  // ============================================================================
  
  /**
   * Dry run mode - analyze and generate commit message without actually committing.
   * @default false
   */
  dryRun: boolean;
  
  /**
   * Enable verbose logging output.
   * @default false
   */
  verbose: boolean;
}

/**
 * Default configuration values. These are used when no CLI arguments or environment variables are provided.
 */
export const DEFAULT_CONFIG: PromptConfig = {
  // Commit Format
  subjectMaxLength: 72,          // Standard git convention (GitHub truncates at 72)
  detailLevel: 'normal',         // Balance between brief and overly detailed
  includeFileBreakdown: true,    // Valuable for understanding changes
  
  // Behavior
  autoStage: 'all',              // Stage all changes including untracked files
  allowPush: false,              // Keep safe default
  skipVerification: false,       // Keep safe default
  conventionalStrict: true,      // Enforce good practices
  
  // Execution
  dryRun: false,
  verbose: false
};

/**
 * Valid commit types for conventional commits.
 */
export const VALID_COMMIT_TYPES = [
  'feat',      // New feature
  'fix',       // Bug fix
  'refactor',  // Code refactoring
  'docs',      // Documentation changes
  'test',      // Test changes
  'build',     // Build system changes
  'ci',        // CI configuration changes
  'perf',      // Performance improvements
  'style',     // Code style changes (formatting, etc.)
  'chore'      // Other changes that don't modify src or test files
] as const;

/**
 * Type guard to check if a string is a valid commit type.
 */
export function isValidCommitType(type: string): type is typeof VALID_COMMIT_TYPES[number] {
  return VALID_COMMIT_TYPES.includes(type as any);
}
