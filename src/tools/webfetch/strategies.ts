import { JSDOM } from "jsdom"
import { Readability } from "@mozilla/readability"
import TurndownService from "turndown"

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
})

export function applyReadability(html: string, url: string): string {
  const dom = new JSDOM(html, { url })
  const reader = new Readability(dom.window.document.cloneNode(true) as Document)
  const article = reader.parse()

  if (!article?.content) {
    return turndown.turndown(html)
  }

  return turndown.turndown(article.content)
}

export function applyRaw(content: string): string {
  return content
}

function truncateAroundMatch(line: string, pattern: RegExp, contextLength: number = 200): string {
  // CRITICAL: Create fresh regex without 'g' flag - RegExp.exec with 'g' flag maintains lastIndex state
  const freshPattern = new RegExp(pattern.source, pattern.flags.replace("g", ""))
  const match = freshPattern.exec(line)

  if (!match) return line.length > contextLength * 2 ? line.slice(0, contextLength * 2) + "..." : line

  const matchStart = match.index
  const matchEnd = matchStart + match[0].length

  const start = Math.max(0, matchStart - contextLength)
  const end = Math.min(line.length, matchEnd + contextLength)

  let result = line.slice(start, end)
  if (start > 0) result = "..." + result
  if (end < line.length) result = result + "..."

  return result
}

export interface GrepOptions {
  limit?: number
  offset?: number
  before?: number
  after?: number
}

export function applyGrep(content: string, pattern: string, options: GrepOptions = {}): string {
  const { limit = 100, offset = 0, before = 0, after = 0 } = options

  let regex: RegExp
  try {
    regex = new RegExp(pattern, "gi")
  } catch {
    return `Error: Invalid regex pattern: ${pattern}`
  }

  const lines = content.split("\n")
  const matchingIndices = new Set<number>()

  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      matchingIndices.add(i)
    }
    regex.lastIndex = 0
  }

  if (matchingIndices.size === 0) {
    return `No matches found for pattern: ${pattern}`
  }

  const contextIndices = new Set<number>()
  for (const idx of matchingIndices) {
    for (let i = Math.max(0, idx - before); i <= Math.min(lines.length - 1, idx + after); i++) {
      contextIndices.add(i)
    }
  }

  const sortedIndices = Array.from(contextIndices).sort((a, b) => a - b)
  const paginatedIndices = sortedIndices.slice(offset, offset + limit)

  const resultLines: string[] = []
  let prevIdx = -2

  for (const idx of paginatedIndices) {
    if (prevIdx !== -2 && idx > prevIdx + 1) {
      resultLines.push("--")
    }
    prevIdx = idx

    const line = lines[idx]
    const isMatch = matchingIndices.has(idx)
    const lineNum = String(idx + 1).padStart(4)

    if (isMatch) {
      const truncatedLine = truncateAroundMatch(line, regex, 200)
      resultLines.push(`${lineNum}:${truncatedLine}`)
    } else {
      const truncatedLine = line.length > 450 ? line.slice(0, 450) + "..." : line
      resultLines.push(`${lineNum}-${truncatedLine}`)
    }
  }

  const totalMatches = matchingIndices.size
  const totalWithContext = sortedIndices.length
  const showing = paginatedIndices.length

  const header = [
    `Pattern: ${pattern}`,
    `Matches: ${totalMatches} lines`,
    before > 0 || after > 0 ? `Context: ${before} before, ${after} after (${totalWithContext} total lines)` : "",
    showing < totalWithContext ? `Showing: ${offset + 1}-${offset + showing} of ${totalWithContext}` : "",
    "---",
  ]
    .filter(Boolean)
    .join("\n")

  return `${header}\n${resultLines.join("\n")}`
}
