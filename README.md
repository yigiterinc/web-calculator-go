# Sezzle Calculator

A full-stack calculator take-home using Go and React/TypeScript. **Current status: server scaffold and calculator core implemented.** The core supports the four arithmetic operations with numeric validation. The local HTTP server starts, but no routes are registered yet; POST /api/calculate and the frontend are pending. Deployment is optional.

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

The formatter check should print nothing. Tests cover server configuration/unregistered routes and the calculator's arithmetic/error/numeric-edge behavior. The httpapi package remains documentation-only. Generate calculator-only coverage with:

```sh
mkdir -p coverage
go test -count=1 -coverprofile=coverage/calculator.out ./internal/calculator
go tool cover -func=coverage/calculator.out
go tool cover -html=coverage/calculator.out -o coverage/calculator.html
```

Reports are generated under the ignored coverage/ directory. Coverage is diagnostic, with no percentage gate; see TASKS.md for executed results and scope.

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
- `internal/httpapi`: transport package placeholder; no calculation handler yet.

`internal` keeps implementation packages private to this module tree. An explicit mux avoids global route registration. The unexported server constructor returns a server and error so configuration is testable without opening a socket; main owns environment access, logging, and listening. No application-specific interfaces or framework are needed.

The local module name `sezzle-calculator` avoids inventing a public Git destination. A remote can be selected at the submission milestone; adopting its canonical module path then is optional for this executable project. Frontend source will later live in src/, with a reducer-driven keypad and API-only arithmetic. No hosting adapter/configuration is included.

## Project records

- [TASKS.md](TASKS.md): approved scope, acceptance criteria, and executed verification.
- [docs/DESIGN.md](docs/DESIGN.md): accepted API/numeric policy and planned keypad state transitions.
- [docs/DECISIONS.md](docs/DECISIONS.md): accepted/revised decisions and trade-offs.
- [AI_PROMPTS.md](AI_PROMPTS.md): faithful scoped AI prompt disclosure.
- [AGENTS.md](AGENTS.md): persistent engineering workflow.
