import { describe, expect, test } from "bun:test"
import { pathToFileURL } from "node:url"

describe("pathToFileURL cross-platform compatibility", () => {
  test("converts absolute path to file URI with proper format", () => {
    //#given
    const absPath = process.platform === "win32" 
      ? "C:\\Users\\user\\project\\file.ts"
      : "/home/user/project/file.ts"

    //#when
    const uri = pathToFileURL(absPath).href

    //#then
    expect(uri).toMatch(/^file:\/\/\//)
    expect(uri).toContain("file.ts")
    if (process.platform === "win32") {
      expect(uri).toMatch(/^file:\/\/\/[A-Z]:\//)
      expect(uri).not.toContain("\\")
    }
  })

  test("handles paths with spaces", () => {
    //#given
    const pathWithSpaces = process.platform === "win32"
      ? "C:\\Users\\my project\\file.ts"
      : "/home/user/my project/file.ts"

    //#when
    const uri = pathToFileURL(pathWithSpaces).href

    //#then
    expect(uri).toContain("my%20project")
  })

  test("handles paths with special characters", () => {
    //#given
    const pathWithSpecial = process.platform === "win32"
      ? "C:\\Users\\file (1).ts"
      : "/home/user/project/file (1).ts"

    //#when
    const uri = pathToFileURL(pathWithSpecial).href

    //#then
    expect(uri).toContain("file%20(1).ts")
  })

  test("pathToFileURL produces valid URIs without backslashes", () => {
    //#given
    const testPath = process.platform === "win32"
      ? "C:\\test\\path.ts"
      : "/test/path.ts"

    //#when
    const uri = pathToFileURL(testPath).href

    //#then
    expect(uri).not.toContain("\\")
    expect(uri).toMatch(/^file:\/\/\//)
  })
})

describe("findWorkspaceRoot cross-platform", () => {
  test("loop condition works on Unix (reaches root)", () => {
    //#given
    let dir = "/home/user/deep/nested/path"
    let prevDir = ""
    let iterations = 0
    const maxIterations = 100

    //#when
    while (dir !== prevDir && iterations < maxIterations) {
      prevDir = dir
      dir = require("path").dirname(dir)
      iterations++
    }

    //#then
    expect(dir).toBe("/")
    expect(prevDir).toBe("/")
    expect(iterations).toBeLessThan(maxIterations)
  })

  test("loop condition works on Windows (reaches root)", () => {
    //#given
    let dir = "C:\\Users\\user\\deep\\nested\\path"
    let prevDir = ""
    let iterations = 0
    const maxIterations = 100

    //#when
    while (dir !== prevDir && iterations < maxIterations) {
      prevDir = dir
      dir = require("path").win32.dirname(dir)
      iterations++
    }

    //#then
    expect(dir).toBe("C:\\")
    expect(prevDir).toBe("C:\\")
    expect(iterations).toBeLessThan(maxIterations)
  })

  test("old Unix-only condition would fail on Windows", () => {
    //#given
    let dir = "C:\\Users\\user\\path"
    let iterations = 0
    const maxIterations = 10

    //#when
    // Old condition: while (dir !== "/")
    while (dir !== "/" && iterations < maxIterations) {
      dir = require("path").win32.dirname(dir)
      iterations++
    }

    //#then
    // Would hit max iterations because Windows root is never "/"
    expect(iterations).toBe(maxIterations)
    expect(dir).not.toBe("/")
  })

  test("new cross-platform condition handles both Unix and Windows", () => {
    //#given
    const testPaths = [
      "/home/user/project",
      "C:\\Users\\user\\project",
      "/",
      "C:\\",
    ]

    //#when
    //#then
    for (const startPath of testPaths) {
      let dir = startPath
      let prevDir = ""
      let iterations = 0
      const maxIterations = 100
      const isWindows = startPath.includes("\\")

      while (dir !== prevDir && iterations < maxIterations) {
        prevDir = dir
        dir = isWindows ? require("path").win32.dirname(dir) : require("path").posix.dirname(dir)
        iterations++
      }

      expect(iterations).toBeLessThan(maxIterations)
      expect(dir).toBe(prevDir)
    }
  })
})
