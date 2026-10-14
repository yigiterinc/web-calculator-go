# Design decisions

Updated 2026-10-14 after user review. Accepted decisions describe the target design; TASKS.md distinguishes implemented work from future work.

## D001 — Deployment-agnostic backend

Status: **accepted, revised**. Supersedes the proposed single Vercel project/function adapter.

Keep one Go module, `cmd/server`, `internal/calculator`, and `internal/httpapi`. The executable owns process/server configuration, HTTP code owns transport, and calculator owns arithmetic. No initial `api/` adapter, Vercel configuration, or hosting dependency. Deployment is an optional final milestone; required submission completion does not depend on it.

The original Vercel proposal aimed for same-origin simplicity. Deferring hosting now avoids coupling the application to a provider and focuses effort on the required behavior. Trade-off: production routing and runtime compatibility will need separate research if deployment is approved. A root Vite project provides the local frontend layout, not a hosting decision.

## D002 — float64 and JSON numbers

Status: **accepted**.

Use native finite numbers and reject undefined/non-finite outcomes. Keep the existing POST /api/calculate contract, validation, and structured errors. No decimal dependency or implicit output rounding. Binary rounding, large-integer precision loss, and underflow are documented.

Alternatives: math/big.Rat or decimal strings preserve decimal inputs but require parsing and output/rounding policies. They are unnecessary for the accepted general-purpose calculator requirements.

## D003 — Keypad UI with explicit binary-operation state

Status: **accepted, revised**. Supersedes the two-operand form; one binary operation per API request remains accepted.

Build a polished traditional keypad, numeric and expression displays, decimal/sign editing, Clear/backspace, equals, keyboard support, and accessible responsive states. A small React reducer models entry, operator selection, second entry, pending, result, and error. Reuse returned results and support sequential binary operations through API requests only; no parser, precedence engine, state library, or JavaScript arithmetic implementation.

The form was simpler to build but did not meet the requested calculator experience. Trade-off: keypad transitions and asynchronous chaining require more behavioral tests. DESIGN.md defines edge behavior (including no repeated-equals calculation and left-to-right chaining) for implementation and review.

## D004 — Standard library backend and bounded JSON input

Status: **accepted**.

Use plain functions, explicit errors, net/http, a 4 KiB body limit, and encoding/json with unknown-field rejection and complete-body validation. Keep calculation and transport separate, without unnecessary interfaces/frameworks. Missing/null operands must not become zero.

Alternatives: an HTTP framework, schema dependency, or custom JSON parser adds unnecessary surface area. Trade-off: standard case-insensitive key matching and last-value duplicate handling remain accepted and must be tested, alongside strict required fields and finite values.

## D005 — Behavioral testing and diagnostic coverage

Status: **accepted, revised**. Supersedes numeric coverage gates.

Retain Go table-driven tests/httptest and Vitest/React Testing Library. Test meaningful interaction sequences, state transitions, keyboard events, API payloads, errors, and async behavior. Tests accompany each feature; generate coverage reports and inspect gaps without arbitrary thresholds. Use real browser/API integration checks as well as mocked fetch tests.

Alternatives: percentage gates can encourage low-value assertions; deferring tests invites regressions. Trade-off: completion requires reviewing the behavior matrix and uncovered paths rather than relying on a single metric. Optional end-to-end framework/CI work is deferred until required functionality works.

## D006 — Minimal local server setup

Status: **implemented within approved task 2.1**, 2026-10-14.

Use Go 1.27.2, verified from the official download manifest and a checksum-verified user-local archive; keep the toolchain outside the repository. The module is named `sezzle-calculator` until a public destination is known, with no external dependencies. At task 2.1 the server used its own empty ServeMux, PORT default 8080 with range validation, and finite HTTP timeouts; task 2.3 wires the HTTP routes into this same server. At completion of task 2.1, both internal packages were documentation-only placeholders; task 2.2 adds the calculator implementation (D007).

Alternatives: relying on DefaultServeMux introduces global registration; adding a health or placeholder calculation endpoint would expand the approved scope; choosing a remote module path now would invent a repository destination. Trade-off at task 2.1: all routes returned standard 404. Graceful request draining is still not implemented. The small unexported constructor accepts a port string for configuration tests; main owns process effects. README.md documents the all-interface bind and current behavior.

## D007 — Minimal arithmetic API and comparable errors

Status: **implemented within approved task 2.2**, 2026-10-14.

Expose Calculate(operation string, a, b float64) (float64, error) and four sentinel errors. Keep operation names as plain strings matching the accepted domain vocabulary; use an early whitelist switch for deterministic operation-first validation, then operand checks and a small arithmetic switch. Return zero on failure. errors.Is lets a future transport layer classify failures without matching messages or adding HTTP concerns to the core.

Alternatives: a custom operation type/constants, an operation-to-function registry, an error struct, or an interface adds public surface without useful behavior for four operations. Repeating the operation cases in two small switches is simpler than those abstractions and keeps validation order explicit. There is no mutable calculation state. Numeric guards reject NaN/Infinity, check zero exactly (including negative zero), preserve underflow/subnormals, and normalize zero outputs. The result NaN check is defensive: with finite operands and zero division rejected, the implemented operations cannot produce NaN; overflow tests exercise non-finite-result errors without manufacturing an impossible public-input path.

## D008 — Bounded HTTP decoding and one route factory

Status: **implemented within approved task 2.3**, 2026-10-14.

