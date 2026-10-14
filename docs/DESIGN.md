# Calculator design

Status: backend architecture and API policy accepted; frontend/deployment decisions revised per user review on 2026-10-14. Task 2.1 authorizes only the backend scaffold. Keypad transition rules below elaborate the requested interaction model; implementation remains pending.

## Initial environment evidence (planning snapshot)

- Workspace was empty, including hidden files; no existing source, instructions, or design docs were present.
- `git status --short --branch` reported that this directory is not a Git repository. No remote or public repository has been established.
- `node --version`: v24.21.0; `npm --version`: 11.19.0; `git --version`: 2.38.1.
- `go version`: command not found. Go and Vercel CLI were absent from PATH; standard Go installation locations were also checked without finding a binary. This is not an exhaustive filesystem search.
- At initial planning, no dependencies were installed or builds/tests run. Current setup and verification are recorded in README.md and TASKS.md.

## Agreed structure and flow

Target layout; frontend files remain future work. Task 2.1 creates only the Go module, package placeholders, local server scaffold/tests, and setup documentation:

```text
sezzle-calculator/
├── go.mod                         # one Go module
├── cmd/server/main.go             # local HTTP server, PORT default 8080
├── internal/
│   ├── calculator/                # arithmetic and table-driven unit tests
│   └── httpapi/                   # shared handler and httptest tests
├── package.json / package-lock.json
├── index.html
├── vite.config.ts / tsconfig*.json
├── src/
│   ├── main.tsx
│   ├── App.tsx / App.test.tsx
│   ├── calculator.ts / calculator.test.ts # reducer and transitions
│   ├── api.ts / api.test.ts        # fetch and response validation
│   ├── styles.css
│   └── test/setup.ts
├── .gitignore
├── README.md / AGENTS.md / TASKS.md / AI_PROMPTS.md
└── docs/
    ├── DESIGN.md
    └── DECISIONS.md
```

React calls relative `/api/calculate`. In development, Vite proxies `/api` to the Go server on localhost:8080. The local executable will compose the `httpapi` handler, which calls `calculator`. The arithmetic package has no HTTP or hosting dependencies. Production hosting is optional and undecided; relative API URLs allow a future same-origin arrangement without coupling business logic to a provider. No database, router library, CORS middleware, client router, state library, or npm workspace tooling is needed.

