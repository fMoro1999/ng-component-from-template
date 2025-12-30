import fs from 'fs';
import path from 'path';
import { Project, SourceFile } from 'ts-morph';

/**
 * Cached project entry with metadata
 */
interface CachedProject {
  project: Project;
  workspaceRoot: string;
  tsConfigPath: string | undefined;
  lastAccessed: number;
  sourceFilePaths: Set<string>;
}

/**
 * Project cache configuration
 */
interface ProjectCacheConfig {
  /** Maximum number of cached projects (default: 5) */
  maxCachedProjects: number;
  /** Maximum source files per project before cleanup (default: 100) */
  maxSourceFilesPerProject: number;
  /** Cache TTL in milliseconds (default: 5 minutes) */
  cacheTtlMs: number;
}

const DEFAULT_CONFIG: ProjectCacheConfig = {
  maxCachedProjects: 5,
  maxSourceFilesPerProject: 100,
  cacheTtlMs: 5 * 60 * 1000, // 5 minutes
};

/**
 * Singleton project cache for efficient reuse of ts-morph Project instances.
 *
 * Benefits:
 * - Reuses Project instances across multiple type inference calls
 * - Reduces memory overhead by limiting cached projects
 * - Automatically cleans up stale source files
 * - Thread-safe for VS Code extension usage
 */
export class ProjectCache {
  private static instance: ProjectCache | null = null;
  private cache: Map<string, CachedProject> = new Map();
  private config: ProjectCacheConfig;

  private constructor(config: Partial<ProjectCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<ProjectCacheConfig>): ProjectCache {
    if (!ProjectCache.instance) {
      ProjectCache.instance = new ProjectCache(config);
    }
    return ProjectCache.instance;
  }

  /**
   * Reset singleton (mainly for testing)
   */
  static resetInstance(): void {
    if (ProjectCache.instance) {
      ProjectCache.instance.clearAll();
      ProjectCache.instance = null;
    }
  }

  /**
   * Get or create a Project for the given file path.
   * Uses workspace root as cache key.
   */
  getOrCreateProject(filePath: string): Project {
    const workspaceRoot = this.findWorkspaceRoot(filePath);
    const cacheKey = workspaceRoot;

    // Check if we have a cached project
    const cached = this.cache.get(cacheKey);
    if (cached) {
      cached.lastAccessed = Date.now();
      return cached.project;
    }

    // Clean up old entries if we're at capacity
    this.cleanupIfNeeded();

    // Create new project
    const tsConfigPath = this.findTsConfigPath(workspaceRoot);
    const project = new Project({
      tsConfigFilePath: tsConfigPath,
      skipAddingFilesFromTsConfig: true,
    });

    // Cache the project
    this.cache.set(cacheKey, {
      project,
      workspaceRoot,
      tsConfigPath,
      lastAccessed: Date.now(),
      sourceFilePaths: new Set(),
    });

    return project;
  }

  /**
   * Get a source file from the project, adding it if necessary.
   * Tracks added source files for potential cleanup.
   */
  getOrAddSourceFile(filePath: string): SourceFile | undefined {
    const project = this.getOrCreateProject(filePath);
    const workspaceRoot = this.findWorkspaceRoot(filePath);
    const cached = this.cache.get(workspaceRoot);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return undefined;
    }

    // Try to get existing source file first
    let sourceFile = project.getSourceFile(filePath);

    if (!sourceFile) {
      // Add source file to project
      sourceFile = project.addSourceFileAtPath(filePath);

      // Track the added file
      if (cached) {
        cached.sourceFilePaths.add(filePath);

        // Cleanup old source files if we have too many
        if (cached.sourceFilePaths.size > this.config.maxSourceFilesPerProject) {
          this.cleanupSourceFiles(cached);
        }
      }
    }

    return sourceFile;
  }

  /**
   * Clean up old/stale cached projects
   */
  private cleanupIfNeeded(): void {
    const now = Date.now();

    // Remove expired entries
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.lastAccessed > this.config.cacheTtlMs) {
        this.cache.delete(key);
      }
    }

    // If still over capacity, remove oldest entries
    while (this.cache.size >= this.config.maxCachedProjects) {
      let oldestKey: string | null = null;
      let oldestTime = Infinity;

      for (const [key, entry] of this.cache.entries()) {
        if (entry.lastAccessed < oldestTime) {
          oldestTime = entry.lastAccessed;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
      } else {
        break;
      }
    }
  }

  /**
   * Clean up old source files from a project to reduce memory usage
   */
  private cleanupSourceFiles(cached: CachedProject): void {
    const filesToRemove = Math.floor(cached.sourceFilePaths.size / 2);
    const paths = Array.from(cached.sourceFilePaths);

    // Remove the first half (oldest added files)
    for (let i = 0; i < filesToRemove; i++) {
      const filePath = paths[i];
      try {
        const sourceFile = cached.project.getSourceFile(filePath);
        if (sourceFile) {
          cached.project.removeSourceFile(sourceFile);
        }
        cached.sourceFilePaths.delete(filePath);
      } catch {
        // Ignore errors during cleanup
        cached.sourceFilePaths.delete(filePath);
      }
    }
  }

  /**
   * Clear all cached projects
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for a specific workspace
   */
  clearWorkspace(workspaceRoot: string): void {
    this.cache.delete(workspaceRoot);
  }

  /**
   * Find workspace root directory
   */
  private findWorkspaceRoot(filePath: string): string {
    let currentDir = path.dirname(filePath);

    // Look for package.json
    while (currentDir !== '/' && currentDir !== path.dirname(currentDir)) {
      if (fs.existsSync(path.join(currentDir, 'package.json'))) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }

    return path.dirname(filePath);
  }

  /**
   * Find tsconfig.json in workspace
   */
  private findTsConfigPath(workspaceRoot: string): string | undefined {
    const possiblePaths = [
      path.join(workspaceRoot, 'tsconfig.json'),
      path.join(workspaceRoot, 'tsconfig.app.json'),
      path.join(workspaceRoot, 'src', 'tsconfig.json'),
    ];

    for (const tsConfigPath of possiblePaths) {
      if (fs.existsSync(tsConfigPath)) {
        return tsConfigPath;
      }
    }

    return undefined;
  }

  /**
   * Get cache statistics (useful for debugging/monitoring)
   */
  getStats(): { cachedProjects: number; totalSourceFiles: number } {
    let totalSourceFiles = 0;
    for (const entry of this.cache.values()) {
      totalSourceFiles += entry.sourceFilePaths.size;
    }
    return {
      cachedProjects: this.cache.size,
      totalSourceFiles,
    };
  }
}

/**
 * Convenience function to get the singleton ProjectCache instance
 */
export function getProjectCache(): ProjectCache {
  return ProjectCache.getInstance();
}
