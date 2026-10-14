# AI usage disclosure and prompt log

AI assistance: OpenAI Codex assisted with environment inspection, official documentation research, planning and its revision, the backend setup task, calculator core, REST API, read-only backend review, frontend setup/reducer, the integrated React keypad/API client, final QA/submission preparation, and optional Dockerization. Implementation and executed verification are recorded in TASKS.md.

Scope: this log preserves the initial user-supplied project prompt and subsequent user prompts below verbatim. It is not a complete transcript of system/developer instructions, tool calls, or assistant messages, and does not claim to include all interactions. Append subsequent user prompts chronologically, exactly as supplied, with related task IDs where practical; explicitly label any unavailable material rather than reconstructing it.

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

## 2026-10-14 — Prompt 003 — Task 2.2: calculator core

Source: user message, copied verbatim. The enclosing fence is not part of the prompt.

````text
Proceed with Task 2.2: implement the calculator core.

Before implementation, read AGENTS.md, TASKS.md, and the relevant architecture decisions.

Requirements:

- Implement the four arithmetic operations: addition, subtraction, multiplication, and division.
- Use float64 as agreed.
- Keep the calculation package entirely independent of HTTP and infrastructure.
- Follow idiomatic Go practices, especially naming, error handling, and package design.
- Handle division by zero, unsupported operations, non-finite operands, and non-finite results.
- Do not introduce interfaces, unnecessary abstractions, or third-party dependencies.
- Use table-driven unit tests covering normal operations, negative numbers, zero, fractional values, and important numeric edge cases.
- Keep the public API of the calculator package minimal.
- Do not implement HTTP handlers or frontend functionality.

After implementation:

1. Run gofmt, go vet, go test, and go test -race.
2. Generate and report calculation package test coverage.
3. Review the implementation for idiomatic Go and opportunities to simplify.
4. Update TASKS.md and relevant documentation.
5. Record this prompt in AI_PROMPTS.md.
6. Explain the public API, important Go-specific design decisions, and test results.

Stop after completing Task 2.2. Do not automatically proceed to the HTTP API implementation.
````

## 2026-10-14 — Prompt 004 — Task 2.3: REST calculation API

Source: user message, copied verbatim. The enclosing fence is not part of the prompt.

````text
Proceed with Task 2.3 — REST Calculation API.

Task 2.2 is complete. The calculator package exposes:

`Calculate(operation string, a, b float64) (float64, error)`

It supports four operations and exposes sentinel errors for unsupported operations, non-finite operands, division by zero, and non-finite results.

## Before implementation

1. Read AGENTS.md, TASKS.md, docs/DESIGN.md, docs/DECISIONS.md, and the current calculator implementation.
2. Follow the existing API contract and architectural decisions.
3. Review the existing server scaffold and reuse it rather than introducing a parallel server architecture.
4. Do not modify the calculator core unless you identify a concrete defect. Explain any necessary change.

## Implementation

Implement `POST /api/calculate` using Go's standard library.

Request:
```json
{
  "operation": "multiply",
  "a": 12,
  "b": 5
}
```

Successful response (HTTP 200):
```json
{
  "result": 60
}
```

Error response:
```json
{
  "error": {
    "code": "division_by_zero",
    "message": "Cannot divide by zero."
  }
}
```

### Requirements

- Use `net/http` and `encoding/json`.
- Keep HTTP concerns inside `internal/httpapi`.
- Keep arithmetic inside `internal/calculator`.
- Wire the handler into the existing server.
- Accept only POST requests.
- Validate Content-Type.
- Reject malformed JSON and multiple JSON values.
- Reject unknown fields.
- Distinguish missing or null operands from valid zero values.
- Validate supported operations.
- Enforce the previously agreed 4 KiB request body limit.
- Map calculator sentinel errors using `errors.Is`.
- Return consistent JSON error codes and meaningful HTTP statuses.
- Handle non-finite results without attempting to serialize invalid JSON numbers.
- Return appropriate response headers.
- Do not expose internal implementation details in error responses.
- Avoid unnecessary interfaces, middleware, frameworks, or dependencies.

Follow the error codes and status mappings documented in DESIGN.md. If you discover an ambiguity or inconsistency, explain it and choose the simplest defensible behavior.

### Go engineering quality

Prioritize idiomatic Go practices:

