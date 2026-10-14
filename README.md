# Sezzle Calculator

A full-stack calculator take-home using Go and React/TypeScript. **Current status: working React calculator connected to the approved Go backend.** The responsive keypad supports mouse, touch, keyboard, result reuse, and sequential binary operations. POST /api/calculate performs all arithmetic and returns structured errors. Deployment is optional.

Stack: React, TypeScript, Vite and plain CSS; Go standard-library HTTP/JSON; Vitest, React Testing Library and Go testing/httptest. Runtime frontend dependencies are React and React DOM; Go has no external dependencies.

## Requirements and setup

Go **1.27.2** is declared in go.mod and was verified on macOS arm64. Install Go using the [official instructions](https://go.dev/doc/install); the [official download manifest](https://go.dev/dl/?mode=json) identified this stable version during setup on 2026-10-14. There are no third-party Go dependencies and no go.sum is needed.

For this workspace, the official archive was SHA-256 verified and installed outside the repository at `~/.local/share/sezzle-toolchains/go1.27.2`. No shell startup files were changed. To use that installation in a terminal:

```sh
export PATH="$HOME/.local/share/sezzle-toolchains/go1.27.2/bin:$PATH"
go version
```

Other machines can use a normal Go installation on PATH. Frontend setup was verified with **Node 24.21.0 and npm 11.19.0**. Use a Node version satisfying package.json's engines (Node 24 is recommended for reproducing this setup).

Install the locked frontend dependencies:

```sh
npm ci
```

Start Go and Vite in separate terminals as shown below. All calculation requests use relative `/api/calculate` URLs; Vite proxies `/api` to `http://localhost:8080`. The frontend tests mock fetch and do not require a running server.

```sh
npm run typecheck
npm test
npm run build
```

Final QA passed **121 tests** (67 reducer, 32 API client, 22 React interaction cases), type checking, and the production build. `npm run test:watch` is available during development. Pure reducer/API tests use Node; component tests use jsdom, React Testing Library and user-event. `npm run preview` previews built assets locally; it is not a production hosting setup.

## Run locally

In terminal 1, from the repository root:

```sh
go run ./cmd/server
```

The server listens on `:8080` (all network interfaces). Set PORT to an integer from 1 through 65535 to override it:

```sh
PORT=9000 go run ./cmd/server
```

An unset or empty PORT uses 8080. Invalid values fail before listening with a clear error. Stop with Ctrl+C. The scaffold sets header/read/write/idle timeouts to 5/10/10/60 seconds. Graceful draining is not implemented.

In terminal 2, from the same directory:

```sh
npm run dev
```

Open the URL Vite prints (normally `http://localhost:5173`; it selects another port if occupied). Keep Go on 8080 for the configured proxy; if you change PORT, update the target in vite.config.ts too. Stop Vite with Ctrl+C. The frontend build creates dist/; production hosting/routing is deliberately undecided.

Final QA launched a fresh Go server on 18080 and Vite on 5175 with a temporary proxy configuration (the existing 8080/5174 preview was left running). Actual browser checks exercised all four operations, negative/fractional entry, result reuse, Clear/Backspace/operator replacement, division-by-zero feedback and recovery. Proxy curl requests returned 200/result 60, 422/division_by_zero and 400/invalid_operand. A 320px layout had no horizontal overflow and keypad targets were at least 59px high.

## Using the calculator

Click/tap the keys or type while focus is inside the calculator. Digits, `.`, `+`, `-`, `*`, `/`, Enter and `=` work as expected. Backspace edits, Escape/Delete clears, and F9 toggles the sign. Tab navigates controls; Enter/Space on a focused button activates that button once. Browser modifier shortcuts and unrelated controls are left alone. Shortcuts are also documented in the page.

Select another operator before entering the second number to replace it. Equals without a second number, or repeated equals after a result, does nothing. A digit after a result starts fresh; an operator reuses it. Chaining is left-to-right, one Go request per binary pair. Decimal results retain native floating-point precision, including scientific notation; they are not silently rounded.

While calculating, editing and duplicate submissions are blocked and **AC stays available**. Clear/unmount cancels the request; stale responses cannot restore old state. Requests time out after 10 seconds. Errors use safe, local messages; press equals to retry the pair, edit the right operand, or clear. Backend error bodies/diagnostics are never shown verbatim.


## REST API and curl examples

Use `POST /api/calculate` with one JSON object containing operation, a, and b. Operations are `add`, `subtract`, `multiply`, and `divide`; operands must be finite JSON numbers. These examples were exercised against the compiled local server (an available test port was used during verification). With the default server running on 8080:

```sh
curl -i -H 'Content-Type: application/json' \
  --data-binary '{"operation":"multiply","a":12,"b":5}' \
  http://localhost:8080/api/calculate
```

HTTP **200**:

```json
{"result":60}
```

```sh
curl -i -H 'Content-Type: application/json' \
  --data-binary '{"operation":"divide","a":12,"b":0}' \
  http://localhost:8080/api/calculate
```

HTTP **422**:

```json
{"error":{"code":"division_by_zero","message":"Cannot divide by zero."}}
```

```sh
curl -i -H 'Content-Type: application/json' \
  --data-binary '{"operation":"add","a":null,"b":5}' \
  http://localhost:8080/api/calculate
```

HTTP **400**:

```json
{"error":{"code":"invalid_operand","message":"Operand a must be a finite JSON number."}}
```

The endpoint returns `Content-Type: application/json`, `Cache-Control: no-store`, and `X-Content-Type-Options: nosniff`. Non-POST requests return 405 and `Allow: POST`; HEAD has no response body. Missing/invalid/repeated Content-Type returns 415. A parsed application/json media type may include parameters such as charset=utf-8.

The body cap is **4,096 bytes**, including trailing whitespace; larger bodies return 413. Malformed JSON, unknown fields, non-object bodies, and additional JSON values return 400/invalid_json. Missing/null/wrong-type operands return 400/invalid_operand, while zero is valid. Unsupported operations return 400/invalid_operation. Division by signed zero and arithmetic overflow return 422 with division_by_zero or result_out_of_range. Unexpected returned errors use a safe 500/internal_error envelope without internal diagnostics.

Validation proceeds through method, media type, full body size/read, JSON structure, operation, a, then b. Field names follow standard Go case-insensitive matching, and the final duplicate field value wins (including null). Unknown paths and `/api/calculate/` return the standard net/http 404 rather than the endpoint JSON envelope. No frontend page is served by Go; Vite serves the calculator UI. See the [full contract](docs/DESIGN.md#api-contract).

## Build and test

```sh
go build ./...
go build -o bin/server ./cmd/server
go test ./...
go test -race ./...
go vet ./...
gofmt -l cmd internal
```

The formatter check should print nothing. Tests cover server configuration/routing, arithmetic edge cases, HTTP validation/envelopes/headers, body-size boundaries, wrapped sentinel error mapping, reducer sequences and React/API request lifecycles. Automated suites are deterministic and independent of external services. Generate reproducible coverage reports from the repository root:

```sh
npm run test:coverage
mkdir -p coverage/backend
go test -count=1 -coverprofile=coverage/backend/coverage.out ./...
go tool cover -func=coverage/backend/coverage.out
go tool cover -html=coverage/backend/coverage.out -o coverage/backend/index.html
```

Frontend text, HTML, LCOV and JSON-summary reports are written to `coverage/frontend/` (open `coverage/frontend/index.html`). Backend HTML is `coverage/backend/index.html`. All generated reports are ignored by Git; reviewers regenerate them with the commands above.

Final QA measured the following on 2026-10-14:

| Scope | Statements | Branches | Functions | Lines |
| --- | --- | --- | --- | --- |
| Frontend application logic (3 files) | 99.34% | 98.23% | 100% | 100% |
| Frontend reducer | 100% | 100% | 100% | 100% |
| Frontend API client | 100% | 100% | 100% | 100% |
| Frontend React component | 98.46% | 95.89% | 100% | 100% |
| Whole Go backend | 91.4% | — | — | — |
| Go calculator package | 100.0% | — | — | — |
| Go HTTP package | 96.1% | — | — | — |
| Go server package | 50.0% | — | — | — |

Frontend coverage includes handwritten src TS/TSX application logic, including files not imported by tests. It excludes test files, declaration-only files, and the mounting-only `main.tsx`; CSS, HTML and tool configuration are outside this executable-code metric. It is not whole-repository or browser/device coverage. Go's total is weighted statement coverage across all three packages, including main; Go does not report branch coverage here.

Reviewed gaps: App's defensive cancelled-success, non-Error fallback and unrelated-input keyboard guard branches; Go process startup/fatal exits, the HTTP serialization fallback and return after a connection-write failure. Existing tests already verify request cancellation/stale results, while real browser/server checks exercise startup and mounting. No artificial tests or coverage threshold were added. See TASKS.md for the full verification record.

## Calculator package API

```go
func Calculate(operation string, a, b float64) (float64, error)
```

Import `sezzle-calculator/internal/calculator` from within this module. Supported names are exactly `add`, `subtract`, `multiply`, and `divide`; subtraction and division use a as the left operand. The function is stateless and returns zero on error. Callers can use `errors.Is` with these sentinel errors rather than matching message strings:

| Error | Condition |
| --- | --- |
| `ErrUnsupportedOperation` | Unknown, empty, differently cased, or whitespace-padded operation |
| `ErrNonFiniteOperand` | Either operand is NaN or positive/negative infinity |
| `ErrDivisionByZero` | Division by either sign of zero |
| `ErrNonFiniteResult` | Arithmetic produces a non-finite result (including overflow) |

Validation order is operation, operands, then arithmetic-specific checks. Successful results retain native float64 rounding, including integer precision limits and underflow to zero. Zero results are normalized to positive zero; tiny nonzero operands/results remain valid. No decimal rounding, epsilon-based zero check, HTTP types, or third-party libraries are involved.

## Structure and rationale

- `cmd/server`: process entry point, configuration, and explicit net/http server with its own ServeMux.
- `internal/calculator`: stateless arithmetic and numeric validation, tested through its exported API.
- `internal/httpapi`: NewHandler() assembles routes; private functions handle bounded request parsing, validation, calculator calls, and JSON responses.

`internal` keeps implementation packages private to this module tree. An explicit mux avoids global route registration. The unexported server constructor returns a server and error so configuration is testable without opening a socket; main owns environment access, logging, and listening. No application-specific interfaces or framework are needed.

The local module name `sezzle-calculator` avoids inventing a public Git destination. Git is initialized locally on master, with no remote configured at final QA. A public destination must be selected before submission; adopting its canonical module path then is optional for this executable project. Frontend code lives in src/: App.tsx owns the keypad and request effect, calculator.ts owns pure transitions, api.ts owns transport/validation/cancellation, and styles.css owns presentation. No hosting adapter/configuration is included.

## Calculator reducer

`src/calculator.ts` exports `calculatorReducer`, `initialState`, and the action/state/request types. App.tsx uses it with React's `useReducer`. It has six explicit states: firstEntry, operatorSelected, secondEntry, pending, result, and error.

Digits stay as text for decimal/sign/backspace editing. Selecting an operator saves the left operand; selecting another operator before entering the right operand replaces it. Equals with a right operand emits `pending.submission.request` containing `{ operation, a, b }`. An effect sends that request to Go and dispatches `resolved` or `rejected` with the submission ID; cleanup aborts the old effect. The reducer performs no calculation and initiates no network work.

Results retain the exact returned number. A following operator reuses it; a digit or decimal starts fresh. Equals without a right operand or after a result does nothing. Selecting an operator after the second operand requests the current pair and saves the next operator for left-to-right chaining. Clear resets entry while preserving request identity progression; pending edits are blocked, and stale completions are ignored. API errors support retry or editing the right operand. Full edge behavior and scope are in [DESIGN.md](docs/DESIGN.md#explicit-state-model).

## Assumptions and known limitations

- Calculations use float64: decimal rounding, integers beyond 2^53 and underflow follow native binary floating-point behavior. Returned values are displayed without hidden rounding.
- Sequential binary calculations run left-to-right. There is no general expression parser, precedence, repeated-equals operation, history or persistence.
- Keyboard shortcuts operate while focus is inside the calculator. Enter/Space on a focused keypad button activate that button; Backspace outside the panel is not captured.
- A running Go API is required for arithmetic. Failed requests are retryable; Clear cancels pending UI work. Cancellation cannot guarantee the server has not already completed a request.
- Production hosting and API routing are not configured. Go serves the API; Vite serves the frontend locally. No deployment is required under the revised scope.
- Graceful server draining is not implemented. Physical-device, cross-browser and screen-reader testing remain manual checks; accessible names, focus, keyboard semantics and responsive dimensions were verified in tests/the in-app browser.
- Final QA found no functional submission blocker. The original supplied assignment requires a public Git repository; publication and public-readability verification remain pending approval. No separate employer assignment document was supplied beyond the original project prompt recorded in AI_PROMPTS.md.

## AI assistance

OpenAI Codex assisted with planning, implementation, tests, review and verification. [AI_PROMPTS.md](AI_PROMPTS.md) preserves significant user prompts with provenance and explicitly describes the log's limits; it is not a complete transcript. The developer reviewed the architecture/backend/reducer and manually exercised the application.

## Project records

- [TASKS.md](TASKS.md): approved scope, acceptance criteria, and executed verification.
- [docs/DESIGN.md](docs/DESIGN.md): accepted API/numeric policy and implemented keypad state transitions.
- [docs/DECISIONS.md](docs/DECISIONS.md): accepted/revised decisions and trade-offs.
- [AI_PROMPTS.md](AI_PROMPTS.md): faithful scoped AI prompt disclosure.
- [AGENTS.md](AGENTS.md): persistent engineering workflow.
