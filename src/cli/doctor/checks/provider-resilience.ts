import type { CheckResult, CheckDefinition } from "../types"
import { execSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { parseJsonc } from "../../../shared"

interface OpenCodeConfig {
  plugin?: string[]
  model?: string
  agent?: Record<string, { model?: string }>
}

interface OmoConfig {
  agents?: Record<string, { model?: string }>
}

function getConfigPath(): string {
  return join(homedir(), ".config", "opencode", "opencode.json")
}

function getOmoConfigPath(): string {
  return join(homedir(), ".config", "opencode", "oh-my-opencode.json")
}

function detectAuthenticatedProviders(): {
  anthropic: boolean
  openai: boolean
  google: boolean
} {
  const result = { anthropic: false, openai: false, google: false }

  try {
    const output = execSync("opencode auth list", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 5000,
    })

    result.anthropic = output.toLowerCase().includes("anthropic")
    result.openai = output.toLowerCase().includes("openai")
    result.google = output.toLowerCase().includes("google")
  } catch {
    /* intentionally empty */
  }

  return result
}

function detectConfiguredModels(): {
  usesAnthropic: boolean
  usesOpenAI: boolean
  usesGoogle: boolean
  usesFree: boolean
} {
  const result = {
    usesAnthropic: false,
    usesOpenAI: false,
    usesGoogle: false,
    usesFree: false,
  }

  try {
    const configPath = getConfigPath()
    if (!existsSync(configPath)) return result

    const content = readFileSync(configPath, "utf-8")
    const config = parseJsonc<OpenCodeConfig>(content)

    const defaultModel = config?.model ?? "anthropic/claude-opus-4-5"
    const checkModel = (model: string | undefined) => {
      if (!model) return
      if (model.startsWith("anthropic/")) result.usesAnthropic = true
      if (model.startsWith("openai/")) result.usesOpenAI = true
      if (model.startsWith("google/")) result.usesGoogle = true
      if (model.startsWith("opencode/")) result.usesFree = true
    }

    checkModel(defaultModel)

    const omoConfigPath = getOmoConfigPath()
    if (existsSync(omoConfigPath)) {
      const omoContent = readFileSync(omoConfigPath, "utf-8")
      const omoConfig = parseJsonc<OmoConfig>(omoContent)

      if (omoConfig?.agents) {
        for (const agent of Object.values(omoConfig.agents)) {
          const agentModel = agent as { model?: string } | undefined
          checkModel(agentModel?.model)
        }
      }
    }

    if (config?.agent) {
      for (const agent of Object.values(config.agent)) {
        const agentModel = agent as { model?: string } | undefined
        checkModel(agentModel?.model)
      }
    }
  } catch {
    /* intentionally empty */
  }

  return result
}

export async function checkProviderResilience(): Promise<CheckResult> {
  const authenticated = detectAuthenticatedProviders()
  const configured = detectConfiguredModels()

  const authenticatedCount =
    (authenticated.anthropic ? 1 : 0) +
    (authenticated.openai ? 1 : 0) +
    (authenticated.google ? 1 : 0)

  const configuredProviders = [
    configured.usesAnthropic && "Claude",
    configured.usesOpenAI && "ChatGPT",
    configured.usesGoogle && "Gemini",
    configured.usesFree && "Free models",
  ].filter(Boolean)

  if (authenticatedCount === 0 && !configured.usesFree) {
    return {
      name: "Provider Resilience",
      status: "fail",
      message: `No providers authenticated. Your agents won't work.\n       Run: opencode auth login`,
    }
  }

  if (
    configured.usesAnthropic &&
    !authenticated.anthropic &&
    authenticatedCount === 0
  ) {
    return {
      name: "Provider Resilience",
      status: "fail",
      message: `Configuration requires Claude but it's not authenticated.\n       Run: opencode auth login (select Anthropic)`,
    }
  }

  if (
    configured.usesOpenAI &&
    !authenticated.openai &&
    authenticatedCount === 0
  ) {
    return {
      name: "Provider Resilience",
      status: "fail",
      message: `Configuration requires ChatGPT but it's not authenticated.\n       Run: opencode auth login (select OpenAI)`,
    }
  }

  if (
    configured.usesGoogle &&
    !authenticated.google &&
    authenticatedCount === 0
  ) {
    return {
      name: "Provider Resilience",
      status: "fail",
      message: `Configuration requires Gemini but it's not authenticated.\n       Run: opencode auth login (select Google)`,
    }
  }

  if (authenticatedCount === 1) {
    const singleProvider = authenticated.anthropic
      ? "Claude"
      : authenticated.openai
        ? "ChatGPT"
        : "Gemini"

    return {
      name: "Provider Resilience",
      status: "warn",
      message: `Single point of failure: Only ${singleProvider} authenticated.\n       Recommended: Configure multiple providers for resilience.\n       See: docs/resilience-guide.md`,
    }
  }

  const providerList = configuredProviders.join(", ")
  return {
    name: "Provider Resilience",
    status: "pass",
    message: `Multi-provider setup detected: ${providerList}`,
  }
}

export function getProviderResilienceCheckDefinition(): CheckDefinition {
  return {
    id: "provider-resilience",
    name: "Provider Resilience",
    category: "configuration",
    check: checkProviderResilience,
    critical: false,
  }
}