- Simple handler functions and minimal exported APIs.
- Explicit error handling.
- Correct request body handling.
- No unnecessary abstraction layers.
- No duplicated business logic.
- Clear package boundaries.
- Readable code over clever code.

Do not add custom infrastructure for hypothetical future requirements.

## Tests

Add table-driven HTTP handler tests using `net/http/httptest`.

Cover at least:

- All four operations.
- Decimal, negative, and zero operands.
- Division by zero.
- Unsupported operation.
- Missing and null operands.
- Invalid operand types.
- Malformed and empty JSON.
- Unknown fields.
- Multiple JSON objects.
- Missing or invalid Content-Type.
- Unsupported HTTP methods.
- Request body size boundaries.
- Non-finite arithmetic results.
- Correct status codes and JSON response structure.

Also verify that the real local server routes requests correctly.

Keep tests deterministic and independent of external services.

## Verification

Run:

- `gofmt`
- `go vet ./...`
- `go test ./...`
- `go test -race ./...`
- `go build ./...`

Generate an HTTP package coverage report and inspect uncovered meaningful branches. Do not add artificial tests just to reach a particular coverage percentage.

Run a real HTTP smoke test against the local server using curl, including:

1. Successful multiplication
2. Division by zero
3. Invalid request

Report the observed HTTP status codes and responses.

## Documentation and task management

- Update TASKS.md and mark Task 2.3 complete only if its acceptance criteria pass.
- Update README.md with local server instructions and real curl examples.
- Update design documentation only if decisions or behavior change.
- Log this prompt in AI_PROMPTS.md.
- Do not commit or push changes automatically.

## Final report

Summarize:

1. Files modified or created.
2. API behavior and error handling.
3. Verification commands and actual results.
4. HTTP package test coverage.
5. Any remaining limitations.
6. Any Go-specific design choices worth understanding.
7. The next proposed task.

Stop after Task 2.3. Do not start frontend implementation without approval.
````

## 2026-10-14 — Prompt 005 — Backend read-only review

Source: user message, supplied twice with identical text. Recorded once here during the later authorized documentation update; no files were changed during the read-only review.

````text
Perform a focused, read-only code review of the completed Go backend.

Read the implementation, tests, AGENTS.md, TASKS.md, and design decisions.

Evaluate:

1. Idiomatic Go practices and package structure.
2. Correctness of HTTP parsing, validation, and error mapping.
3. Simplicity and maintainability.
4. Any unnecessary abstractions or defensive complexity.
5. Real bugs, missing edge cases, and misleading tests.
6. Whether the backend satisfies Sezzle's take-home requirements.

Classify findings as:

- Must fix before submission
- Worth improving
- Optional / stylistic

Reference exact file paths and line numbers.

Do not modify any files. Do not add tests or features.

If the implementation is already sufficient, explicitly say so rather than inventing improvements.

Keep the review proportional to a 2–4 hour take-home assignment.
````

## 2026-10-14 — Prompt 006 — Task 3.1: React setup and calculator state management

Source: user message, copied verbatim. The enclosing Markdown fence is not part of the prompt.

````text
The backend code review is complete. No blocking issues were identified. Treat the backend as approved and proceed with the first frontend implementation task.

Before starting, read AGENTS.md, TASKS.md, docs/DESIGN.md, docs/DECISIONS.md, and the current backend API contract.

## Task 3.1 — React setup and calculator state management

Set up the frontend using:

- React
- TypeScript
- Vite
- Vitest

Keep dependencies minimal and follow idiomatic React and TypeScript practices.

The frontend will be a polished traditional calculator with a numeric keypad, not a two-operand form.

### Implement the calculator state machine

Use a pure reducer or equivalent testable state transition function.

Support:

- Digit entry (0–9)
- Decimal entry
- Negative number toggle
- Operator selection: +, −, ×, ÷
- Replacing an operator before entering the second operand
- Clear
- Backspace
- Equals
- Reusing a previous result
- Starting a new calculation after a completed result

Important design rule:\
The frontend must NEVER perform arithmetic calculations. All actual addition, subtraction, multiplication, and division must happen through the Go API.

Design the reducer so that pressing equals produces a calculation request intent containing the operation and two operands. API execution will be connected in the next task.

Define behavior for edge cases clearly, including:

- Repeated decimal points
- Leading zeros
- Empty operands
- Operator changes
- Repeated equals
- Editing after a result
- Pending calculations
- Error recovery

