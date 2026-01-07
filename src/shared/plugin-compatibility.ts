import * as fs from "fs";
import * as path from "path";
import { log } from "./logger";
import { getUserConfigDir } from "./config-path";
import { parseJsonc } from "./jsonc-parser";
import type { HookName } from "../config";

interface OpenCodeConfig {
  plugin?: string[];
  [key: string]: unknown;
}

/**
 * Plugins that conflict with oh-my-opencode's built-in features
 */
const CONFLICTING_PLUGINS = {
  // DCP (Dynamic Context Pruning) plugins
  dcp: [
    "opencode-dcp",
    "@opencode/dcp",
    "opencode-dynamic-context-pruning",
  ],
  // ELF (External Language Framework / Context management) plugins
  elf: ["opencode-elf", "@opencode/elf", "opencode-context"],
  // Compaction plugins
  compaction: [
    "opencode-compaction",
    "@opencode/compaction",
    "opencode-auto-compact",
  ],
} as const;

/**
 * Hooks that should be auto-disabled when conflicting plugins are detected
 */
const HOOKS_TO_DISABLE_ON_CONFLICT: Record<string, HookName[]> = {
  dcp: [
    "anthropic-context-window-limit-recovery",
    "preemptive-compaction",
    "compaction-context-injector",
  ],
  elf: [
    "context-window-monitor",
    "directory-agents-injector",
    "directory-readme-injector",
  ],
  compaction: [
    "preemptive-compaction",
    "anthropic-context-window-limit-recovery",
    "compaction-context-injector",
  ],
};

/**
 * Loads the main OpenCode config to detect installed plugins
 */
function loadOpencodeConfig(directory: string): OpenCodeConfig {
  const projectConfigPaths = [
    path.join(directory, "opencode.json"),
    path.join(directory, "opencode.jsonc"),
  ];
  
  const userConfigPaths = [
    path.join(getUserConfigDir(), "opencode", "opencode.json"),
    path.join(getUserConfigDir(), "opencode", "opencode.jsonc"),
  ];

  const paths = [...projectConfigPaths, ...userConfigPaths];

  for (const configPath of paths) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, "utf-8");
        const config = parseJsonc<OpenCodeConfig>(content);
        if (config.plugin && Array.isArray(config.plugin)) {
          log(`Loaded OpenCode config from ${configPath}`, {
            pluginCount: config.plugin.length,
          });
          return config;
        }
      }
    } catch (err) {
      log(`Error loading OpenCode config from ${configPath}:`, err);
    }
  }

  return {};
}

/**
 * Detects if any conflicting plugins are installed
 */
export function detectConflictingPlugins(
  directory: string
): {
  hasConflicts: boolean;
  conflicts: string[];
  hooksToDisable: HookName[];
} {
  const config = loadOpencodeConfig(directory);
  const installedPlugins = config.plugin ?? [];

  const conflicts: string[] = [];
  const hooksToDisable = new Set<HookName>();

  for (const [type, pluginNames] of Object.entries(CONFLICTING_PLUGINS)) {
    for (const pluginName of pluginNames) {
      const hasPlugin = installedPlugins.some(
        (p) =>
          p === pluginName || p.startsWith(`${pluginName}@`) || p.includes(pluginName)
      );

      if (hasPlugin) {
        conflicts.push(pluginName);
        const hooksForType = HOOKS_TO_DISABLE_ON_CONFLICT[type] ?? [];
        hooksForType.forEach((hook) => hooksToDisable.add(hook));
        log(`Detected conflicting plugin: ${pluginName} (type: ${type})`);
      }
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    hooksToDisable: Array.from(hooksToDisable),
  };
}

/**
 * Logs warning messages about plugin conflicts
 */
export function warnAboutConflicts(conflicts: string[], hooksToDisable: HookName[]): void {
  if (conflicts.length === 0) return;

  console.warn("\n⚠️  oh-my-opencode: Plugin Conflict Detection");
  console.warn("═".repeat(60));
  console.warn(
    `\nDetected ${conflicts.length} plugin(s) that may conflict with oh-my-opencode:`
  );
  conflicts.forEach((plugin) => console.warn(`  • ${plugin}`));

  console.warn(
    `\nAuto-disabling ${hooksToDisable.length} oh-my-opencode hook(s) to prevent conflicts:`
  );
  hooksToDisable.forEach((hook) => console.warn(`  • ${hook}`));

  console.warn("\nTo manually control this behavior, add to your config:");
  console.warn('  ~/.config/opencode/oh-my-opencode.json');
  console.warn('  or');  
  console.warn('  .opencode/oh-my-opencode.json');
  console.warn('\n  {');
  console.warn('    "disabled_hooks": [');
  hooksToDisable.forEach((hook, i) => {
    const comma = i < hooksToDisable.length - 1 ? "," : "";
    console.warn(`      "${hook}"${comma}`);
  });
  console.warn('    ]');
  console.warn('  }');
  console.warn("\n" + "═".repeat(60) + "\n");
}
