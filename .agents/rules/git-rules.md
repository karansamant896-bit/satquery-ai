# SatQuery AI — Git Rules for 3 Parallel Agents

## Branches
- main = shared integration branch
- frontend = frontend agent branch
- backend = backend + ML service agent branch
- database = database agent branch

## Ownership
Frontend agent: frontend/**
Backend/ML agent: backend/**
Database agent: prisma/**, migration/seed artifacts

Shared control files are team-owned:
- .agents/**
- brain.md
- docs/prd.md
- docs/design.md
- docs/tech.md
- docs/api.md
- docs/plan.md

Do not let three agents edit the same shared file simultaneously.

## Before Work
1. Pull latest main.
2. Confirm assigned branch.
3. Read shared docs.
4. Check brain.md.

## Commits
Use small meaningful commits, e.g.:
- feat(frontend): add query workspace
- feat(ml): add VQA adapter
- feat(db): add analysis history tables
- fix(api): normalize analysis response
- docs: update execution contract

## Pull Requests
Major integrations go through a PR into main. Include summary, files changed, verification, known issues, and shared-contract changes.

## Updating Branches
Before a new integration task, update from latest main, resolve conflicts carefully, and rerun relevant checks.

## Conflict Rule
If a conflict touches docs/api.md, docs/database.md, docs/tech.md, Prisma schema, or execution response contracts: STOP and resolve with the team.

## Never
- force push shared branches
- commit .env
- commit model weights
- commit uploaded datasets/images
- hard reset someone else's unpushed work
- merge untested inference code
- modify another agent's directory just to "make it work"

## Main Rule
main must remain demoable. After significant merges, build and run the core smoke test.