Avoid a general expression parser, operator precedence engine, or unnecessary state management libraries.

### Testing

Write focused unit tests for the reducer covering normal and edge-case input sequences.

Ensure the reducer is deterministic and has no network dependencies.

### Scope restrictions

Do not implement the final visual design or HTTP API integration in this task.

Do not modify the approved Go backend unless you discover a blocking integration problem.

### Verification

Run:

- TypeScript type checking
- Vitest reducer tests
- Frontend production build

### Documentation and workflow

- Update TASKS.md and relevant design documentation.
- Log this prompt in AI_PROMPTS.md.
- Follow the existing AGENTS.md instructions.
- Do not commit or push automatically.

### Final report

Summarize:

1. Files created and changed.
2. Reducer state model and supported transitions.
3. Important UX decisions.
4. Test results.
5. Any remaining issues.
6. Next proposed task.

Stop after Task 3.1 and wait for approval.
````

## 2026-10-14 — Prompt 007 — Task 3.2: React calculator UI and Go API integration

Source: user message, copied verbatim. The enclosing Markdown fence is not part of the prompt.

````text
Proceed with Task 3.2 — React calculator UI and Go API integration.

Task 3.1 is complete. The pure calculator reducer and its 67 tests are approved. The Go backend is also complete and reviewed.

Before implementation:

- Read AGENTS.md, TASKS.md, README.md, and relevant design decisions.
- Inspect the existing reducer and API contract.
- Preserve the existing reducer behavior and tests unless a real integration issue requires changes.

## Objective

Build a complete, working, visually polished traditional calculator interface connected to the existing Go REST API.

This should feel like a finished small product, not a generic demo or form.

## UI requirements

Create a modern, professional calculator interface featuring:

- A centered calculator panel with thoughtful spacing and proportions
- A prominent number/result display
- A smaller expression display
- A conventional numeric keypad
- Clear visual distinction between digits, operators, and primary actions
- AC, backspace, sign toggle, decimal, and equals controls
- Subtle hover, active, focus, loading, and error states
- Responsive layout for mobile and desktop
- Accessible button names and keyboard navigation

Use React, TypeScript, and plain CSS. Avoid unnecessary UI frameworks, icon libraries, or animation dependencies.

Use your design judgment to create a visually appealing but restrained interface. Avoid excessive gradients, decorative elements, or unnecessary visual effects.

## API integration

Connect the existing reducer to:

POST /api/calculate

Request:\
{ "operation": "add", "a": 12, "b": 5 }

Success:\
{ "result": 17 }

Requirements:

- Create a small typed API client.
- Use relative API paths.
- Configure Vite's development proxy to localhost:8080.
- All arithmetic must execute on the Go backend.
- Handle loading, HTTP errors, malformed responses, network failures, and timeouts.
- Use AbortController for request cancellation.
- Ensure Clear invalidates pending requests and prevents stale results from appearing.
- Prevent duplicate calculation requests while pending.
- Preserve the existing reducer's state transitions.
- Do not introduce a state management library.

## Interaction requirements

- Mouse and touch keypad interactions
- Keyboard digits and decimal point
- Keyboard +, -, \*, /, Enter, =, Backspace, and Escape
- Operator replacement before second operand entry
- Result reuse and fresh calculation after results
- Meaningful feedback for division by zero and invalid requests
- No unintended browser behavior caused by keyboard shortcuts
- No duplicate keyboard handling when focus is on an interactive element

## Testing

Add focused React Testing Library tests and API client tests covering:

- Rendering and accessible controls
- Digit/operator entry
- Keyboard interactions
- API request payloads and success rendering
- Error responses
- Loading state and duplicate-request prevention
- Clear during pending requests
- Stale responses and network failures

Do not replicate arithmetic calculations in frontend production code.

## Verification

Run:

- npm run typecheck
- npm test
- npm run build
- Go tests if backend files are changed

Start both the Go server and Vite frontend and verify at least one real end-to-end calculation through the API. If browser interaction cannot be verified, report that explicitly rather than claiming success.

## Documentation and workflow

- Update TASKS.md with accurate progress.
- Update README.md with frontend setup instructions.
- Update relevant design documentation if decisions change.
- Log this prompt in AI_PROMPTS.md.
- Do not commit or push automatically.

## Final report

Provide:

