# Making Sisyphus Resilient: Multi-Provider Strategy Guide

## The Problem

When a single provider (like Claude) experiences authentication issues, agents that depend on that provider become unavailable. This guide shows you how to configure Oh My OpenCode with multiple providers for maximum resilience.

## Quick Fix: Use Multiple Providers

The best defense against provider outages is **provider diversity**. Configure multiple authentication methods:

### Recommended Setup (Tier 1: Maximum Resilience)

```bash
# Install with all three providers
bunx oh-my-opencode install --claude=yes --chatgpt=yes --gemini=yes
```

Then authenticate all three:
1. **Claude** (anthropic/claude-opus-4-5) - Best for primary orchestration
2. **ChatGPT** (openai/gpt-5.2) - Excellent reasoning, Oracle backup
3. **Gemini** (google/gemini-3-pro-high) - Great for UI/creative work, cheap at scale

With this setup, when Claude goes down, Sisyphus automatically falls back to GPT-5.2 or Gemini.

### Budget Setup (Tier 2: Good Resilience)

Pick any TWO providers:

```bash
# Option A: Claude + ChatGPT (best reasoning combination)
bunx oh-my-opencode install --claude=yes --chatgpt=yes --gemini=no

# Option B: Claude + Gemini (best cost/performance)
bunx oh-my-opencode install --claude=yes --chatgpt=no --gemini=yes

# Option C: ChatGPT + Gemini (no Claude needed)
bunx oh-my-opencode install --claude=no --chatgpt=yes --gemini=yes
```

### Minimum Setup (Tier 3: Basic Resilience)

Free models only:

```bash
bunx oh-my-opencode install --claude=no --chatgpt=no --gemini=no
```

Uses `opencode/glm-4.7-free` and `opencode/grok-code` - slower but works without subscriptions.

## Emergency: Claude is Down Right Now

If you're currently experiencing Claude authentication failures:

### Option 1: Switch to Antigravity (Fastest Fix)

1. Install the Antigravity auth plugin:
   ```bash
   cd ~/.config/opencode
   echo '{"plugin":["oh-my-opencode","opencode-antigravity-auth@1.2.8"]}' > opencode.json
   bun install
   ```

2. Update `~/.config/opencode/oh-my-opencode.json`:
   ```json
   {
     "google_auth": false,
     "agents": {
       "Sisyphus": {
         "model": "google/antigravity-claude-opus-4-5-thinking-high"
       },
       "oracle": {
         "model": "google/antigravity-claude-opus-4-5-thinking-medium"
       },
       "librarian": {
         "model": "google/antigravity-gemini-3-flash"
       }
     }
   }
   ```

3. Authenticate:
   ```bash
   opencode auth login
   # Select: Google > OAuth with Google (Antigravity)
   ```

### Option 2: Switch to ChatGPT

1. Install OpenAI Codex auth:
   ```bash
   cd ~/.config/opencode
   echo '{"plugin":["oh-my-opencode","opencode-openai-codex-auth@4.3.0"]}' > opencode.json
   bun install
   ```

2. Update agent models:
   ```json
   {
     "agents": {
       "Sisyphus": { "model": "openai/gpt-5.2" },
       "oracle": { "model": "openai/gpt-5.2" },
       "librarian": { "model": "openai/gpt-5.2" }
     }
   }
   ```

3. Authenticate:
   ```bash
   opencode auth login
   # Select: OpenAI > ChatGPT Plus/Pro
   ```

### Option 3: Use Free Models (No Auth Required)

Update `~/.config/opencode/oh-my-opencode.json`:

```json
{
  "agents": {
    "Sisyphus": { "model": "opencode/glm-4.7-free" },
    "oracle": { "model": "opencode/grok-code" },
    "librarian": { "model": "opencode/glm-4.7-free" },
    "explore": { "model": "opencode/grok-code" }
  }
}
```

Restart OpenCode and you're back in business (slower, but works).

## Agent Model Selection Strategy

Different agents have different requirements. Here's the optimal model selection:

### High-Complexity Agents (Need Best Models)

| Agent | Best Choice | Fallback 1 | Fallback 2 |
|-------|-------------|------------|------------|
| **Sisyphus** | claude-opus-4-5 | gpt-5.2 | gemini-3-pro-high |
| **oracle** | gpt-5.2 | claude-opus-4-5 | gemini-3-pro-high |

### Medium-Complexity Agents (Balance Cost/Performance)

| Agent | Best Choice | Fallback 1 | Fallback 2 |
|-------|-------------|------------|------------|
| **librarian** | claude-sonnet-4-5 | gemini-3-flash | glm-4.7-free |
| **frontend-ui-ux** | gemini-3-pro-high | claude-opus-4-5 | glm-4.7-free |
| **document-writer** | gemini-3-flash | claude-sonnet-4-5 | glm-4.7-free |

### High-Volume Agents (Use Cheapest/Fastest)

| Agent | Best Choice | Fallback 1 | Fallback 2 |
|-------|-------------|------------|------------|
| **explore** | gemini-3-flash | grok-code | claude-haiku-4-5 |
| **multimodal-looker** | gemini-3-flash | claude-haiku-4-5 | glm-4.7-free |

## Cost Optimization Tips

1. **Explore agent runs in parallel often** - Use free models (grok-code, glm-4.7-free)
2. **Sisyphus is your workhorse** - Worth paying for best model
3. **Oracle for debugging only** - GPT-5.2 occasional use is fine
4. **Gemini for UI/docs** - Cheap at scale, great quality

## Checking Provider Status

Run the doctor command to check authentication status:

```bash
bunx oh-my-opencode doctor
```

This shows which providers are authenticated and working.

## Multi-Account Load Balancing (Advanced)

The Antigravity auth plugin supports up to 10 Google accounts for automatic rate limit management:

```bash
# Add multiple accounts
opencode auth login  # Add account 1
opencode auth login  # Add account 2
# ... up to 10 accounts
```

When one account hits rate limits, it automatically switches to the next available account.

## Future-Proofing

**Best Practice**: Always configure at least 2 providers. Provider outages happen. Multi-provider setups make you resilient.

Example resilient configuration:

```json
{
  "agents": {
    "Sisyphus": {
      "model": "anthropic/claude-opus-4-5"
    },
    "oracle": {
      "model": "openai/gpt-5.2"
    },
    "librarian": {
      "model": "google/antigravity-gemini-3-flash"
    },
    "explore": {
      "model": "opencode/grok-code"
    },
    "frontend-ui-ux-engineer": {
      "model": "google/antigravity-gemini-3-pro-high"
    },
    "document-writer": {
      "model": "google/antigravity-gemini-3-flash"
    }
  }
}
```

This configuration:
- Uses Claude for main orchestration (Sisyphus)
- GPT-5.2 for strategic reasoning (oracle)
- Gemini for UI/creative work (frontend, docs)
- Free models for high-volume exploration (explore)
- **No single point of failure**

## Common Issues

### "Claude authentication failed"

1. Check if Claude is down: https://status.anthropic.com/
2. Try switching to Antigravity Claude (routes through Google)
3. Temporarily use GPT-5.2 or Gemini
4. Last resort: Free models

### "Rate limit exceeded"

1. For Gemini: Add more Google accounts (up to 10)
2. For Claude: Switch to max20 mode if available
3. For ChatGPT: Check quota at platform.openai.com

### "Model not found"

1. Run `bunx oh-my-opencode doctor` to check setup
2. Verify authentication: `opencode auth login`
3. Check plugin versions in `~/.config/opencode/opencode.json`

## Getting Help

If you're still stuck:

1. Check the [Discord community](https://discord.gg/PUwSMR9XNk)
2. File an issue: https://github.com/code-yeongyu/oh-my-opencode/issues
3. Read the main README: https://github.com/code-yeongyu/oh-my-opencode#readme

Remember: Sisyphus keeps pushing that boulder. Don't let provider outages stop your momentum.
