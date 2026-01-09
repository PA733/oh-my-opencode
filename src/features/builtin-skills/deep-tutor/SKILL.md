---
name: deep-tutor
description: Disciplined task execution with structured exploration, cost-aware tool selection, sufficiency validation, and iteration limits. Inspired by DeepTutor patterns for preventing premature implementation and infinite loops.
---

# Deep Tutor: Disciplined Task Execution

A structured workflow methodology that enforces disciplined exploration, prevents premature implementation, and limits infinite fix loops through systematic validation and cost-aware tool selection.

---

## Core Principles

1. **Classify Before Acting** — Determine request type and minimum parallel effort required
2. **Explore Cost-Effectively** — Start with free local tools, escalate to expensive external resources only when necessary
3. **Validate Sufficiency** — Gate implementation on completion of 5-checkpoint validation
4. **Limit Iterations** — Hard caps on retries prevent infinite loops and token waste

---

## Phase 0: Request Classification

**MANDATORY FIRST STEP**: Classify the request type and determine minimum parallel calls.

| Type | Signal | Min Parallel Calls | Tool Strategy |
|------|--------|-------------------|---------------|
| **Skill Match** | Matches skill trigger phrase | 1 | **INVOKE skill FIRST** via `skill` tool |
| **Trivial** | Single file, known location | 1-2 | Direct tools only, skip exploration |
| **Conceptual** | "How does X?", "Best practice?" | 3+ | context7 + websearch + explore in parallel |
| **Implementation** | "Add feature", "Implement X" | 4+ | explore + lsp_find_references + grep + read patterns |
| **Debugging** | "Why error?", "Fix bug" | 4+ | lsp_diagnostics + explore + read + grep error |
| **Refactoring** | "Refactor", "Improve", "Clean up" | 5+ | ast_grep + lsp_find_references + explore patterns |
| **GitHub Work** | Issue mention, "create PR" | 4+ | Full cycle: investigate → implement → verify → PR |
| **Ambiguous** | Unclear scope | 0 | Ask ONE clarifying question FIRST |

**Parallel Call Enforcement**: The "Min Parallel Calls" column is NOT optional.
- If you launch fewer calls than specified, you are likely under-exploring.
- Launch calls simultaneously, not sequentially.
- Collect results with `background_output` when needed.

---

## Phase 1: Tool Selection Strategy by Phase

**Principle**: Start with fast local tools, escalate to expensive external tools only when local exhausts.

| Phase | Priority Tools | Secondary Tools | Avoid |
|-------|---------------|-----------------|-------|
| **Early** (Problem understanding) | `grep`, `glob`, `read` | `explore` (1-2) | websearch, oracle |
| **Middle** (Pattern discovery) | `lsp_*`, `ast_grep` | `librarian` | oracle (unless stuck) |
| **Late** (Gap filling) | `websearch`, `context7` | `oracle` | more local search |

**Tool Cost Awareness**:
- FREE: grep, glob, read, lsp_*, ast_grep
- CHEAP: explore, librarian (background)
- EXPENSIVE: oracle, websearch (rate-limited)

**Strategy**:
1. **First 2 iterations**: Exhaust FREE tools. Most answers are in the codebase.
2. **If gaps remain**: Fire CHEAP agents in parallel background.
3. **Only if stuck**: Consult EXPENSIVE oracle or external search.

**Anti-pattern**: Jumping straight to websearch/oracle for questions answerable from local code.

---

## Phase 2: Sufficiency Check (GATE before Implementation)

**BLOCKING**: Before moving from Exploration to Implementation, verify ALL checkpoints:

| Checkpoint | Question | If NO |
|------------|----------|-------|
| **Context** | Have I gathered context from 3+ sources? | Fire more explore/librarian in parallel |
| **Patterns** | Do I understand existing code patterns? | Read 2-3 similar files |
| **Dependencies** | Are all imports/dependencies identified? | Use lsp_find_references |
| **Edge Cases** | Have I identified potential edge cases? | Consult Oracle or search more |
| **Scope** | Is the change scope clearly defined? | Ask user for clarification |

```
SUFFICIENCY_SCORE = (checkpoints_passed / 5) * 100%

IF score < 80%:
  → Continue exploration, do NOT proceed to implementation
IF score >= 80%:
  → Proceed to Implementation Phase
```

**Anti-pattern**: Rushing to implementation with incomplete understanding. This causes:
- Multiple fix iterations
- Broken code that needs reverting
- Wasted tokens and time

---

## Phase 3: Implementation with Iteration Limits

### Per-Task Guardrails