1. Files created or modified.
2. UI implementation summary.
3. API integration and cancellation behavior.
4. Test results.
5. Actual integration verification results.
6. Remaining limitations.
7. Next proposed task.

Stop after Task 3.2 and wait for approval.
````

## 2026-10-14 — Prompt 008 — Task 3.3: final quality assurance and submission preparation

Source: user message, supplied twice with identical task text. Recorded once verbatim below. Ambient browser/page context is not part of this prompt; the enclosing fence is not part of the prompt.

````text
Proceed with Task 3.3 — Final Quality Assurance and Submission Preparation.

The Go backend and React calculator are implemented and working. Manual testing confirmed that basic arithmetic, result reuse, keyboard interactions, and the on-screen keypad work correctly. The reported Backspace issue was caused by focus being moved away from the calculator, not an application bug.

We are approaching the submission deadline. Prioritize correctness and delivery readiness over additional features.

## 1. Review the project

Read:

- AGENTS.md
- TASKS.md
- README.md
- docs/DESIGN.md
- docs/DECISIONS.md
- AI_PROMPTS.md

Inspect the actual implementation and identify incomplete requirements.

Check the application against Sezzle's original assignment, not just our internal task list.

Do not introduce new features or unnecessary refactoring.

## 2. Frontend quality assurance

Review and test:

- All four arithmetic operations
- Keyboard and mouse interactions
- Decimal and negative number entry
- Clear and Backspace
- Operator replacement
- Result reuse
- Division by zero
- Network and API errors
- Loading state and duplicate request prevention
- Request cancellation and stale responses
- Responsive layout and accessibility

Add tests only where meaningful behavior is insufficiently covered.

Verify that arithmetic is performed exclusively by the Go backend.

Do not change the calculator's established interaction behavior without identifying a concrete problem.

## 3. Backend verification

Run:

- gofmt
- go vet ./...
- go test ./...
- go test -race ./...
- go build ./...

Do not refactor the backend unless a real defect is found.

## 4. Frontend verification

Run:

- npm run typecheck
- npm test
- npm run build
- npm run test

If the coverage script does not exist, configure it using the existing test tooling.

Generate reproducible coverage reports for both frontend and backend.

Report actual coverage numbers, clearly distinguishing package-level and project-level coverage.

Do not fabricate results or chase arbitrary coverage percentages.

## 5. Integration testing

Start the actual Go backend and Vite frontend.

Verify frontend-to-backend communication.

Exercise successful calculations and at least one API error through the actual application.

If browser interaction cannot be tested automatically, explicitly report what requires manual verification.

## 6. Documentation and deliverables

Review and finalize README.md.

It must include:

- Project overview
- Technology stack
- Prerequisites
- Installation instructions
- How to run backend and frontend
- How to run tests and generate coverage reports
- API endpoint documentation
- Example curl requests and responses
- Design decisions and assumptions
- Known limitations

Review AI_PROMPTS.md:

- Ensure prompts are recorded faithfully
- Include significant AI-assisted design and implementation interactions
- Do not invent missing prompts
- Clearly disclose AI assistance

Ensure generated coverage reports, binaries, node_modules, and other build artifacts are excluded appropriately from Git.

## 7. Repository readiness

Inspect:

- git status
- .gitignore
- tracked files
- repository structure
- accidental secrets or credentials
- unnecessary generated artifacts

Do not push to GitHub yet.

Do not commit automatically.

Do not deploy yet.

## 8. Final report

Provide:

1. Overall submission readiness: Ready / Needs minor fixes / Blocked
2. Requirements checklist against the original Sezzle assignment
3. Tests executed and results
4. Backend and frontend coverage results
5. Bugs discovered and fixes applied
6. Documentation completeness
7. Repository cleanliness
8. Remaining manual verification steps
9. Any submission blockers
10. Recommended next action

Update TASKS.md and AI_PROMPTS.md.

Stop after completing this QA task and wait for approval.

Remember: this is a 2–4 hour take-home. Keep the review proportional and avoid overengineering.
````

## 2026-10-14 — Prompt 009 — Optional Dockerization deliverable (Task 7.2)

Source: user message, copied verbatim. The enclosing fence is not part of the prompt.

````text
Implement the optional Dockerization deliverable for the completed Sezzle calculator take-home assignment.

The application is complete and has passed final QA:

- Go backend using net/http
- React + TypeScript + Vite frontend
- POST /api/calculate
- Comprehensive backend and frontend tests
- README and AI prompt documentation

The goal is to make the full-stack application runnable with a single Docker command.

This is an optional enhancement. Keep the implementation minimal and proportional to a 2–4 hour take-home assignment.

## Requirements

1. Create a production-oriented multi-stage Dockerfile:
   - Node stage builds the React/Vite frontend using npm ci.
   - Go stage builds the backend binary.
   - Minimal runtime stage contains only the Go executable, built frontend assets, and necessary runtime files.
2. Serve the frontend and backend from the same origin on port 8080:
   - GET / serves the calculator UI.
   - POST /api/calculate continues to serve the existing REST API.
   - Frontend uses relative API requests.
   - API routes must never accidentally fall back to index.html.
   - Preserve existing API response semantics and HTTP status codes.
3. If Go static file serving is needed:
   - Keep the change small and idiomatic.
   - Avoid introducing frameworks or reverse proxies.
   - Preserve existing local development behavior.
   - Add relevant tests for static file serving and routing.
   - Do not modify calculator arithmetic or API validation.
4. Add .dockerignore to exclude:
   - node_modules
   - dist
   - coverage reports
   - .git
   - local environment files
   - unnecessary generated artifacts
5. Use an appropriate non-root runtime user where practical.
6. Keep the runtime image reasonably small and avoid unnecessary dependencies.
7. Do not add Docker Compose unless there is a concrete need. A single Dockerfile is preferred.

## Verification

If Docker is available:

- Build the image.
- Start the container.
- Verify GET / returns the React application.
- Verify POST /api/calculate returns a correct result.
- Verify division-by-zero errors.
- Confirm API routes are not handled by the frontend fallback.
- Run existing Go tests and frontend tests to detect regressions.
- Stop and remove test containers afterward.

If Docker is unavailable, clearly report what could and could not be verified. Do not claim a successful Docker build without actually running it.

## Documentation

Update README.md with:

- Docker build command
- Docker run command
- URL to access the application
- Explanation of the single-container architecture
- Any known limitations

Update TASKS.md and relevant design decisions.

Record this prompt in AI_PROMPTS.md.

## Constraints

- Do not introduce unrelated changes.
- Do not add optional calculator features.
- Do not deploy.
- Do not commit or push automatically.
- Preserve the existing test and coverage results.
- Prioritize reliable, reproducible builds over clever optimizations.

## Final report

Summarize:

1. Files added or modified.
2. Docker image architecture.
3. Actual build and runtime verification results.
4. Tests executed.
5. Any remaining limitations.
6. Whether the project is ready for GitHub publication.

Stop after Dockerization and wait for approval.
````

## 2026-10-15 — Prompt 010 — Task 6.2: final documentation cleanup

Source: user-attached Pasted text.txt, copied verbatim. Codex assisted with this documentation-only cleanup and consistency verification. The enclosing fence is not part of the prompt; earlier recorded text is preserved unchanged.

````text
Perform a final documentation cleanup and consistency review for the Sezzle calculator take-home assignment.

The application has already passed comprehensive QA. Dockerization has been requested as an optional deliverable.

Read all project documentation and inspect the actual implementation before making changes:

- README.md
- AGENTS.md
- TASKS.md
- docs/DESIGN.md
- docs/DECISIONS.md
- AI_PROMPTS.md
- Dockerfile and .dockerignore, if implemented
- Relevant source and configuration files

## Objective

Make the documentation concise, accurate, professional, and easy for Sezzle engineers to evaluate.

The current documentation contains excessive historical setup details, repeated explanations, and internal implementation logs.

Preserve useful engineering rationale while removing unnecessary verbosity.

This is a documentation cleanup task, not an application refactoring task.

## 1. README.md — Reviewer-facing documentation

Target approximately 80–110 lines, without sacrificing essential information.

Use this structure:

1. Overview and tech stack
2. Quick Start with Docker
3. Local Development
4. REST API and curl examples
5. Testing and Coverage
6. Design Decisions
7. Limitations and AI Assistance

Requirements:
- Make Docker the preferred quick-start option ONLY if successfully implemented and verified.
- Include working docker build/run commands.
- Include prerequisites and local Go/Vite development commands.
- Include API request, success response, and error example.
- Include reproducible test and coverage commands.
- Include a concise coverage summary using verified figures.
- Explain the important architectural decisions.
- Link to DESIGN.md, DECISIONS.md, and AI_PROMPTS.md.

