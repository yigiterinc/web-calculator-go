# Tasks and verification record

## Current status

**6.2 — Documentation cleanup: complete.** Application QA and optional Dockerization are complete. Public repository publication remains pending approval; no deployment, commit or push is authorized by this task.
Each task requires approval, appropriate checks, accurate documentation and faithful prompt logging. Stop after the approved task. The original 2–4 hour assignment remains the scope guide.

## 1. Architecture

- [x] **1.1 Design proposal.** Acceptance: define package boundaries, API, numeric policy and verification plan.
- [x] **1.2 Approved revisions.** Acceptance: standard-library Go, float64, traditional keypad/reducer, backend-only arithmetic and optional deployment. See docs/DECISIONS.md.

## 2. Go backend

- [x] **2.1 Server setup.** Acceptance: one Go module, cmd/server and internal packages, validated PORT and finite HTTP timeouts. Setup/build/routing checks passed.
- [x] **2.2 Calculator core.** Acceptance: four operations, sentinel errors, finite values, signed-zero division and numeric edge tests; no HTTP dependencies. Core tests passed with 100% statement coverage.
- [x] **2.3 REST API.** Acceptance: bounded strict JSON parsing, required operands, consistent status/error/header mapping and existing server wiring. Handler tests and real success/error requests passed.
- [x] **2.4 Backend review.** Acceptance: focused Go correctness/simplicity review. User approved the backend; no blocking issue identified.

## 3. React frontend and final QA

- [x] **3.1 Reducer setup.** Acceptance: React/TypeScript/Vite/Vitest; pure entry/operator/result/pending/error transitions and request intents without arithmetic. All 67 reducer tests passed.
- [x] **3.2 UI and API integration.** Acceptance: responsive accessible keypad, keyboard input, relative typed client, proxy, timeout/cancellation and stale-response handling. All 121 frontend tests, type checking and build passed.
- [x] **3.3 Final QA.** Acceptance: supplied assignment review, full checks, coverage, real integration, README/prompt disclosure and repository inspection. No functional blocker found.
- [x] **5.1 Behavior/coverage review.** Completed within 3.3; no separate task remains.

## 6. Submission

- [x] **6.2 Documentation cleanup.** Acceptance: concise current documentation, verified links/commands, preserved existing prompt text and no code/test/infrastructure changes. Completed 2026-10-15; Markdown/reference checks and diff review passed. No application tests were rerun for this documentation-only task.
- [ ] **6.1 Public repository.** Acceptance: review changes, choose a public destination, commit/push with approval, verify public readability and record URL/commit. Local Git exists on master; no remote is configured. The required public repository is the remaining delivery step.

## 7. Optional deliverables

- [ ] **7.1 External deployment.** Acceptance: separately approved hosting, TLS/routing configuration and live verification. Not required for submission.
- [x] **7.2 Dockerization.** Acceptance: Node/Go multi-stage build, non-root minimal runtime, same-origin UI/API, static route tests, ignore rules, real build/run and cleanup. Completed and verified; see evidence below.

## Executed verification

Results below were executed on 2026-10-14, before the documentation-only cleanup. Go 1.27.2 and Node 24.21.0/npm 11.19.0 were used locally.

- Go: gofmt applied; formatting check printed nothing. go vet ./..., go test ./..., go test -race ./... and go build ./... passed after Dockerization.
- Frontend: npm ci, npm run typecheck, npm test, npm run build and npm run test passed during QA. Type checking, 121 tests across three files and build passed again after Dockerization.
- Coverage: npm run test:coverage passed during QA; whole-backend coverage and HTML generation passed after Dockerization. Historical QA reports remain available locally under ignored coverage/.
- Browser/API: all four operations, decimal/negative entry, reuse, Clear, Backspace, operator replacement and division-by-zero recovery passed through actual Go/Vite integration.
- Accessibility/layout: accessible control names and native keyboard behavior tested; browser checked desktop and 320px layout, no horizontal overflow, minimum key height 59px and visible 3px focus outline. Physical devices, additional browsers and screen readers remain manual checks.
- Async/error behavior: focused tests cover loading, duplicate prevention, timeout, Clear/unmount cancellation, stale success/failure, malformed responses, HTTP and network failures.

## Coverage scope and results

| Measurement | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Backend after Dockerization | 92.3% | — | — | — |
| Calculator package | 100.0% | — | — | — |
| HTTP package | 96.2% | — | — | — |
| Server package | 70.0% | — | — | — |
| Frontend final QA | 99.34% | 98.23% | 100% | 100% |

The backend total includes all packages and main; Go reports statement coverage. Frontend metrics include App, reducer and API client, excluding tests/declarations/main.tsx and non-TS assets/configuration. Reducer and client each measured 100% on all four metrics.
Before static serving, QA backend coverage was 91.4% total, HTTP 96.1%, server 50%; calculator was 100%. Those are historical figures, superseded by the Dockerization profile for current Go code.
Reviewed gaps: process startup/fatal exits, HTTP serialization/write failure paths, and defensive App cancellation/error/keyboard guards. No arbitrary threshold or artificial tests were added.
Reproduce with README commands. Existing Dockerization profile is coverage/dockerization.out/.html; QA frontend text/HTML/LCOV/JSON-summary reports are in coverage/frontend/.

## Docker verification

- docker build completed using Node 24.21.0-alpine3.23 and Go 1.27.2-alpine3.23; npm ci/build and CGO-disabled Go compilation ran inside the stages.
- Final scratch image: Linux ARM64, 2,693,542 bytes (~2.69 MB), UID/GID 65532; only the Go process runs. Image build does not execute tests.
- Container GET / and generated JS/CSS returned 200; browser keypad 12×5 displayed 60. POST calculation returned 200/result 60, division by zero 422, null operand 400 and GET calculation 405 with Allow: POST.
- Unknown API/page paths and missing assets returned 404 without frontend HTML. Static routing/configuration tests and original API tests passed; API-only local mode is preserved.
- Test containers were stopped/removed. Built image remains local; no image publication or external deployment occurred. Other architectures remain untested.

## Submission checklist

The supplied original assignment is preserved as Prompt 001; no separate employer brief was supplied.
React/TypeScript + Go, four operations, validation/errors, responsive UI, tests/coverage, setup/API/design documentation and AI disclosure are complete. The only required delivery item still pending is a publicly readable repository.
Generated dependencies, builds, binaries and coverage are ignored; focused tracked-file review found no suspected credentials. No commit, push or deployment was performed by the QA, Docker or cleanup tasks.
