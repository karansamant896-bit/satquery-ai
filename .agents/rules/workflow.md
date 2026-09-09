# SatQuery AI — AI Agent Workflow Rules

## 1. Before touching code
Read in order:
1. .agents/rules/stack.md
2. brain.md
3. docs/prd.md
4. docs/tech.md
5. docs/api.md
6. docs/database.md
7. docs/plan.md
8. Relevant agent prompt under .agents/prompts/

## 2. Task Loop
### Understand
Identify goal, allowed files, dependencies, and success criteria.
### Inspect
Read existing implementation before replacing/creating files.
### Check contracts
Confirm API, database, architecture, and ownership boundaries.
### Plan minimally
Choose the smallest implementation satisfying acceptance criteria.
### Implement
Do not rewrite unrelated working code.
### Verify
Run relevant typecheck/lint/tests/build and manual smoke test where appropriate.
### Report
Provide files changed, verification, remaining issues, and merge safety.

## 3. Dependency Installation
Before adding a non-trivial dependency:
- verify current supported version from official docs/package registry
- check security advisories
- explain why it is needed
- prefer existing dependencies

Never invent versions.

## 4. Database Changes
1. Check docs/database.md.
2. Propose schema change.
3. Update canonical Prisma schema.
4. Generate/apply the supported migration workflow.
5. Verify affected queries.
6. Update docs/database.md if the contract changed.
7. Tell the other agents what changed.

## 5. API Changes
1. Update docs/api.md first.
2. Implement backend behavior.
3. Update frontend consumer.
4. Test both sides.
5. Record integration status in brain.md.

Never invent undocumented response fields.

## 6. AI/ML Changes
- Prefer pre-downloaded tested checkpoints.
- Do not train large models during the hackathon.
- Validate image compatibility before inference.
- Keep inference behind the model/tool registry.
- Return structured outputs.
- Include evidence/confidence when supported.
- Log model/tool selection in execution trace.
- Never expose private reasoning.

## 7. Failure Handling
Return a machine-readable error, human-readable message, failed tool/model name, and safe next step/fallback. Never fabricate scientific answers.

## 8. Time Pressure
P0 = mandatory end-to-end demo
P1 = mandatory requirement not yet demoed
P2 = visual polish/usability
P3 = optional enhancements

When time is low: finish P0 -> test P0 -> stabilize P0 -> stop adding architecture.

## 9. Agent Communication
Use documented contracts, git commits/PRs, brain.md status, and execution summaries. Never resolve cross-branch problems by editing another agent's owned files.

## 10. End-of-Task Format
### Completed
...
### Files Changed
...
### Verification
...
### Risks / Blockers
...
### Next Recommended Task
...
