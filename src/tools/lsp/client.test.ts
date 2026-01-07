import { describe, expect, it } from "bun:test"
import { LSPServerUnavailableError, LSPServerExitedError } from "./errors"

describe("LSP Client Error Handling", () => {
  describe("LSPServerUnavailableError", () => {
    it("should create error with ENOENT code and binary not found message", () => {
      const originalError = Object.assign(new Error("spawn ENOENT"), { code: "ENOENT" })
      const error = new LSPServerUnavailableError(
        "typescript-language-server",
        ["typescript-language-server", "--stdio"],
        originalError
      )

      expect(error.name).toBe("LSPServerUnavailableError")
      expect(error.code).toBe("ENOENT")
      expect(error.serverId).toBe("typescript-language-server")
      expect(error.isRecoverable).toBe(true)
      expect(error.message).toContain("binary not found")
    })

    it("should create error with EACCES code and permission denied message", () => {
      const originalError = Object.assign(new Error("spawn EACCES"), { code: "EACCES" })
      const error = new LSPServerUnavailableError(
        "pylsp",
        ["pylsp"],
        originalError
      )

      expect(error.code).toBe("EACCES")
      expect(error.message).toContain("permission denied")
      expect(error.isRecoverable).toBe(true)
    })

    it("should create error with ENOEXEC code and not executable message", () => {
      const originalError = Object.assign(new Error("spawn ENOEXEC"), { code: "ENOEXEC" })
      const error = new LSPServerUnavailableError(
        "rust-analyzer",
        ["rust-analyzer"],
        originalError
      )

      expect(error.code).toBe("ENOEXEC")
      expect(error.message).toContain("not executable")
      expect(error.isRecoverable).toBe(true)
    })

    it("should handle unknown error codes with generic failed to start message", () => {
      const originalError = new Error("Unknown spawn error")
      const error = new LSPServerUnavailableError(
        "gopls",
        ["gopls"],
        originalError
      )

      expect(error.code).toBe("UNKNOWN")
      expect(error.message).toContain("failed to start")
      expect(error.isRecoverable).toBe(true)
    })

    it("should preserve original error stack with Caused by prefix", () => {
      const originalError = new Error("Test error")
      const error = new LSPServerUnavailableError(
        "test-server",
        ["test"],
        originalError
      )

      expect(error.stack).toContain("Caused by:")
      expect(error.stack).toContain(originalError.stack!)
    })
  })

  describe("LSPServerExitedError", () => {
    it("should create error with exit code and stderr in message", () => {
      const error = new LSPServerExitedError(
        "typescript-language-server",
        1,
        "Error: Cannot find module"
      )

      expect(error.name).toBe("LSPServerExitedError")
      expect(error.serverId).toBe("typescript-language-server")
      expect(error.exitCode).toBe(1)
      expect(error.stderr).toBe("Error: Cannot find module")
      expect(error.isRecoverable).toBe(true)
      expect(error.message).toContain("exited unexpectedly with code 1")
      expect(error.message).toContain("Error: Cannot find module")
    })

    it("should handle null exit code", () => {
      const error = new LSPServerExitedError(
        "pylsp",
        null,
        ""
      )

      expect(error.exitCode).toBe(null)
      expect(error.message).toContain("exited unexpectedly with code null")
    })

    it("should exclude stderr section when stderr is empty", () => {
      const error = new LSPServerExitedError(
        "rust-analyzer",
        127,
        ""
      )

      expect(error.stderr).toBe("")
      expect(error.message).not.toContain("stderr:")
    })
  })
})