Expose only NewHandler() http.Handler from httpapi and assign it to the existing server's Handler field. A private calculate handler owns methods, media type, parsing, and status mapping; arithmetic stays in the unchanged core. Use MaxBytesReader plus a bounded full read so trailing bytes count, then a DisallowUnknownFields decoder and an EOF check. RawMessage fields preserve the agreed last-duplicate-value behavior and allow ordered validation; decoding operands to pointers separates null/missing from zero. A small transport operation-enum check preserves operation-before-operand errors; it duplicates only request-enum validation, not arithmetic. Sentinel classification uses errors.Is.

Alternatives: a method-qualified ServeMux pattern would generate its own plain-text 405; decoding directly into float64 fields would lose null/missing distinctions, and typed decoding errors would depend on field order. Streaming only the first object could miss oversized trailing input. An injected calculator interface, parser framework, or custom middleware adds no necessary behavior.

Clarifications: reject repeated Content-Type headers (415); map body-read failures to safe invalid_json (400). JSON envelopes/headers apply to the endpoint, while mux 404s remain standard net/http responses. Marshal before WriteHeader, with a safe serialization fallback; HEAD omits the body. There is no panic-recovery layer or attempt to rewrite responses after a connection/write failure. These boundaries keep the implementation small and avoid promising JSON for failures it cannot deliver.

## D009 — Pure reducer and staged frontend implementation

Status: **accepted, implemented within approved task 3.1**, 2026-10-14. Refines D003 without changing the API or approved backend.

Use readonly TypeScript discriminated unions for firstEntry, operatorSelected, secondEntry, pending, result, and error. Input remains text; finite number conversion prepares payloads, and sign toggle edits the leading character. Actual arithmetic is exclusively the Go API's responsibility. The reducer emits a pending submission containing a request and deterministic ID; completion actions supply the returned value. A counter carried in state survives Clear, so old responses cannot match newer work. Result display text is derived from the stored number, avoiding duplicated state.

Equals with no second operand or after a result is a no-op. Operator selection after a second operand submits that pair with a next-operator intent, enabling binary left-to-right chaining. Pending input is blocked except Clear. Error retry retains the pair and continuation; editing abandons the continuation. Scientific results can be reused/sign-toggled without character-editing their exponent. Overflowing entry digits are ignored; binary rounding and underflow remain accepted. These choices keep every generated operand finite without introducing a separate input-validation error state.

Task 3.1 installed React/DOM, TypeScript, Vite and its React plugin, Vitest, and matching type packages; versions are locked and verified with Node 24.21.0. Official [Vite setup](https://vite.dev/guide/) and [Vitest setup](https://vitest.dev/guide/) were consulted; registry engine and peer metadata were checked before installation. At the end of task 3.1, the production bundle was only an unstyled React setup page. Reducer tests use Node; DOM testing libraries and coverage tooling wait until their tasks need them. API execution/proxy, AbortController/timeout handling, and the polished keypad were deferred to further approval; the user approved them together in task 3.2 (D010).

Alternatives: a state library or expression parser would expand the domain unnecessarily; network calls inside a reducer violate purity and make replay/React execution unsafe; a global/random request ID makes tests or replay nondeterministic. Using empty strings or a fallback right operand would blur whether the user entered the second operand. The trade-off is explicit transitions and a future effect layer that must dispatch completion IDs and safely map errors. Existing UI/keyboard requirements remain accepted, not implemented by this setup task.

## D010 — Integrated keypad and cancellable API effect

Status: **accepted, implemented within approved task 3.2**, 2026-10-14. Combines the previously proposed separate API and visual keypad tasks at the user's direction.

Keep the approved reducer and all 67 tests unchanged. App.tsx uses useReducer and an effect keyed by the pending submission. The effect sends one request, dispatches completion with its ID, and aborts/ignores its work on cleanup. The API client owns a separate controller to combine caller cancellation with a 10-second timeout covering response-body decoding. Pending actions return the same reducer state, so they do not restart the effect. No state library or injected transport abstraction is needed.

Accept only HTTP 200 JSON containing a finite numeric result. Recognized error codes map to useful local messages; malformed, non-JSON, unknown HTTP errors and network exceptions use safe fallback messages. Caller cancellation is silent in the UI; timeout remains retryable. No server diagnostics are rendered. Vite proxies relative /api requests to localhost:8080; Go needs no CORS or hosting changes.

The interface uses a restrained neutral/green palette, system typography, native buttons, readable expression/result displays and plain CSS. Long numbers wrap intact. Keyboard handling is scoped to the focused calculator; Enter/Space on buttons retain native semantics. Pending buttons use aria-disabled with explicit click guards to preserve focus, and AC remains usable. This avoids disabling a focused button and losing subsequent keyboard input. Error alerts and polite live updates provide feedback beyond color.

React Testing Library, its DOM peer, user-event, jest-dom and jsdom are development-only additions; runtime dependencies remain React/DOM. Node engines now match jsdom requirements. Tests follow the [Testing Library setup guidance](https://testing-library.com/docs/react-testing-library/setup/) and exercise effect cleanup under [React StrictMode](https://react.dev/reference/react/useEffect). Actual runtime/build/browser evidence is recorded separately in TASKS.md. Trade-offs: this is one calculator page without a component library, global keyboard listeners, automatic retry, history or an expression parser; deployment and broader device/accessibility testing remain separate work.
