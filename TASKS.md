# Implementation plan and verification record

## Current task

**2.2 — Calculation core: complete.** Stopped at the approved boundary. Next proposed task: **2.3 — REST calculation handler**, awaiting explicit approval. HTTP and frontend remain pending.

Each implementation checkbox is a separate approval boundary. Read AGENTS.md and relevant design documentation, implement only the approved scope, add relevant tests, record actual checks, update documentation/prompt disclosure, then stop. The original 2–4 hour budget remains a scope guide; keypad behavior adds work, and review/toolchain setup time is separate. Do not sacrifice required behavior to meet an estimate.

## 1. Architecture and API contract

- [x] **1.1 Inspect and propose the design.**
  - Acceptance: inspect workspace/tools, research original deployment proposal, document architecture/API/edges/UI/testing/risks, and preserve the initial prompt without implementing.
  - Verification (2026-10-14): workspace initially empty and not a Git repository; Node v24.21.0/npm 11.19.0/Git 2.38.1 available, Go absent from PATH. Original planning documentation checks passed. No application tests ran in that task.
- [x] **1.2 Revise the plan following user review.**
  - Acceptance: retain accepted backend contract/float64/stdlib architecture, replace form with keypad and explicit state transitions, make deployment optional, remove numeric coverage gates, split scaffold from arithmetic, log the actual user prompt.
  - Verification: AGENTS.md, DESIGN.md, DECISIONS.md, and this plan updated; decisions marked accepted/revised. API and arithmetic policy retained. Prompt 002 records the revision/setup request.

## 2. Go backend with tests

- [x] **2.1 Initialize module and local server scaffold.** Depends on 1.2; approved.
  - Acceptance: verify/make available Go, initialize one module, create cmd/server and documentation-only internal/calculator and internal/httpapi packages; local HTTP server scaffold with PORT validation and finite timeouts; README setup/build/run instructions; minimal configuration and routing tests. No arithmetic or calculation handler, frontend, deployment adapter, or added Go library dependencies.
  - Checks: record go version, gofmt, go vet, go test (including race check if supported), go build, and a real local server smoke request. Confirm /api/calculate remains unimplemented (404). Record limitations and changed files before marking complete.
  - Verification (2026-10-14): official Go 1.27.2 darwin/arm64 archive installed at ~/.local/share/sezzle-toolchains/go1.27.2; SHA-256 matched `76812b213b1b2302c978d28fa52fa92d541704b9e7d9d5db8002c50e4018c4c5`. No shell profile changes. Commands used the installation's bin directory on PATH.
  - Passed: `go version`; `go mod tidy`; `go test ./...`; `go test -race -v ./...` (2 tests, 13 subtests); `go vet ./...`; `go build ./...`; `go build -o bin/server ./cmd/server`. `gofmt -l cmd internal` produced no output. `go list -m all` listed only sezzle-calculator, confirming no module dependencies.
  - Live smoke: launched bin/server with PORT=60931, sent POST /api/calculate with a valid-shaped JSON body, and verified 404/plain-text unimplemented response; stopped the process. A separate run with PORT=invalid exited nonzero with the expected message. Python drove these process/HTTP checks; no test server remains running.
  - Files created: go.mod, .gitignore, README.md, cmd/server/main.go, cmd/server/main_test.go, internal/calculator/doc.go, internal/httpapi/doc.go. Files updated: AGENTS.md, TASKS.md, docs/DESIGN.md, docs/DECISIONS.md, AI_PROMPTS.md. Generated bin/server is ignored.
  - Remaining: internal packages contain only package documentation, so they have no tests yet; no arithmetic, API handler, frontend, graceful draining, Git initialization, or deployment. Those are outside this task. Setup/toolchain/build verification has no outstanding blocker.
