# Design decisions

Updated 2026-10-14 after user review. Accepted decisions describe the target design; TASKS.md distinguishes implemented work from future work.

## D001 — Deployment-agnostic backend

Status: **accepted, revised**. Supersedes the proposed single Vercel project/function adapter.

Keep one Go module, `cmd/server`, `internal/calculator`, and `internal/httpapi`. The executable owns process/server configuration, HTTP code owns transport, and calculator owns arithmetic. No initial `api/` adapter, Vercel configuration, or hosting dependency. Deployment is an optional final milestone; required submission completion does not depend on it.

The original Vercel proposal aimed for same-origin simplicity. Deferring hosting now avoids coupling the application to a provider and focuses effort on the required behavior. Trade-off: production routing and runtime compatibility will need separate research if deployment is approved. A root Vite project remains a simple future local layout, not a hosting decision.

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

Use Go 1.27.2, verified from the official download manifest and a checksum-verified user-local archive; keep the toolchain outside the repository. The module is named `sezzle-calculator` until a public destination is known, with no external dependencies. The server uses its own empty ServeMux, PORT default 8080 with range validation, and finite HTTP timeouts. At completion of task 2.1, both internal packages were documentation-only placeholders; task 2.2 adds the calculator implementation (D007).

Alternatives: relying on DefaultServeMux introduces global registration; adding a health or placeholder calculation endpoint would expand the approved scope; choosing a remote module path now would invent a repository destination. Trade-off: the scaffold returns standard 404 for all routes and does not yet support graceful request draining. The small unexported constructor accepts a port string for configuration tests; main owns process effects. README.md documents the all-interface bind and current behavior.

## D007 — Minimal arithmetic API and comparable errors

Status: **implemented within approved task 2.2**, 2026-10-14.

Expose Calculate(operation string, a, b float64) (float64, error) and four sentinel errors. Keep operation names as plain strings matching the accepted domain vocabulary; use an early whitelist switch for deterministic operation-first validation, then operand checks and a small arithmetic switch. Return zero on failure. errors.Is lets a future transport layer classify failures without matching messages or adding HTTP concerns to the core.

Alternatives: a custom operation type/constants, an operation-to-function registry, an error struct, or an interface adds public surface without useful behavior for four operations. Repeating the operation cases in two small switches is simpler than those abstractions and keeps validation order explicit. There is no mutable calculation state. Numeric guards reject NaN/Infinity, check zero exactly (including negative zero), preserve underflow/subnormals, and normalize zero outputs. The result NaN check is defensive: with finite operands and zero division rejected, the implemented operations cannot produce NaN; overflow tests exercise non-finite-result errors without manufacturing an impossible public-input path.
