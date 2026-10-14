# Implementation plan and verification record

## Current task

**3.2 — React calculator UI and Go API integration: complete.** The user approved the combined UI/integration scope, superseding the earlier separate 3.2/3.3 proposal. Backend and reducer remain unchanged. Next proposed task: **5.1 — frontend behavior/coverage review**, awaiting approval.

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
- [x] **2.3 Implement REST calculation handler.** Approved and completed after 2.2.
  - Acceptance: shared handler wired into local server; existing request/status/error/header contract, full bounded input validation; httptest cases alongside code; README curl examples reflect real behavior.
  - Checks: gofmt/vet/tests, live requests for four operations and failure cases, no external Go dependencies or frontend arithmetic.

  - Verification (2026-10-14, Go 1.27.2 darwin/arm64): `gofmt -w internal/httpapi cmd/server` executed; `gofmt -l cmd internal` printed nothing. `go vet ./...`, `go test ./...`, `go test -race ./...`, `go build ./...`, and `go build -o bin/server ./cmd/server` all passed. Initial focused HTTP/server tests also passed.
  - HTTP tests: 60 request cases, 10 media-type cases, 7 method cases, 6 body-limit cases (4095/4096/4097 bytes with known/unknown length), 5 wrapped-error mappings, and a body-read failure/closure case. Assertions check statuses, JSON structure, safe messages, and response headers. Existing server tests now verify the actual calculation route and 404 behavior, including the trailing slash.
  - Coverage: `go test -count=1 -coverprofile=coverage/httpapi.out ./internal/httpapi` passed with **96.1% HTTP package statement coverage**. `go tool cover -func=coverage/httpapi.out` inspected the functions; `go tool cover -html=coverage/httpapi.out -o coverage/httpapi.html` generated the report. Uncovered statements: the safe marshal-failure fallback (2) and return after response-write failure (1). Current validated response types cannot trigger the marshal failure; a disconnected-client write failure cannot deliver a replacement response. No artificial cases were added to inflate coverage. This is statement, not branch/whole-backend coverage.
  - Real curl smoke: launched the compiled bin/server with PORT=61249. Used `curl --silent --show-error --max-time 5 -i -H 'Content-Type: application/json' --data-binary '<body>' http://127.0.0.1:61249/api/calculate`. Observed multiplication 12×5 → 200 `{"result":60}`; division 12/0 → 422 `{"error":{"code":"division_by_zero","message":"Cannot divide by zero."}}`; null a → 400 `{"error":{"code":"invalid_operand","message":"Operand a must be a finite JSON number."}}`. Also verified addition → 200/3.5, subtraction → 200/-3, and division → 200/0.25. JSON/no-store headers checked; server stopped after smoke tests.
  - Review: existing server reused; no new dependencies/interfaces/middleware; calculator files confirmed unchanged by SHA-256 before/after comparison. RawMessage plus pointer decoding preserves ordered validation and null/zero distinctions. Documented repeated Content-Type (415), read failures (400), and endpoint-only JSON envelope scope in D008.
  - Files: added internal/httpapi/handler.go and handler_test.go; updated internal/httpapi/doc.go, cmd/server/main.go and main_test.go, AGENTS.md, TASKS.md, README.md, docs/DESIGN.md, docs/DECISIONS.md, and AI_PROMPTS.md (verbatim Prompt 004). Generated HTTP coverage files and rebuilt bin/server are ignored.
  - Remaining: no task 2.3 blocker. Standard mux 404s and connection/panic failures do not promise the endpoint JSON envelope; graceful draining and frontend remain outside this task. No commit, push, or deployment performed.

- [x] **2.4 Backend review and approval (formerly proposed task 3.1).**
  - User confirmed that the focused read-only review is complete, with no blocking issues, and approved the backend. The prior review identified only an optional HTTP signed-zero assertion improvement; the core already checks signed zero. No backend changes were requested.
  - Existing executed backend checks and coverage are recorded under 2.2/2.3. The review did not rerun commands or edit files; do not interpret this approval as a new test execution. The old audit/coverage milestone is closed by the review and those existing verification records.

## 3. React keypad frontend with tests

Task numbers and boundaries below follow the user's latest Task 3.1 instruction, replacing the former 4.1/4.2 split. The former backend-review 3.1 is recorded above as 2.4.

