# Technical design

The implemented application has a Go API, a React keypad and an optional verified Docker runtime. Arithmetic is exclusively backend-owned; hosting outside Docker remains unconfigured.

## Architecture

```text
cmd/server/           Process configuration, startup and HTTP timeouts
internal/calculator/  Stateless arithmetic and numeric validation
internal/httpapi/     API parsing, responses and optional static routing
src/App.tsx           Keypad, display, keyboard events and request effect
src/calculator.ts     Pure calculator reducer and request intents
src/api.ts            Typed HTTP client, validation, timeout and cancellation
src/styles.css        Responsive layout and interaction states
Dockerfile            Frontend build, Go build and minimal runtime
```

Go uses only its standard library. Internal packages remain private to the module tree; no framework, custom service interface, persistence or dependency injection layer is needed.
Normal development uses Vite's /api proxy to localhost:8080. Docker serves page/assets/API from the same Go process and origin, so relative client URLs work without CORS configuration.
main owns environment access and listening; a testable constructor validates PORT and optional STATIC_DIR. Header/read/write/idle timeouts are 5/10/10/60 seconds.

## API contract

POST /api/calculate requires Content-Type: application/json (parameters such as charset=utf-8 are accepted) and exactly one JSON object. The full body limit is 4,096 bytes, including trailing whitespace.

```json
{"operation":"multiply","a":12,"b":5}
```

Supported operation names are exactly add, subtract, multiply and divide. Operands must be present, non-null finite JSON numbers; zero is valid. Unknown fields, malformed input and additional JSON values are rejected.
HTTP 200 returns {"result":60}. Errors have one consistent envelope:

```json
{"error":{"code":"division_by_zero","message":"Cannot divide by zero."}}
```

| Status | Code | Condition |
| --- | --- | --- |
| 400 | invalid_json | Empty/malformed/non-object JSON, unknown fields, trailing values/junk or body-read failure |
| 400 | invalid_operand | Missing/null/wrong-type operand or literal outside float64 range |
| 400 | invalid_operation | Missing/null/wrong-type or unsupported operation |
| 405 | method_not_allowed | Non-POST method; Allow: POST |
| 413 | payload_too_large | Full body exceeds 4,096 bytes |
| 415 | unsupported_media_type | Missing, malformed, repeated or non-JSON Content-Type |
| 422 | division_by_zero | Positive or negative zero divisor |
| 422 | result_out_of_range | Arithmetic yields a non-finite result |
| 500 | internal_error | Unexpected returned error or serialization failure; diagnostics withheld |

Validation order is method, media type, bounded full read, JSON structure, operation, a, then b. RawMessage preserves ordered field validation; pointer decoding distinguishes missing/null operands from zero.
DisallowUnknownFields and an EOF check enforce the object boundary. Standard encoding/json tolerance remains intentional: field matching is case-insensitive and the last recognized duplicate value wins.
Calculator errors are mapped with errors.Is. Responses are marshaled before headers commit, avoiding a false successful status if serialization fails.
Endpoint responses use application/json, Cache-Control: no-store and X-Content-Type-Options: nosniff. HEAD returns 405 without a body; unknown paths and /api/calculate/ return standard 404s outside the JSON envelope.
Connection failures and unexpected panics are governed by net/http; no custom recovery middleware promises an envelope for them.

## Numeric policy

Calculate(operation string, a, b float64) (float64, error) is stateless and independent of HTTP. Operation validation precedes finite-operand checks; subtraction/division preserve operand order.
Four sentinel errors distinguish unsupported operations, non-finite operands, zero division and non-finite results. Callers classify with errors.Is rather than message matching.
Go float64 matches JavaScript's binary number model. Decimal rounding, integer precision beyond 2^53 and underflow are accepted; there is no decimal dependency or implicit rounding.
Division rejects either sign of exact zero, without an epsilon that would reject small valid divisors. Non-finite results never reach JSON serialization. Zero results normalize to positive zero.
API result display uses normal number-to-string conversion, preserving returned precision and scientific notation.

## Explicit state model

The pure reducer uses readonly discriminated states; editable numbers remain text, while results retain the API's numeric value. Network effects and timestamps are excluded from transitions.

