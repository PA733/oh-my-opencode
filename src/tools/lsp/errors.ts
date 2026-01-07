/**
 * LSP Error Types
 * 
 * Custom error classes for LSP-related failures that allow graceful handling
 * without crashing the entire process.
 */

/**
 * Error thrown when an LSP server binary is not found or cannot be executed.
 * This is a recoverable error - the session should continue without that LSP server.
 */
export class LSPServerUnavailableError extends Error {
  readonly code: string
  readonly serverId: string
  readonly command: string[]
  readonly isRecoverable = true

  constructor(serverId: string, command: string[], originalError: Error) {
    const cmd = command.join(" ")
    const errCode = (originalError as NodeJS.ErrnoException).code || "UNKNOWN"
    
    let message: string
    if (errCode === "ENOENT") {
      message = `LSP server "${serverId}" not available: binary not found (${cmd})`
    } else if (errCode === "EACCES") {
      message = `LSP server "${serverId}" not available: permission denied (${cmd})`
    } else if (errCode === "ENOEXEC") {
      message = `LSP server "${serverId}" not available: not executable (${cmd})`
    } else {
      message = `LSP server "${serverId}" failed to start: ${originalError.message}`
    }

    super(message)
    this.name = "LSPServerUnavailableError"
    this.code = errCode
    this.serverId = serverId
    this.command = command
    
    // Preserve original stack if available
    if (originalError.stack) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`
    }
  }
}

/**
 * Error thrown when an LSP server exits unexpectedly.
 */
export class LSPServerExitedError extends Error {
  readonly serverId: string
  readonly exitCode: number | null
  readonly stderr: string
  readonly isRecoverable = true

  constructor(serverId: string, exitCode: number | null, stderr: string) {
    super(`LSP server "${serverId}" exited unexpectedly with code ${exitCode}${stderr ? `\nstderr: ${stderr}` : ""}`)
    this.name = "LSPServerExitedError"
    this.serverId = serverId
    this.exitCode = exitCode
    this.stderr = stderr
  }
}

/**
 * Check if an error is a spawn-related error that indicates missing binary
 */
export function isSpawnError(error: unknown): error is NodeJS.ErrnoException {
  if (!(error instanceof Error)) return false
  const err = error as NodeJS.ErrnoException
  return err.code === "ENOENT" || err.code === "EACCES" || err.code === "ENOEXEC"
}
