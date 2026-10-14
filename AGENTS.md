# Project instructions

Build a production-quality Sezzle take-home calculator within a roughly 2–4 hour implementation budget. The developer knows Java, Python, React, and cloud infrastructure and is learning Go.

## Engineering principles

1. Favor simplicity and correctness over abstractions.
2. Follow official Go conventions and idioms.
3. Do not translate Java/Spring architecture patterns into Go.
4. Avoid speculative extensibility.
5. Prefer the Go standard library where practical.
6. Keep functions small, cohesive, and testable.
7. Use explicit errors and meaningful HTTP status codes.
8. Treat malformed input and edge cases as first-class concerns.
9. Avoid frontend/backend duplication of calculation logic.
10. Treat documentation and tests as part of implementation, not as final cleanup.

Use React, TypeScript, Vite, plain CSS, Vitest, and React Testing Library. Use Go net/http and testing/httptest with separate HTTP and arithmetic packages. Avoid unnecessary interfaces, dependency injection frameworks, repositories, and enterprise patterns. Keep the backend deployment-agnostic. Deployment is an optional final milestone; do not introduce a platform adapter or platform configuration into the initial architecture. Use a traditional calculator keypad with a small explicit reducer/state machine, and perform all arithmetic through the Go API. Do not add frontend state libraries or an expression parser. Tests should cover meaningful behavior, not arbitrary percentage targets.

## Workflow for EVERY implementation task

1. Read AGENTS.md, TASKS.md, and relevant design documentation.
2. Identify the current task and its acceptance criteria.
3. Implement ONLY the current approved task.
4. Add or update relevant tests.
5. Run the appropriate checks and report results.
6. Update TASKS.md with progress.
7. Update documentation whenever behavior, architecture, API contracts, setup, or decisions change.
8. Record significant design decisions in docs/DECISIONS.md, including alternatives and trade-offs.
9. Summarize changed files, test results, and remaining issues.
10. Stop and wait for the user's approval before starting another task.

## Additional rules

- Never mark a task completed unless its acceptance criteria are satisfied.
- Never claim a test passed unless it was actually executed.
- If a tool is unavailable, report the limitation.
- Do not silently add dependencies or change architecture. Identify proposed additions and reasons before making them within an approved task.
- Do not implement optional features until required functionality works.
- Do not create excessive documentation for trivial changes.
- Keep comments focused on WHY rather than restating WHAT the code does.
- Explain non-obvious Go-specific patterns briefly so the developer can defend them in an interview.
- Keep README.md as the main user-facing documentation once implementation starts.
- Append subsequent user prompts faithfully and chronologically to AI_PROMPTS.md, with task references where practical. Do not invent, paraphrase, or claim complete interaction coverage without verification.
- If optional deployment is approved later, research the chosen platform then. Record documentation evidence separately from executed build/deployment evidence.
- Planning approval does not approve every future implementation task. Update the current task only when the user approves it.

## Current approved scope

Task 6.2 — final documentation cleanup is complete. QA and optional Dockerization (7.2) are verified; STATIC_DIR enables same-origin Go static serving while nil frontend preserves API-only development. Application code, tests, dependencies and Docker infrastructure were unchanged during cleanup. Stop and wait for approval; public repository publication remains pending, with no commit, push, deployment or extra feature authorized.
