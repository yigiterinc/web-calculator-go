# Sezzle Calculator

## Overview and tech stack

A calculator with a responsive keypad, keyboard input, result reuse, and structured errors. All arithmetic runs through the Go API.
Stack: React, TypeScript, Vite and plain CSS; Go net/http and encoding/json; Vitest/React Testing Library and Go testing/httptest. Go has no third-party dependencies.

## Quick Start with Docker

Prerequisite: Docker Engine or Docker Desktop. From the repository root:

```sh
docker build -t sezzle-calculator .
docker run --rm --name sezzle-calculator -p 127.0.0.1:8080:8080 sezzle-calculator
```

Open **http://localhost:8080/**. Stop with Ctrl+C. If 8080 is occupied, change the host port in the mapping.
Node and Go build stages produce the frontend assets and static executable; a non-root scratch runtime serves both on port 8080. No host Go/Node installation is needed.
The image build and runtime were verified on Linux ARM64; the image measured approximately 2.69 MB. Unknown API paths return 404 and never fall back to the frontend.

## Local Development

Prerequisites: Go 1.27.2 or newer, Node 24.21.0 and npm (the verified frontend toolchain; supported engines are in package.json).
From the repository root, start the API in one terminal:

```sh
go run ./cmd/server
```

In another terminal:

```sh
npm ci
npm run dev
```

Open the URL Vite prints (normally http://localhost:5173/). Vite proxies relative `/api` requests to Go on localhost:8080.
`PORT` overrides the Go port; update the Vite proxy target if changed. Go is API-only by default. To serve built assets locally, run `npm run build`, then `STATIC_DIR=dist go run ./cmd/server`.

## REST API and curl examples

`POST /api/calculate` accepts one JSON object with operation (`add`, `subtract`, `multiply`, `divide`) and finite numeric operands a and b. Content-Type must be application/json; the body limit is 4 KiB.

```sh
curl -i -H 'Content-Type: application/json' \
  --data-binary '{"operation":"multiply","a":12,"b":5}' \
  http://localhost:8080/api/calculate
```

HTTP 200:

```json
{"result":60}
```

```sh
curl -i -H 'Content-Type: application/json' \
  --data-binary '{"operation":"divide","a":12,"b":0}' \
  http://localhost:8080/api/calculate
```

HTTP 422:

```json
{"error":{"code":"division_by_zero","message":"Cannot divide by zero."}}
```

Invalid JSON/operands/operations return 400; unsupported methods 405; oversized bodies 413; invalid media types 415; non-finite results 422. See the [full API contract](docs/DESIGN.md#api-contract).

## Testing and Coverage

Run from the repository root; unit tests require no running services:

```sh
gofmt -l cmd internal
go vet ./...
go test ./...
go test -race ./...
go build ./...
npm run typecheck
npm test
npm run build
npm run test:coverage
mkdir -p coverage/backend
go test -count=1 -coverprofile=coverage/backend/coverage.out ./...
go tool cover -func=coverage/backend/coverage.out
go tool cover -html=coverage/backend/coverage.out -o coverage/backend/index.html
```

Verified on 2026-10-14: all checks passed; 121 frontend tests passed. Reports are ignored by Git and regenerated with the commands above.
Latest recorded coverage: backend **92.3% statements** (calculator 100%, HTTP 96.2%, server 70%) after Dockerization; frontend **99.34% statements, 98.23% branches, 100% functions/lines** from final QA.
Go coverage includes all three packages and main. Frontend coverage includes App, reducer and API client; tests, declarations and mounting-only main.tsx are excluded, as are CSS/HTML/configuration.
Open coverage/backend/index.html or coverage/frontend/index.html; frontend LCOV is coverage/frontend/lcov.info. Coverage is diagnostic, without percentage gates. Verification evidence is in [TASKS.md](TASKS.md).

## Design Decisions

Go separates process configuration, HTTP transport and arithmetic. A pure React reducer emits request intents; an effect calls the API with cancellation, timeout and stale-response protection.
Binary calculations chain left-to-right. Native float64 precision is preserved; results are not silently rounded. Local development uses Vite; Docker uses Go static serving with no SPA fallback.
See [DESIGN.md](docs/DESIGN.md) for boundaries and state transitions, and [DECISIONS.md](docs/DECISIONS.md) for rationale and trade-offs.

## Limitations and AI Assistance

Binary floating-point rounding and large-integer precision limits apply. There is no expression parser, operator precedence, history or repeated-equals calculation.
Keyboard shortcuts require focus inside the calculator. External deployment/TLS and graceful server draining are not implemented; other container architectures and physical-device/screen-reader testing remain unverified.
Codex assisted with design, implementation, testing and documentation. [AI_PROMPTS.md](AI_PROMPTS.md) preserves significant user prompts and discloses the log's limits; it is not a complete transcript.
The application and Docker image are verified locally. Git is initialized, but no public remote is configured; publication remains a separate submission step.
