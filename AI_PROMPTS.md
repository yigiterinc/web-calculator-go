# AI usage disclosure and prompt log

AI assistance: OpenAI Codex assisted with environment inspection, official documentation research, planning and its revision, and the backend setup task. Implementation and executed verification are recorded in TASKS.md; arithmetic, the calculation handler, and frontend remain pending.

Scope: this log preserves the initial user-supplied project prompt and the subsequent revision/setup prompt below verbatim. It is not a complete transcript of system/developer instructions, tool calls, or assistant messages, and does not claim to include all interactions. Append subsequent user prompts chronologically, exactly as supplied, with related task IDs where practical; explicitly label any unavailable material rather than reconstructing it.

## 2026-10-14 — Prompt 001 — Task 1.1: initial planning

Source: the user-attached `Pasted text.txt`. The prompt text below is copied verbatim; the enclosing Markdown fence is not part of the prompt.

````text
You are acting as a senior software engineer and technical mentor helping me build a production-quality take-home assignment for Sezzle.

## Project context

Build a full-stack calculator application.

Requirements:
- React + TypeScript frontend
- Go REST API backend
- Addition, subtraction, multiplication, division
- Input validation and robust error handling
- Responsive calculator UI
- Unit tests and coverage reports for both layers
- Documentation with setup instructions, API examples, and design rationale
- Public Git repository
- AI prompts disclosed as part of the submission

Expected effort: 2–4 hours.

I am an experienced backend/full-stack engineer familiar with Java, Python, React, and cloud infrastructure, but I am new to Go.

## Technical preferences

Frontend:
- React + TypeScript + Vite
- Plain CSS
- Vitest + React Testing Library
- A polished, keyboard-accessible calculator interface

Backend:
- Idiomatic Go
- Standard library net/http
- Standard library testing/httptest
- Minimal dependencies
- Separation of HTTP transport and calculation logic
- No unnecessary interfaces, dependency injection frameworks, repositories, or enterprise architecture patterns

Deployment:
- Target Vercel for both frontend and Go API
- Keep local development independent of Vercel
- Reuse the same business logic between local server and serverless entry points
- Verify current Vercel Go runtime and monorepo requirements before deciding the deployment structure
- Prefer same-origin API requests in production

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

## Persistent project instructions

Create an AGENTS.md file containing the engineering principles and the following workflow rules.

For EVERY implementation task:

1. Read AGENTS.md, TASKS.md, and relevant design documentation.
2. Identify the current task and its acceptance criteria.
3. Implement ONLY the current approved task.
4. Add or update relevant tests.
5. Run the appropriate checks and report results.
6. Update TASKS.md with progress.
7. Update documentation whenever behavior, architecture, API contracts, setup, or decisions change.
8. Record significant design decisions in docs/DECISIONS.md, including alternatives and trade-offs.
9. Summarize changed files, test results, and remaining issues.
10. Stop and wait for my approval before starting another task.

Additional rules:
- Never mark a task completed unless its acceptance criteria are satisfied.
- Never claim a test passed unless it was actually executed.
- If a tool is unavailable, report the limitation.
- Do not silently add dependencies or change architecture.
- Do not implement optional features until required functionality works.
- Do not create excessive documentation for trivial changes.
- Keep comments focused on WHY rather than restating WHAT the code does.
- Explain non-obvious Go-specific patterns briefly so I can understand and defend them during an interview.

## Task management

Create TASKS.md with:
- Numbered milestones
- Small, independently testable tasks
- Checkboxes for pending/completed work
- Acceptance criteria for each task
- Dependencies where relevant
- A clearly identified current task
- A short verification record for completed tasks

Suggested milestones:
1. Architecture and API contract
2. Go backend implementation
3. Backend tests and validation
4. React frontend
5. Frontend tests
6. Vercel deployment
7. Documentation, coverage, and final review

You may refine these milestones to avoid redundant work.

## Documentation

Create:
- AGENTS.md: persistent engineering and workflow instructions
- TASKS.md: implementation plan and progress tracking
- docs/DECISIONS.md: meaningful architectural decisions
- AI_PROMPTS.md: AI usage disclosure and prompt log

