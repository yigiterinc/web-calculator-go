# Sezzle Calculator

A full-stack calculator take-home using Go and React/TypeScript. **Current status: backend setup only.** The local HTTP server starts, but no routes are registered yet. Arithmetic, POST /api/calculate, and the frontend are pending. Deployment is optional.

## Requirements and setup

Go **1.27.2** is declared in go.mod and was verified on macOS arm64. Install Go using the [official instructions](https://go.dev/doc/install); the [official download manifest](https://go.dev/dl/?mode=json) identified this stable version during setup on 2026-10-14. There are no third-party Go dependencies and no go.sum is needed.

For this workspace, the official archive was SHA-256 verified and installed outside the repository at `~/.local/share/sezzle-toolchains/go1.27.2`. No shell startup files were changed. To use that installation in a terminal:

```sh
export PATH="$HOME/.local/share/sezzle-toolchains/go1.27.2/bin:$PATH"
go version
```

Other machines can use a normal Go installation on PATH. Node/npm will be needed when frontend implementation begins; no npm package or installation step exists yet.

## Run locally

From the repository root:

```sh
go run ./cmd/server
```

The server listens on `:8080` (all network interfaces). Set PORT to an integer from 1 through 65535 to override it:

```sh
PORT=9000 go run ./cmd/server
```

An unset or empty PORT uses 8080. Invalid values fail before listening with a clear error. Stop with Ctrl+C. The scaffold sets header/read/write/idle timeouts to 5/10/10/60 seconds. Graceful draining is not implemented in this setup task.

Current smoke check, in another terminal:

```sh
curl -i -X POST http://localhost:8080/api/calculate
```

**Expected now: 404 with the standard net/http plain-text response.** This confirms the server is reachable and the calculation route is still unimplemented. It is not the future API error contract. The accepted future request/response/error contract is in [docs/DESIGN.md](docs/DESIGN.md#api-contract).

## Build and test

```sh
go build ./...
go build -o bin/server ./cmd/server
go test ./...
go test -race ./...
go vet ./...
gofmt -l cmd internal
```

The formatter check should print nothing. Current tests cover valid/default/invalid port configuration and unregistered routes using testing/httptest. The documentation-only internal packages have no behavior or tests yet. Full calculator coverage reports will be introduced with implementation; no coverage threshold is imposed.

## Structure and rationale

- `cmd/server`: process entry point, configuration, and explicit net/http server with its own ServeMux.
- `internal/calculator`: arithmetic package placeholder; no calculation logic yet.
- `internal/httpapi`: transport package placeholder; no calculation handler yet.

`internal` keeps implementation packages private to this module tree. An explicit mux avoids global route registration. The unexported server constructor returns a server and error so configuration is testable without opening a socket; main owns environment access, logging, and listening. No application-specific interfaces or framework are needed.

The local module name `sezzle-calculator` avoids inventing a public Git destination. A remote can be selected at the submission milestone; adopting its canonical module path then is optional for this executable project. Frontend source will later live in src/, with a reducer-driven keypad and API-only arithmetic. No hosting adapter/configuration is included.

## Project records

- [TASKS.md](TASKS.md): approved scope, acceptance criteria, and executed verification.
- [docs/DESIGN.md](docs/DESIGN.md): accepted API/numeric policy and planned keypad state transitions.
- [docs/DECISIONS.md](docs/DECISIONS.md): accepted/revised decisions and trade-offs.
- [AI_PROMPTS.md](AI_PROMPTS.md): faithful scoped AI prompt disclosure.
- [AGENTS.md](AGENTS.md): persistent engineering workflow.
