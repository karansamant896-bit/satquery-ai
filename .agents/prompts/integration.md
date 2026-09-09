# Integration / Review Agent — Prompt

Use for coordinated integration passes.

Read all .agents/rules/, brain.md, and all docs/*.md.

Review:
1. Does the app satisfy every mandatory PS capability?
2. Do frontend/backend follow docs/api.md?
3. Does the DB follow docs/database.md?
4. Does ML return documented evidence/trace?
5. Can every mandatory demo journey run end-to-end?
6. Are there hidden dependencies or secrets?
7. Did any agent add unnecessary infrastructure?

Do not rewrite large sections blindly.

Return PASS/FAIL for each mandatory requirement, integration bugs, exact files needing fixes, and priority P0/P1/P2.