Go-specific rationale: `cmd/server` holds the executable; `internal` restricts external imports of implementation packages. Plain functions and explicit returned errors fit this small service; interfaces add no useful seam here. Request operand pointers distinguish missing/null input from valid zero. These conventions follow [Go module layout guidance](https://go.dev/doc/modules/layout).

## API contract

One endpoint: `POST /api/calculate`, with `Content-Type: application/json` (optional charset parameter accepted). Body limit: 4,096 bytes. No authentication or persisted data.

```json
{"operation":"add","a":1.5,"b":2}
```

Required fields: `operation` is exactly one of `add`, `subtract`, `multiply`, `divide`; `a` and `b` are finite JSON numbers. Zero and negative values are valid. Strings, booleans, arrays, missing/null fields, and unknown fields are rejected. There must be exactly one top-level JSON object; trailing whitespace is allowed, additional values or junk are rejected.

Success: HTTP 200 with `Content-Type: application/json` and:

```json
{"result":3.5}
```

Application error envelope (machine-readable code, safe human-readable message):

```json
{"error":{"code":"division_by_zero","message":"Cannot divide by zero."}}
```

| Status | Code | Condition |
| --- | --- | --- |
| 400 | `invalid_json` | Empty/malformed JSON, wrong top-level type, unknown field, multiple JSON values, trailing junk |
| 400 | `invalid_operand` | Missing/null/wrong-type operand, or numeric literal outside float64 range |
| 400 | `invalid_operation` | Missing/null/wrong-type or unsupported operation |
| 405 | `method_not_allowed` | Any non-POST method on this endpoint; include `Allow: POST` |
| 413 | `payload_too_large` | Body exceeds 4,096 bytes, including trailing whitespace |
| 415 | `unsupported_media_type` | Missing, malformed, or non-JSON Content-Type |
| 422 | `division_by_zero` | Divisor equals positive or negative zero |
| 422 | `result_out_of_range` | Finite operands produce a non-finite result |
| 500 | `internal_error` | Unexpected application failure; no internal details in response |

Check method, then media type, then read the size-limited body, then validate JSON structure and fields, then calculate. For multiple field errors, validate operation, a, then b. Bound the entire read before decoding so oversized trailing bytes cannot bypass the limit. All application responses use `Cache-Control: no-store`. Encode responses before writing success headers so serialization failures cannot leave a partial success response. HEAD responses carry no body per HTTP semantics.

Use stable `encoding/json` behavior rather than an additional JSON library: field matching is case-insensitive and duplicate recognized fields use their last value. Clients must send the canonical names above; test and document this accepted tolerance. Unknown fields still fail. This avoids writing a custom parser for this exercise. See the [standard decoder documentation](https://pkg.go.dev/encoding/json). Request validation must not silently accept missing or null numbers as zero.

The local server returns 404 for unknown API paths. Platform-generated 404s, gateway failures, and timeouts may not follow our error envelope; the frontend must tolerate non-JSON responses. Do not redirect `/api/calculate/` into the endpoint or add a catch-all SPA rewrite. Only `/` needs a frontend page.

## Arithmetic policy and edge cases

Accepted numeric type: Go `float64`, matching JavaScript's binary floating-point number model. This is a general-purpose calculator; exact decimal arithmetic is not a requirement assumed from the company's industry.

- All four operations; subtraction/division preserve operand order.
- Zero, negatives, fractions, exponent notation, very small and very large finite operands.
- Reject division by both signs of zero; do not use an epsilon test that rejects legitimate tiny divisors.
- Reject non-finite operands in the core even though normal JSON cannot encode NaN/Infinity. Reject non-finite results before JSON encoding.
- Binary rounding is expected (`0.1 + 0.2` may produce `0.30000000000000004`); integers beyond 2^53 are not guaranteed exact. Underflow may round to zero. Do not claim arbitrary precision.
- Normalize a zero result to positive zero for consistent display. Do not silently round other results to a fixed number of decimal places; render the returned number with normal number-to-string formatting, including scientific notation when needed.

## Frontend interaction model

Use React, TypeScript, Vite, and plain CSS for a traditional calculator, with a prominent numeric display, a smaller operation/expression line, and a conventional four-column keypad. Controls include 0–9, decimal, ±, clear, backspace, +, −, ×, ÷, and equals. A minimal professional design should use restrained colors, tabular digits, deliberate spacing/type hierarchy, distinct operator/equals emphasis, and clear hover/pressed/focus/disabled states. Keep touch targets at least 44px, fit a 320px viewport, and accommodate long/scientific results without losing their value. Do not truncate or round the stored API result.

Use native buttons with accessible names for symbols, visible focus, and logical DOM/tab order. Announce pending/result updates politely and errors through an alert. The expression line is a readable binary operation, not an editable expression or parser. History, memory, percentages, and general precedence are out of scope.

### Explicit state model

Use a small reducer with discriminated states: `firstEntry`, `operatorSelected`, `secondEntry`, `pending`, `result`, and `error`. Keep editable digits as strings and completed results as the API's numeric value plus display text. Store only the current left operand, selected operator, active entry, and (while pending/error) submitted operands and any next-operator intent. Do not maintain a second expression evaluator. Network effects live outside the pure reducer; user events and request completion events drive transitions.

| State/event | Behavior |
| --- | --- |
| Initial / Clear | First entry is `0`; no operator, result, or error. Clear aborts and invalidates pending work. |
| Digits during entry | Replace leading `0` (preserve a toggled minus), otherwise append. Digits after result start a fresh first operand. |
| Decimal | Start with `0.` if needed; append only if the active entry lacks a decimal. A second decimal is ignored. After result, start a fresh `0.`. |
| ± | Toggle the leading sign of the editable operand as text, including `-0`. After operator selection, start second entry at `-0`. After result, enter its displayed value with the sign toggled as a new first operand. This is input editing, not client-side evaluation. |
| First entry + operator | Store the finite operand and operator; await the second operand. No request yet. |
| Operator while awaiting second operand | Replace the selected operator; do not calculate. |
| Digit/decimal after operator | Start the second operand, replacing the previous display. |
| Equals with second operand | Submit exactly one binary calculation. A trailing decimal is a valid completed number. |
| Equals without a second operand / after result | No-op; do not invent a right operand or repeat the previous operation. |
| Operator after second entry | Submit the current binary pair; remember the newly chosen operator. On success, use the result as the next left operand and await second entry. This permits left-to-right chaining, without precedence. |
| Operator after result | Reuse the exact API number as the left operand; await the next operand. |
| Backspace while entering | Remove one character; empty or minus-only becomes `0`. After operator selection/result, no-op. Do not character-edit scientific notation returned by the API; a digit/decimal starts a fresh entry instead. This also applies after sign-toggling a result in exponent notation. |
| Pending | Show loading, block arithmetic/edit actions and duplicate submission; Clear stays available. |
| Successful response | Show the result and completed binary expression, or enter operatorSelected when chaining was requested. Never compute the answer locally. |
| Failure | Preserve the submitted pair and show a safe error. Equals retries that pair with its saved continuation intent; digit/decimal begins a replacement second operand; backspace/± resumes editing the second operand; operator replaces the failed pair's operator without submitting and retains the right operand. Clear resets everything. |

Example: `2 + 3 × 4 =` makes two API requests, `(2 + 3)` then `(returned result × 4)`. `5 + × 2 =` submits only multiplication. `2 + =` waits for a second operand; `2 + 3 = =` makes only one request. These transition choices must be tested explicitly.

Keyboard mapping within the focused calculator: digits, `.`, `+`, `-`, `*`, `/`, Enter or `=` for equals, Backspace, Escape/Delete for Clear, and F9 for sign toggle (also always available as a button). Document shortcuts accessibly. Preserve Tab/Shift+Tab and native Space/Enter activation on focused buttons; avoid handling a native button activation twice. Do not capture browser shortcuts or keys in unrelated inputs. Minus selects subtraction; ±/F9 edits the operand's sign.

Only parse finite operands for transport and edit their text on the client. All addition, subtraction, multiplication, division, and chained answers come from Go. Backend validation remains authoritative. Results in exponent notation may be reused unchanged; the keypad does not need exponent-entry keys.

Use a monotonically increasing request identity and an AbortController. Accept completion only for the currently pending identity. Clear invalidates the identity before aborting, so late successes and failures cannot restore cleared state; unmount cancels silently. A 10-second timeout enters a retryable error state. Network errors, malformed success payloads, and non-JSON server responses must produce safe errors. Do not render raw server response bodies.

## Tests and coverage

Tests accompany each implementation task. Later verification tasks close gaps and produce reports; they are not an excuse to defer tests.

- Go core: table-driven tests for every operation and the numeric edge cases above, including direct NaN/Infinity calls, overflow, underflow, signed zero, and precision-sensitive results. Use explicit expected errors; floating comparisons use justified tolerances where needed.
- HTTP: `httptest` covers the full contract matrix, exact/over body-size boundary, charset headers, trailing bytes, missing versus zero, duplicate/case-tolerant fields, status/header/envelope consistency, and local server route behavior. Add an unexpected-error/recovery test if a recovery boundary is implemented.
- Frontend: Vitest + React Testing Library + user-event in jsdom. Test reducer transitions and user-visible keypad sequences, all operation payloads, operator replacement/chaining, decimals/sign/backspace, result reuse/new entry, keyboard input, pending/duplicate prevention, Clear and late response handling, success, retry/error recovery, timeout, network failure, and invalid response shapes. Mock fetch at the network boundary; do not replicate arithmetic in JavaScript tests.
- Go commands planned: `gofmt -l .`, `go vet ./...`, `go test -race ./...`, `go test ./... -coverprofile=coverage.out`, `go tool cover -func=coverage.out`, and `go tool cover -html=coverage.out -o coverage.html`. Report race-detector/toolchain limitations if encountered.
- Frontend scripts planned: `npm run typecheck`, `npm run build`, `npm run test:coverage` (Vitest run with V8 coverage). Produce text, HTML, and LCOV reports. Include all handwritten `src` TS/TSX files even if not imported by tests; exclude tests/setup and the mounting-only `main.tsx` with that exclusion documented.
- No arbitrary coverage thresholds. Required behavior and edge-case assertions determine completion; use reports to identify meaningful gaps. Go reports statement coverage, not branch coverage. Document exclusions and uncovered startup/error paths honestly; do not equate high percentages with correctness.
- Review uncovered paths, not just percentages. Browser smoke tests use the real Go server through Vite, and a deployed preview only if optional deployment is approved; mocked fetch tests alone cannot verify integration. Automated end-to-end infrastructure is optional and excluded from the initial time budget.

Vitest's [coverage documentation](https://vitest.dev/guide/coverage.html) supports the proposed V8 provider; keep its package version aligned with Vitest. Generated reports/build output stay out of Git; document reproducible commands and observed results instead.

## Optional deployment

Deployment is an optional final milestone after the required implementation, documentation, and public repository. No Vercel function adapter, provider configuration, hosting dependency, or production topology is part of the initial architecture. The standard Go executable must run locally on its own. If deployment is approved later, select the platform and verify its current runtime, routing, build, and account requirements then. Prefer same-origin API routing where practical. The initial Vercel research is historical context, not an accepted deployment commitment (D001).

## Current implementation boundary

Task 2.1 sets up the module, `cmd/server`, `internal/calculator`, and `internal/httpapi`. The internal packages initially contain documentation only. An empty explicit ServeMux backs the local server, so every route (including POST /api/calculate) returns the standard 404 until the handler task. No arithmetic, health endpoint, placeholder calculation response, or frontend is included. PORT defaults to 8080; validate it before listening and set finite HTTP timeouts. README.md records actual startup behavior and tests.
