# Architectural decisions

All decisions below are accepted and implemented. D001, D003 and D005 incorporate user-approved revisions. Verification and submission status belong in [TASKS.md](../TASKS.md).

## D001 — Deployment-agnostic backend

Decision: one Go module with cmd/server, internal/calculator and internal/httpapi; external deployment is optional.
Rationale: transport and arithmetic can run locally or in Docker without a hosting-provider dependency.
Trade-off: provider-specific runtime, TLS and routing must be verified separately if deployment is approved.

## D002 — float64 and JSON numbers

Decision: use finite float64 operands/results, normalize zero results and preserve native precision without implicit rounding.
Rationale: this matches the frontend number model and the accepted general-purpose calculator scope.
Trade-off: decimal rounding, large-integer precision loss and underflow remain visible; decimal strings/math/big would require extra policy and complexity.

## D003 — Keypad with binary operations

Decision: use a traditional accessible keypad, expression/result displays and sequential binary calculations through Go.
Rationale: the keypad meets the requested interaction model while keeping the domain limited to four operations.
Trade-off: state transitions need explicit tests; left-to-right chaining has no expression parser or operator precedence.

## D004 — Standard-library HTTP and bounded JSON

Decision: net/http and encoding/json, a full 4 KiB read limit, strict object boundaries and unknown-field rejection.
Rationale: standard tools handle the required contract without a framework or schema dependency.
Trade-off: Go's case-insensitive field matching and last-duplicate-value behavior remain accepted; malformed/null/unknown inputs still fail.

## D005 — Behavior-focused tests

Decision: Go table-driven tests/httptest and Vitest/React Testing Library, supplemented by real browser/API checks; no coverage gates.
Rationale: assertions on user-visible behavior and failure paths provide evidence beyond a percentage.
Trade-off: coverage gaps require review; mocked fetch and jsdom alone cannot establish real integration or device accessibility.

## D006 — Explicit local server

Decision: a private constructor validates PORT and STATIC_DIR; main owns environment access, logging and listening; use an explicit ServeMux and finite timeouts.
Rationale: configuration/routing remain testable without global registration or a parallel server architecture.
Trade-off: graceful draining is absent. The executable's local module name avoids binding the project to an unselected public repository.

## D007 — Minimal arithmetic API

Decision: Calculate(operation string, a, b float64) (float64, error) with four sentinel errors and errors.Is classification.
Rationale: plain functions and strings match the wire vocabulary; operation-first validation and arithmetic remain readable in two small switches.
Trade-off: an operation registry/type or service interface would add public surface without useful extensibility for four operations.

## D008 — Ordered HTTP decoding and safe responses

Decision: RawMessage fields, pointer operand decoding and an EOF check; validate operation/a/b in order and marshal responses before committing headers.
Rationale: missing/null differ from zero, duplicate semantics stay consistent and error status selection is predictable.
Trade-off: transport repeats the operation enum check, not arithmetic; unknown routes, broken connections and panics do not promise endpoint JSON envelopes.

## D009 — Pure reducer and request identity

Decision: readonly discriminated states with text entry, API result numbers and a state-owned monotonic request ID preserved by Clear.
Rationale: transitions are deterministic; no network calls, clocks, random IDs or duplicated arithmetic belong in the reducer.
Trade-off: async chaining/retry intent adds explicit states. Repeated equals is a no-op; scientific result text is not character-edited.

## D010 — Cancellable API effect and native controls

Decision: App owns submission effects; the client combines caller abort with a 10-second timeout and validates finite HTTP 200 results. Use native controls and safe local feedback.
Rationale: effect cleanup and reducer IDs prevent stale updates; stable pending state prevents duplicates. aria-disabled preserves focus during loading.
Trade-off: keyboard shortcuts require calculator focus; cancellation cannot retract already-completed server work. No automatic retry or global state library is needed.

## D011 — Reproducible diagnostic coverage

Decision: matching Vitest V8 tooling with text/HTML/LCOV/JSON summaries, and a Go whole-backend profile including main. Generated reports stay out of Git.
Rationale: reviewers can reproduce the metrics and inspect meaningful uncovered paths using [documented commands](../README.md#testing-and-coverage).
Trade-off: frontend metrics exclude tests/declarations/mounting-only main.tsx and non-TS assets/configuration; statement/branch percentages do not prove accessibility or correctness.

## D012 — Optional single-container Docker runtime

Decision: [multi-stage build](https://docs.docker.com/build/building/multi-stage/) with exact-version Node/Go builders, locked npm ci and a non-root scratch runtime containing only the executable/assets.
Rationale: Go's optional standard-library static routes serve UI/API on one origin; nil frontend preserves ordinary API-only development. No reverse proxy or Compose is required.
Trade-off: trusted filesystem assets and no SPA fallback; scratch has no shell and external TLS is separate. Embedding dist would couple ordinary Go builds to frontend compilation.
