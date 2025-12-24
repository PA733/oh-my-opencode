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