| Metric | Limit | On Exceed |
|--------|-------|-----------|
| **Fix attempts per task** | 3 | STOP. Consult Oracle with full context. |
| **Same file edits** | 5 | STOP. Re-read file, reassess approach. |
| **Consecutive failures** | 2 | STOP. Revert to last working state, ask user. |
| **Time on single task** | ~15 min | STOP. Break into smaller subtasks or escalate. |

**Iteration Tracking** (mental model):
```
task_attempt_count = 0
on_each_fix_attempt:
  task_attempt_count++
  if task_attempt_count > 3:
    HALT → "I've attempted this 3 times without success. 
            Consulting Oracle for guidance..."
```

**Why this matters**: Infinite loops waste tokens and produce worse code.
Escalating early to Oracle or user saves time and yields better solutions.

---

## Execution Checklist

Before starting any task, verify:

- [ ] Request type classified
- [ ] Minimum parallel calls determined (1-5+)
- [ ] Tool strategy identified (FREE → CHEAP → EXPENSIVE)
- [ ] Sufficiency checkpoints planned (5 checkpoints)
- [ ] Iteration limits understood (max 3 attempts per task)

During execution:

- [ ] Launch parallel calls simultaneously, not sequentially
- [ ] Use FREE tools first (grep, glob, read, lsp_*, ast_grep)
- [ ] Only escalate to CHEAP agents (explore, librarian) when FREE tools insufficient
- [ ] Gate implementation on 80%+ sufficiency score
- [ ] Track iteration count per task
- [ ] Escalate to Oracle after 3 failed attempts

---

## Anti-Patterns (BLOCKING)

1. **Under-exploration** — Launching fewer parallel calls than minimum required
2. **Premature escalation** — Using websearch/oracle before exhausting FREE tools
3. **Insufficient validation** — Proceeding to implementation with <80% sufficiency score
4. **Infinite loops** — Continuing fixes beyond 3 attempts without escalation
5. **Sequential exploration** — Launching explore/librarian one-by-one instead of parallel

---

## Success Criteria

A task executed with Deep Tutor methodology should demonstrate:

✅ **Proper classification** — Request type and parallel call count documented
✅ **Cost-effective exploration** — FREE tools used first, EXPENSIVE tools justified
✅ **Validated sufficiency** — All 5 checkpoints explicitly verified before implementation
✅ **Limited iterations** — No infinite loops, early escalation on repeated failures
✅ **Parallel execution** — Background agents used for exploration, not sequential calls

---

## Example Workflow

**User Request**: "Add dark mode toggle to settings"

**Phase 0: Classification**
- Type: Implementation
- Min Parallel Calls: 4+
- Tool Strategy: explore + lsp_find_references + grep + read patterns

**Phase 1: Tool Selection (Early)**
```bash
# Parallel execution of FREE tools
grep "theme" -r src/
glob "**/*settings*.{ts,tsx}"
lsp_find_references on ThemeProvider
read src/components/Settings.tsx
```

**Phase 2: Sufficiency Check**
- [x] Context: Found 3+ theme-related files
- [x] Patterns: Understood existing theme structure
- [x] Dependencies: Identified ThemeContext and useState pattern
- [x] Edge Cases: Considered localStorage persistence
- [x] Scope: Toggle component in Settings page
- **Score: 100% → PROCEED**

**Phase 3: Implementation**
- Attempt 1: Add toggle component → Success
- Iteration count: 1 (< 3 limit)
- **COMPLETE**

---

## References

**Inspired by**: [DeepTutor](https://github.com/HKUDS/DeepTutor) - AI-powered personalized learning assistant with sophisticated multi-agent architecture

**Key Patterns Adapted**:
1. **Phase-Based Tool Selection** ([research_agent.py#L113-L189](https://github.com/HKUDS/DeepTutor/blob/dfd82548611aed0e613b39c8f72ae3106b3a747c/src/agents/research/agents/research_agent.py#L113-L189))
2. **Sufficiency Check Gate** ([research_agent.py#L318-L371](https://github.com/HKUDS/DeepTutor/blob/dfd82548611aed0e613b39c8f72ae3106b3a747c/src/agents/research/agents/research_agent.py#L318-L371))
3. **Iteration Limits** ([research_agent.py#L38-L42](https://github.com/HKUDS/DeepTutor/blob/dfd82548611aed0e613b39c8f72ae3106b3a747c/src/agents/research/agents/research_agent.py#L38-L42))
4. **Request Classification** (Multi-agent architecture with specialized roles)
5. **Dynamic Task Queue** ([manager_agent.py](https://github.com/HKUDS/DeepTutor/blob/dfd82548611aed0e613b39c8f72ae3106b3a747c/src/agents/research/agents/manager_agent.py))

**Co-authored by**: @gtg7784 (Taegeon Go)