For AI_PROMPTS.md:
- Include this initial prompt.
- Organize subsequent prompts chronologically.
- Record prompts faithfully rather than inventing or paraphrasing them.
- Where practical, indicate which task each prompt relates to.
- Do not claim that the log includes all interactions unless verified.

Maintain README.md as the main user-facing documentation once implementation begins.

## Initial task — planning only

First inspect the existing repository and local development environment.

Then:

1. Propose a minimal directory structure suitable for idiomatic Go, React/Vite, and Vercel deployment.
2. Define the API request/response/error contract.
3. Identify arithmetic and HTTP edge cases.
4. Propose the frontend interaction model.
5. Define the testing and coverage strategy.
6. Identify risks related to Vercel's Go runtime.
7. Produce the implementation task list.
8. Create the initial project management and documentation files.

Do NOT implement the calculator, scaffold the application, install dependencies, or deploy yet.

Present a concise architecture summary, the planned tasks, and any decisions requiring my review.

Stop after planning and wait for approval.
````

## 2026-10-14 — Prompt 002 — Tasks 1.2 and 2.1: revised plan and backend setup

Source: user message, copied verbatim. The enclosing fence is not part of the prompt.

````text
I've reviewed DESIGN.md and docs/DECISIONS.md. I want to approve most of the backend architecture but revise the frontend and deployment decisions before we start implementing.

## Architecture decisions

1. Keep Go's standard library architecture: cmd/server, internal/calculator, internal/httpapi.
2. Keep the existing POST /api/calculate contract, float64 policy, input validation, and structured errors.
3. Make the backend deployment-agnostic. Remove the initial Vercel function adapter and deployment-specific architecture. Deployment becomes an optional final milestone.
4. Replace the two-operand form with a polished, traditional calculator keypad interface.

## Frontend requirements

Build a modern, visually polished calculator, not a generic HTML form.

It should have:

- A prominent numeric display
- A smaller expression/operation display
- A conventional numeric keypad
- Addition, subtraction, multiplication, division
- Decimal input
- Negative number toggle
- Clear and backspace
- Equals button
- Keyboard support
- Responsive layout
- Accessible buttons and visible focus states
- Loading and error feedback

Use React, TypeScript, and plain CSS.

Keep the design minimal, modern, and professional. Pay attention to typography, spacing, visual hierarchy, button states, and mobile usability.

## Calculator state management

Use a small, explicit state machine or reducer.

Clearly define:

- Number entry
- Decimal handling
- Operator selection and replacement
- Second operand entry
- Equals behavior
- Reusing a previous result
- Starting a new calculation after a result
- Clear and backspace
- Errors and pending API requests
- Handling stale responses

Support binary calculations and reusing results for subsequent operations. Do not implement a general expression parser or complex operator precedence.

All arithmetic must be performed through the Go API, not duplicated in JavaScript.

Avoid unnecessary frontend state libraries.

## Testing

Retain Go table-driven tests and httptest coverage.

For the frontend, test calculator interaction sequences and API integration, including state transitions, error handling, keyboard input, and async request behavior.

Focus on meaningful behavioral coverage rather than arbitrary coverage thresholds.

## Documentation and task management

Update DESIGN.md, DECISIONS.md, TASKS.md, and AGENTS.md to reflect the approved decisions.

Mark approved decisions as accepted, and revised decisions accordingly. Preserve the rationale and important trade-offs.

Keep meaningful documentation accurate after each task.

Log the actual AI prompts used for the submission.

## Next step

First, revise the planning documents and briefly summarize the changes.

Then proceed with the first backend setup task only:

- Initialize the Go module
- Create the agreed package structure
- Set up the local HTTP server scaffold
- Verify the Go toolchain and build
- Add minimal appropriate tests

Do not implement calculator arithmetic, the REST calculation handler, or the frontend yet.

Stop after this task and report:

- Files created or modified
- Verification commands and results
- Go-specific design decisions
- Updated task status
- The next proposed task

Do not continue automatically.
````