| State | Responsibility |
| --- | --- |
| firstEntry | Edit the initial operand, starting at 0 |
| operatorSelected | Save the left operand/operator; no second operand yet |
| secondEntry | Edit the right operand |
| pending | Hold the submitted pair, ID and optional next operator |
| result | Retain the returned number and completed pair |
| error | Retain the failed submission and safe feedback for retry/editing |

Digits collapse leading integer zeros and preserve fractional zeros. Repeated decimals are ignored; sign toggle edits the leading sign. Digits that would overflow a finite operand are ignored.
Selecting an operator before second entry replaces it. Equals submits only after a second operand exists; empty equals and repeated equals after a result are no-ops.
An operator after a result reuses it; a digit/decimal starts fresh. An operator after second entry submits that pair and remembers the next operator for left-to-right chaining, without precedence.
Backspace removes one character during ordinary entry; empty/minus-only becomes 0. It is a no-op after a result/operator selection or for scientific notation; digit/decimal starts fresh when editing scientific result text.
Sign toggle after a result starts a first entry from its displayed value with the sign changed. There is no client-side answer calculation.
Error equals retries the saved pair and continuation. Digit/decimal replaces the right operand; Backspace/sign resumes editing; operator replaces the failed operator while keeping its right operand. Editing discards the saved continuation.
Clear resets entry/error/result and preserves the request counter. Pending input is blocked except Clear, preventing duplicate submissions.

## Async lifecycle and interface

Equals/chaining produces a submission intent containing operation, a, b and a deterministic monotonic ID. App's effect depends on that stable submission, so blocked input cannot restart it.
The effect uses AbortController and dispatches completion with the ID. Clear/unmount aborts its work; aborted completions are ignored. The reducer independently rejects completions that do not match the active pending ID.
The client combines caller cancellation with a 10-second timeout covering fetch and body reading. It accepts only HTTP 200 JSON with a finite result; known error codes map to local messages and other failures use safe fallback feedback.
Caller cancellation is silent; timeout/network/API failures remain retryable. Cancellation prevents stale UI updates but cannot guarantee the server has not already finished arithmetic.
Native buttons provide accessible names and focus states; aria-disabled plus click/reducer guards preserves focus while pending. Results/loading are polite live updates; errors use alerts.
Keyboard handling is scoped to the focused calculator and preserves Tab, browser modifiers and native Enter/Space button activation. The keypad supports touch, reduced motion and long results without truncation.

## Docker runtime

Node 24.21.0-alpine3.23 runs npm ci/build; Go 1.27.2-alpine3.23 builds a CGO-disabled executable. Scratch contains only /server and built /web assets, running as UID/GID 65532 on port 8080.
STATIC_DIR enables os.DirFS after index.html validation. NewHandler(frontend fs.FS) accepts nil for API-only mode; otherwise exact GET/HEAD / and GET/HEAD /assets/ routes use net/http static serving.
There is no catch-all SPA fallback: unknown API/page paths and missing assets do not return index.html. Static output must be trusted build output. No reverse proxy, runtime Node or Compose is required.
The image is verified on Linux ARM64. Scratch has no shell; external TLS/hosting and graceful draining are not implemented.

## Testing strategy

Go table-driven tests cover arithmetic edge cases and sentinel errors; httptest covers validation, methods, body boundaries, envelopes, headers, static routes and configuration.
Vitest tests pure reducer sequences and the API client; React Testing Library/user-event tests keyboard/keypad interactions, accessibility semantics, pending/error/retry behavior, cancellation and stale responses under StrictMode.
Frontend tests mock fetch and supply explicit results rather than evaluate arithmetic. Real Go/Vite and Docker browser/API checks verify the integration those mocks cannot establish.
Coverage is diagnostic, without thresholds: Go includes all three packages/main; frontend includes handwritten App/reducer/client logic, excluding tests, declarations, mounting-only main.tsx and non-TS assets/configuration.
Commands and measured results are in [README.md](../README.md#testing-and-coverage) and [TASKS.md](../TASKS.md). [DECISIONS.md](DECISIONS.md) explains the trade-offs.