Remove:
- Developer-specific Go installation paths.
- Checksum verification history.
- Temporary local ports.
- Historical QA session descriptions.
- Exhaustive HTTP validation details.
- Long keyboard shortcut explanations.
- Internal sentinel error tables.
- Detailed reducer implementation walkthroughs.
- Repeated explanations and unnecessary historical context.

Write concise, natural technical English.

## 2. AGENTS.md — Engineering instructions

Keep the existing engineering principles and task workflow.

Make only necessary adjustments:
- Update outdated project status.
- Reflect the approved optional Docker work.
- Preserve idiomatic Go and minimal-dependency requirements.
- Preserve task-by-task verification and documentation rules.

Do not overcompress this file. It is already reasonably concise.

## 3. TASKS.md — Task management

Target approximately 60–85 lines.

Keep:
- Numbered milestones and task status.
- Acceptance criteria.
- Completed implementation scope.
- Meaningful verification results.
- Coverage summary.
- Remaining submission actions.
- Optional Docker task and its actual status.

Remove or consolidate:
- Historical toolchain installation steps.
- SHA-256 checksums.
- Temporary development ports.
- Repeated lists of unchanged files.
- Excessively detailed subtest inventories.
- Redundant verification narration.

Do not erase important evidence or claim unexecuted tests passed.

If Docker has been completed, record the actual Docker build and runtime verification results.

## 4. docs/DESIGN.md — Technical design

Target approximately 90–120 lines.

Keep:
- Current architecture and component responsibilities.
- API contract and relevant error semantics.
- float64 precision policy.
- Calculator reducer states and important transitions.
- Async request lifecycle, cancellation, and stale-response protection.
- Frontend/backend boundaries.
- Testing strategy.
- Docker runtime architecture, if implemented.

Remove:
- Initial environment inspection history.
- Superseded architecture proposals.
- Repeated implementation progress reports.
- Historical task-by-task narratives.
- Information that is already clear from code or README.

Keep enough technical depth that an engineer can understand WHY the architecture works.

## 5. docs/DECISIONS.md — Architectural decisions

Target approximately 60–80 lines.

Preserve meaningful accepted architectural decisions and their trade-offs.

For each decision, use a concise format:
- Decision
- Rationale
- Important trade-off or alternative

Avoid detailed implementation history or repeated test reports.

Add a Docker decision if Dockerization was actually implemented.

Do not erase meaningful architectural decisions just to meet a line target.

## 6. AI_PROMPTS.md — Preserve prompt provenance

IMPORTANT: Do NOT shorten, rewrite, paraphrase, reorder, or delete existing recorded prompts.

Sezzle explicitly requested disclosure of AI prompts.

Preserve the actual prompt text and chronological order.

Append newly used prompts faithfully, including the Dockerization prompt and this documentation cleanup prompt when available.

Keep the disclosure accurate. Do not claim the file is a complete transcript if it is not.

## 7. Cross-document consistency

Check that all documentation agrees on:

- Project structure
- Development and Docker setup
- HTTP API contract
- Backend-only arithmetic
- Frontend state management
- Testing commands
- Coverage measurements and scope
- Deployment status
- Docker status
- Git repository/publication status

Verify links, filenames, commands, and referenced paths.

Do not leave stale statements such as "Docker is not implemented" if Docker was successfully added.

Do not claim public repository publication or deployment without verifying them.

Distinguish confirmed test results from historical results if any implementation changes could affect coverage.

## 8. Constraints

- Do not modify application logic or tests.
- Do not modify Docker infrastructure during this documentation-only task.
- Do not add dependencies.
- Do not commit or push automatically.
- Do not deploy.
- Avoid marketing language and exaggerated claims.
- Keep this proportional to a 2–4 hour take-home assignment.

## 9. Final verification and report

After the edits:

1. Check Markdown links and referenced files.
2. Verify all documented commands exist.
3. Review git diff for unintended changes.
4. Report line counts before and after for each documentation file.
5. Summarize major edits and removed redundancies.
6. Report any inconsistencies that could not be resolved.
7. Confirm AI_PROMPTS.md preserved existing prompt text.
8. Identify the remaining steps before GitHub publication.

Update documentation and task status appropriately.

Stop after this task and wait for approval.
````