- [x] **3.1 React setup and calculator state management.** Approved after backend review.
  - Acceptance: minimal React/TypeScript/Vite/Vitest setup; deterministic reducer for digits, decimal/sign editing, operator replacement, Clear/backspace, equals, reuse/new entry, pending/errors/retries/stale results. Emit a binary calculation request intent; never perform arithmetic locally. Meaningful sequence tests. No HTTP client/integration or final visual design; approved Go files unchanged.
  - Dependencies: React/React DOM 19.3.0; TypeScript 7.0.2; Vite 8.3.4; React plugin 6.1.2; Vitest 5.0.4; React/DOM/Node type declarations. Announced before installation; current registry engines/peers checked against Node 24.21.0 and npm 11.19.0. npm lockfile retained. React Testing Library, jsdom, and coverage tooling deferred until needed.
  - Verification (2026-10-14): `npm install` succeeded (46 packages added; audit reported zero vulnerabilities). `npm run typecheck` passed; `npm test` passed all **67 reducer tests** in one file; `npm run build` passed TypeScript and Vite production compilation. Tests use Node, no DOM, network, Go process, or arithmetic mock. No frontend coverage percentage is claimed.
  - Behavior: readonly discriminated states, exact API result reuse, string sign editing, no inferred second operand/repeated equals, pending actions blocked except Clear, monotonic IDs preserved on Clear, stale completions ignored, retry retains chaining intent while editing discards it. Scientific results cannot be corrupted by backspace. Digits that overflow a finite operand are ignored; decimal rounding/underflow follows the agreed number model.
  - Files created: package.json, package-lock.json, tsconfig.json, vite.config.ts, index.html, src/main.tsx, src/App.tsx, src/calculator.ts, src/calculator.test.ts. Updated: AGENTS.md, TASKS.md, README.md, docs/DESIGN.md, docs/DECISIONS.md, AI_PROMPTS.md. Existing ignore rules already cover node_modules and dist.
  - Scope: App is an unstyled setup placeholder; reducer has no React/network imports. API proxy/client, effects, AbortController/timeout behavior, keypad, keyboard and browser integration tests remain future tasks. All 9 Go source/test/module files were confirmed unchanged by before/after SHA-256 comparison. npm reported a pre-existing user-config warning for `python`; installation and all checks succeeded, and user configuration was not modified. No commit, push, or deployment. See README for reproducible commands.
- [x] **3.2 React calculator UI and Go API integration.** Approved after 3.1; includes the previously proposed 3.3 keypad task.
  - Acceptance: finished responsive keypad with number/expression displays, accessible controls, focus states, mouse/touch/keyboard support, all calculations via the existing Go API. Typed relative-path client, Vite proxy to localhost:8080, finite response validation, safe errors, 10-second timeout, AbortController cancellation, duplicate prevention and stale-response protection. Preserve the approved reducer and backend.
  - Dependencies: announced and added only dev dependencies: React Testing Library 16.3.3, DOM Testing Library 10.4.2 (peer), user-event 14.6.8, jest-dom 7.0.1, jsdom 30.1.2. Engines now reflect jsdom's minimum supported Node versions; verified using Node 24.21.0/npm 11.19.0. Installation added 60 packages and reported zero vulnerabilities. npm reports the existing `python` config warning and an optional fsevents install-script notice; neither prevented checks and no global configuration was changed.
  - Verification (2026-10-14): `npm run typecheck`, `npm test`, and `npm run build` passed. **121 tests across 3 files:** original 67 reducer cases unchanged, 32 API-client tests and 22 component/interaction cases. Tests cover all operation payloads, accessible controls, native Enter/Space and Tab, keyboard/touch, operator replacement/chaining/reuse, errors/retry, malformed/non-JSON/non-finite responses, loading/duplicate prevention under StrictMode, timeout including body-read time, Clear/stale success and failure, and unmount cancellation. Initial typecheck found a Testing Library option and missing CSS declaration; both corrected before passing checks.
  - Live integration: 8080 was occupied by this project's existing Go server (process cwd verified), which was reused. 5173 belonged to another project's Vite process and was left untouched. Started this project's Vite at `http://127.0.0.1:5174/`. Browser keypad 12×5 displayed **60**; keyboard 12+5 displayed **17**; 8÷0 displayed the safe division-by-zero alert, then editing the right operand to 2 displayed **4**. Browser 0.1+0.2 displayed the complete **0.30000000000000004** value.
  - Proxy evidence: real curl POSTs through Vite's `/api/calculate` returned **200** / `{"result":60}` and **422** / `{"error":{"code":"division_by_zero","message":"Cannot divide by zero."}}`. The initial attempt to start another Go server on 8080 failed because the existing instance was already listening; no claim of launching a second backend instance is made.
  - Visual checks: inspected desktop 1280×960 and mobile 320px-wide layouts in the Codex in-app browser. At 320px, document width remained 320px, all keypad targets measured at least 59px high, and long results remained fully rendered. Full-page screenshots are in ignored `coverage/screenshots/desktop.jpg` and `mobile.jpg`. Viewport override reset after testing. Physical-device and broader browser/screen-reader testing have not been performed.
  - Files created: src/api.ts, src/api.test.ts, src/App.test.tsx, src/styles.css, src/vite-env.d.ts. Modified: src/App.tsx, vite.config.ts, package.json, package-lock.json, AGENTS.md, TASKS.md, README.md, docs/DESIGN.md, docs/DECISIONS.md, AI_PROMPTS.md (verbatim Prompt 007).
  - Boundaries: all 11 approved Go/module/reducer/test files confirmed unchanged by before/after SHA-256; Go tests were not rerun because backend files were unchanged. No frontend coverage report or percentage is claimed in this task. This Vite preview remains running on 5174; the pre-existing Go and unrelated Vite processes were not stopped. No commit, push, or deployment. No blocking issue remains for 3.2.

The former proposed **3.3 polished keypad** is absorbed into completed 3.2, not an outstanding implementation task.

## 5. Frontend verification

- [ ] **5.1 Audit behavior and generate reports.** Depends on 3.2.
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
