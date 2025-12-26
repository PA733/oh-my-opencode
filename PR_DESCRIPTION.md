# Complete Extended Thinking Fix: Proactive Prevention + Enhanced Recovery

## Summary

This PR implements a **two-layer solution** to completely solve the "Expected thinking/redacted_thinking but found tool_use" error:

1. **PROACTIVE**: New `thinking-block-validator` hook prevents the error from occurring
2. **REACTIVE**: Enhanced session-recovery to include thinking from previous turns when recovery is needed

This addresses gaps where neither Vercel AI SDK (issue #7729) nor OpenCode core implement proper thinking block handling.

## Problem

When using Claude Opus 4.5 with extended thinking enabled, the Anthropic API requires that assistant messages containing tool_use blocks must start with a thinking block. Without this:

**Error:**
```
messages.X.content.0.type: Expected `thinking` or `redacted_thinking`, but found `tool_use`
```

**Current State:**
- ❌ Vercel AI SDK: No fix (PR #7750 rejected, issue #7729 still open)
- ❌ OpenCode core: No proactive validation (only reactive recovery)
- ✅ oh-my-opencode: Had reactive recovery with empty thinking blocks

## Solution: Two-Layer Defense

### **Layer 1: Proactive Prevention (NEW)** 🛡️

**New Hook**: `thinking-block-validator`
- Runs on `experimental.chat.messages.transform` BEFORE API call
- Validates message structure proactively
- Adds thinking blocks to prevent errors from occurring
- User never sees the error

**How it works:**
```typescript
// Before API call:
if (hasToolUse && !startsWithThinking) {
  prependThinkingBlock(previousThinkingContent)
}
```

### **Layer 2: Enhanced Recovery (IMPROVED)** 🔧

**Enhanced**: `session-recovery` hook
- Runs AFTER API error (fallback if Layer 1 fails)
- Now includes actual thinking content from previous turns
- Falls back to meaningful placeholder

**Changes:**
1. **Adds `findLastThinkingContent()` function** - Searches conversation history for previous thinking
2. **Reuses previous thinking content** - Includes actual reasoning instead of empty string
3. **Graceful fallback** - Uses `"[Continuing from previous reasoning]"` if no previous thinking
4. **Follows Anthropic's recommendation** - Per [extended thinking docs](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking)

## Technical Details

**Before:**
```typescript
const part = {
  type: "thinking",
  thinking: "",  // Empty thinking block
  synthetic: true,
}
```

**After:**
```typescript
const previousThinking = findLastThinkingContent(sessionID, messageID)
const part = {
  type: "thinking",
  thinking: previousThinking || "[Continuing from previous reasoning]",
  synthetic: true,
}
```

## Benefits

- ✅ Maintains reasoning continuity across session recovery
- ✅ Provides better context for Claude's tool usage decisions
- ✅ Follows Anthropic's official best practices
- ✅ Backwards compatible - still satisfies API requirements
- ✅ No breaking changes to existing functionality

## Testing

- [x] Build passes without errors
- [x] Handles edge cases (no previous messages, empty thinking content)
- [x] Successfully recovers from "Expected thinking/redacted_thinking but found tool_use" errors
- [x] Verified with `claude-opus-4-5-thinking` model

## Files Changed

**New Files:**
- `src/hooks/thinking-block-validator/index.ts` - Proactive thinking block validation hook

**Modified Files:**
- `src/hooks/session-recovery/storage.ts` - Enhanced reactive recovery with previous thinking content
- `src/hooks/index.ts` - Export new hook
- `src/index.ts` - Register and instantiate new hook
- `src/config/schema.ts` - Add hook to configuration schema
- `assets/oh-my-opencode.schema.json` - Generated schema update

## Why This Matters

Neither Vercel AI SDK nor OpenCode core implement this fix:
- **Vercel AI SDK**: PR #7750 was rejected, issue #7729 remains open
- **OpenCode core**: Delegates to plugins for provider-specific handling
- **oh-my-opencode**: Now the ONLY solution that prevents this error proactively

## Related Issues

- Fixes extended thinking errors with Claude Opus/Sonnet 4.5 using tool calls
- Related to Vercel AI issue: https://github.com/vercel/ai/issues/7729
- Related to OpenCode issue: https://github.com/sst/opencode/issues/2599
