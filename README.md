# Sezzle Calculator

A full-stack calculator take-home using Go and React/TypeScript. **Current status: backend approved; frontend scaffold and pure calculator reducer implemented.** POST /api/calculate supports four arithmetic operations with input validation and structured JSON errors. The keypad and frontend API connection remain pending. Deployment is optional.

## Requirements and setup

Go **1.27.2** is declared in go.mod and was verified on macOS arm64. Install Go using the [official instructions](https://go.dev/doc/install); the [official download manifest](https://go.dev/dl/?mode=json) identified this stable version during setup on 2026-10-14. There are no third-party Go dependencies and no go.sum is needed.

For this workspace, the official archive was SHA-256 verified and installed outside the repository at `~/.local/share/sezzle-toolchains/go1.27.2`. No shell startup files were changed. To use that installation in a terminal:

```sh
export PATH="$HOME/.local/share/sezzle-toolchains/go1.27.2/bin:$PATH"
go version
```

Other machines can use a normal Go installation on PATH. Frontend setup was verified with **Node 24.21.0 and npm 11.19.0**. Use a Node version satisfying package.json's engines (Node 24 is recommended for reproducing this setup).

Install the locked frontend dependencies and run the setup page:

```sh
npm ci
npm run dev
```

Vite prints the local URL. The page is deliberately an unstyled placeholder: the reducer is implemented and tested, but no keypad or API requests are connected yet. No Go process is needed for this task's frontend tests or page. The Vite API proxy will be added with integration.

```sh
npm run typecheck
npm test
npm run build
```

Task 3.1 passed all 67 reducer tests and the production build. `npm run test:watch` is available during development; `npm run preview` serves the built setup page. Tests currently run in Node without browser/network dependencies. Component, keyboard, fetch, cancellation, and coverage tooling follow in their implementation tasks.

## Run locally

From the repository root:

```sh
go run ./cmd/server
```

The server listens on `:8080` (all network interfaces). Set PORT to an integer from 1 through 65535 to override it:

```sh
PORT=9000 go run ./cmd/server
```

An unset or empty PORT uses 8080. Invalid values fail before listening with a clear error. Stop with Ctrl+C. The scaffold sets header/read/write/idle timeouts to 5/10/10/60 seconds. Graceful draining is not implemented.

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

Validation proceeds through method, media type, full body size/read, JSON structure, operation, a, then b. Field names follow standard Go case-insensitive matching, and the final duplicate field value wins (including null). Unknown paths and `/api/calculate/` return the standard net/http 404 rather than the endpoint JSON envelope. No frontend page is served by Go; Vite serves the separate setup page. See the [full contract](docs/DESIGN.md#api-contract).

## Build and test

```sh
go build ./...
go build -o bin/server ./cmd/server
go test ./...
go test -race ./...
go vet ./...
gofmt -l cmd internal
```

The formatter check should print nothing. Tests cover server configuration/routing, arithmetic edge cases, HTTP validation/envelopes/headers, body-size boundaries, and wrapped sentinel error mapping. They use only the standard library and no external services. Generate package-specific coverage with:

```sh
mkdir -p coverage
go test -count=1 -coverprofile=coverage/calculator.out ./internal/calculator
go tool cover -func=coverage/calculator.out
go tool cover -html=coverage/calculator.out -o coverage/calculator.html
go test -count=1 -coverprofile=coverage/httpapi.out ./internal/httpapi
go tool cover -func=coverage/httpapi.out
go tool cover -html=coverage/httpapi.out -o coverage/httpapi.html
```

Reports are generated under the ignored coverage/ directory. Task 2.3 measured **96.1% HTTP package statement coverage**. The uncovered paths are the defensive serialization fallback and response-write failure after headers are committed; current validated response types do not trigger serialization failure, and disconnected-client delivery cannot be repaired with another response. Coverage is diagnostic, with no percentage gate; see TASKS.md for executed results and scope.

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

The local module name `sezzle-calculator` avoids inventing a public Git destination. A remote can be selected at the submission milestone; adopting its canonical module path then is optional for this executable project. Frontend setup and reducer source live in src/, with the keypad and API execution still pending. No hosting adapter/configuration is included.

## Calculator reducer

`src/calculator.ts` exports `calculatorReducer`, `initialState`, and the action/state/request types. Use the reducer with React's `useReducer` when connecting the UI. It has six explicit states: firstEntry, operatorSelected, secondEntry, pending, result, and error.

Digits stay as text for decimal/sign/backspace editing. Selecting an operator saves the left operand; selecting another operator before entering the right operand replaces it. Equals with a right operand emits `pending.submission.request` containing `{ operation, a, b }`. A future effect sends that request to Go and dispatches `resolved` or `rejected` with the submission ID. The reducer performs no calculation and initiates no network work.

Results retain the exact returned number. A following operator reuses it; a digit or decimal starts fresh. Equals without a right operand or after a result does nothing. Selecting an operator after the second operand requests the current pair and saves the next operator for left-to-right chaining. Clear resets entry while preserving request identity progression; pending edits are blocked, and stale completions are ignored. API errors support retry or editing the right operand. Full edge behavior and scope are in [DESIGN.md](docs/DESIGN.md#explicit-state-model).

## Project records

- [TASKS.md](TASKS.md): approved scope, acceptance criteria, and executed verification.
- [docs/DESIGN.md](docs/DESIGN.md): accepted API/numeric policy and planned keypad state transitions.
- [docs/DECISIONS.md](docs/DECISIONS.md): accepted/revised decisions and trade-offs.
- [AI_PROMPTS.md](AI_PROMPTS.md): faithful scoped AI prompt disclosure.
- [AGENTS.md](AGENTS.md): persistent engineering workflow.