- [x] **2.2 Implement calculation core.** Approved and completed after 2.1.
  - Acceptance: four operations and accepted float64/error policy; table-driven tests for order, zero/negative/fractional operands, division by signed zero, unsupported operations, non-finite inputs/results, precision and underflow. Arithmetic package has no HTTP dependencies.
  - Checks: gofmt, go vet, tests and core coverage report; inspect meaningful uncovered paths; explain explicit Go errors.
  - Verification (2026-10-14, Go 1.27.2 darwin/arm64): ran `gofmt -w internal/calculator`; `gofmt -l cmd internal` printed nothing. `go vet ./...`, `go test ./...`, and `go test -race ./...` all passed. The core contains 53 table-driven subtests; existing server tests also pass; httpapi still has no test files.
  - Coverage: `go test -count=1 -coverprofile=coverage/calculator.out ./internal/calculator` passed with **100.0% calculator statement coverage**. `go tool cover -func=coverage/calculator.out` confirmed it; `go tool cover -html=coverage/calculator.out -o coverage/calculator.html` generated the HTML report. This is calculator-package statement coverage, not whole-backend or branch coverage; no percentage gate was used.
  - Review: verified one exported function plus four sentinel errors, errors.Is-based tests, no interfaces/dependencies or transport coupling; `go list -f '{{.ImportPath}}: {{join .Imports ", "}}' ./internal/calculator` reported only errors and math. Reviewed operation/operand error precedence, exact signed-zero handling, overflow/underflow, subnormal preservation, and precision cases. Kept two small switches for explicit validation order rather than adding an operation registry/type; documented the defensive result-NaN guard in D007.
  - Files: added internal/calculator/calculator.go and calculator_test.go; updated internal/calculator/doc.go, AGENTS.md, TASKS.md, README.md, docs/DESIGN.md, docs/DECISIONS.md, and AI_PROMPTS.md (verbatim Prompt 003). Coverage reports are generated/ignored. No server or HTTP package code changed.
  - Remaining: no arithmetic blockers. HTTP mapping/handler and frontend remain unimplemented; next task 2.3 requires approval.
- [ ] **2.3 Implement REST calculation handler.** Depends on 2.2 and approval.
  - Acceptance: shared handler wired into local server; existing request/status/error/header contract, full bounded input validation; httptest cases alongside code; README curl examples reflect real behavior.
  - Checks: gofmt/vet/tests, live requests for four operations and failure cases, no external Go dependencies or frontend arithmetic.

## 3. Backend verification

- [ ] **3.1 Audit HTTP/numeric edge cases and publish coverage instructions.** Depends on 2.3.
  - Acceptance: cover the design's contract matrix, size/trailing-data boundaries, missing/null/zero, duplicate/case behavior, overflow/underflow, methods/media types, and unknown routes. Generate text/HTML coverage and review meaningful gaps, with no arbitrary percentage gate.
  - Checks: go vet, go test -race, coverage commands; record actual results and uncovered limitations.

## 4. React keypad frontend with tests

- [ ] **4.1 Establish Vite/React/TypeScript and typed API client.** Depends on 3.1.
  - Acceptance: announce compatible dependencies before installation (React/DOM, TypeScript/Vite/plugin/types, Vitest/RTL/user-event/jest-dom/jsdom/V8 coverage), commit lockfile later, local API proxy, typed response validation, network/error/timeout/cancellation tests. No UI/state/router framework.
  - Checks: typecheck, build, test run, real proxy request against Go; README two-terminal startup.
- [ ] **4.2 Implement reducer and polished calculator keypad.** Depends on 4.1.
  - Acceptance: numeric/expression displays, conventional keypad and required controls, all DESIGN.md transitions, result reuse and left-to-right binary chaining via API, keyboard/a11y/focus, responsive typography/spacing/button states, loading/error feedback. Test transitions and interaction sequences alongside implementation; no JS arithmetic/parser.
  - Checks: reducer/component/API integration tests, typecheck/build; real-backend keyboard and 320px/desktop smoke, long/scientific results, pending Clear, stale responses, retry and new calculation.

## 5. Frontend verification

- [ ] **5.1 Audit behavior and generate reports.** Depends on 4.2.
  - Acceptance: meaningful coverage of keypad sequences, state transitions, API integration, keyboard input, async/error handling; text/HTML/LCOV reports and documented exclusions; fix regressions. No percentage gate.
  - Checks: full frontend suite, typecheck/build, real API/browser smoke; record remaining gaps honestly.

## 6. Required submission and public repository

- [ ] **6.1 Final documentation, reproducibility, and public repository.** Depends on 5.1; requires task approval and repository destination/account access.
  - Acceptance: README actual setup/API examples/design rationale/precision limits/testing and coverage; faithful scoped AI prompt log; initialize Git, review tracked files, commit/push public repository, verify public readability. Deployment is not required for completion.
  - Checks: fresh-checkout setup/build/run/test, full Go/frontend suites and reports, public URL/commit and submission checklist recorded.

## 7. Optional deployment (not a required submission dependency)

- [ ] **7.1 Select hosting and deploy only if separately approved.** Depends on 6.1 and user choice to deploy.
  - Acceptance: research chosen platform/runtime, document trade-offs, add only necessary configuration/adapters, preserve independent local operation, verify deployment URL and access.
  - Checks: selected platform build, live UI/API success and failure requests, no API-to-HTML routing mistakes. May remain pending without blocking required submission.

## Verification records

Append date, actual commands/results, changed files, and limitations to each task. Never mark completion without satisfied criteria. Record faithful user prompts chronologically in AI_PROMPTS.md. Optional history/memory/CI/extra operations require later approval; the keypad is required.
