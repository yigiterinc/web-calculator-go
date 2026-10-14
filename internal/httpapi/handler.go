package httpapi

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"mime"
	"net/http"

	"sezzle-calculator/internal/calculator"
)

const maxBodyBytes = 4096

type calculationRequest struct {
	Operation json.RawMessage `json:"operation"`
	A         json.RawMessage `json:"a"`
	B         json.RawMessage `json:"b"`
}

type errorResponse struct {
	Error struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// NewHandler returns the application routes. A nil frontend serves only the API.
func NewHandler(frontend fs.FS) http.Handler {
	mux := http.NewServeMux()
	// Handle methods ourselves so 405 responses use the JSON error contract.
	mux.HandleFunc("/api/calculate", calculate)
	if frontend != nil {
		// Only the single page and built assets are frontend routes; API misses stay 404.
		mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, r *http.Request) {
			http.ServeFileFS(w, r, frontend, "index.html")
		})
		mux.Handle("GET /assets/", http.FileServerFS(frontend))
	}
	return mux
}

func calculate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		writeError(w, r, http.StatusMethodNotAllowed, "method_not_allowed", "Only POST is allowed.")
		return
	}

	mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mediaType != "application/json" || len(r.Header.Values("Content-Type")) != 1 {
		writeError(w, r, http.StatusUnsupportedMediaType, "unsupported_media_type", "Content-Type must be application/json.")
		return
	}

	body := http.MaxBytesReader(w, r.Body, maxBodyBytes)
	defer body.Close()
	// Read to the limit before decoding so trailing bytes count toward the cap.
	data, err := io.ReadAll(body)
	if err != nil {
		var limitErr *http.MaxBytesError
		if errors.As(err, &limitErr) {
			writeError(w, r, http.StatusRequestEntityTooLarge, "payload_too_large", "Request body must not exceed 4096 bytes.")
		} else {
			writeError(w, r, http.StatusBadRequest, "invalid_json", "Could not read the JSON request body.")
		}
		return
	}

	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	var input *calculationRequest
	if err := decoder.Decode(&input); err != nil || input == nil {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Body must be a JSON object with only operation, a, and b fields.")
		return
	}
	var extra json.RawMessage
	if err := decoder.Decode(&extra); err != io.EOF {
		writeError(w, r, http.StatusBadRequest, "invalid_json", "Body must contain exactly one JSON object.")
		return
	}

	var operation string
	if err := json.Unmarshal(input.Operation, &operation); err != nil {
		writeCalculationError(w, r, calculator.ErrUnsupportedOperation)
		return
	}
	// Validate the request enum before operands, as required by the wire contract.
	switch operation {
	case "add", "subtract", "multiply", "divide":
	default:
		writeCalculationError(w, r, calculator.ErrUnsupportedOperation)
		return
	}

	a, ok := decodeOperand(input.A)
	if !ok {
		writeError(w, r, http.StatusBadRequest, "invalid_operand", "Operand a must be a finite JSON number.")
		return
	}
	b, ok := decodeOperand(input.B)
	if !ok {
		writeError(w, r, http.StatusBadRequest, "invalid_operand", "Operand b must be a finite JSON number.")
		return
	}

	result, err := calculator.Calculate(operation, a, b)
	if err != nil {
		writeCalculationError(w, r, err)
		return
	}
	writeJSON(w, r, http.StatusOK, struct {
		Result float64 `json:"result"`
	}{Result: result})
}

func decodeOperand(raw json.RawMessage) (float64, bool) {
	// A pointer distinguishes missing/null from valid zero. Unmarshal rejects
	// wrong types and numeric literals that overflow float64.
	var value *float64
	if err := json.Unmarshal(raw, &value); err != nil || value == nil {
		return 0, false
	}
	return *value, true
}

func writeCalculationError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, calculator.ErrUnsupportedOperation):
		writeError(w, r, http.StatusBadRequest, "invalid_operation", "Operation must be add, subtract, multiply, or divide.")
	case errors.Is(err, calculator.ErrNonFiniteOperand):
		writeError(w, r, http.StatusBadRequest, "invalid_operand", "Operands must be finite JSON numbers.")
	case errors.Is(err, calculator.ErrDivisionByZero):
		writeError(w, r, http.StatusUnprocessableEntity, "division_by_zero", "Cannot divide by zero.")
	case errors.Is(err, calculator.ErrNonFiniteResult):
		writeError(w, r, http.StatusUnprocessableEntity, "result_out_of_range", "Result is outside the finite number range.")
	default:
		writeError(w, r, http.StatusInternalServerError, "internal_error", "An internal error occurred.")
	}
}

func writeError(w http.ResponseWriter, r *http.Request, status int, code, message string) {
	var response errorResponse
	response.Error.Code = code
	response.Error.Message = message
	writeJSON(w, r, status, response)
}

func writeJSON(w http.ResponseWriter, r *http.Request, status int, value any) {
	data, err := json.Marshal(value)
	if err != nil {
		// Encode before committing headers so serialization cannot send a false 200.
		status = http.StatusInternalServerError
		data = []byte(`{"error":{"code":"internal_error","message":"An internal error occurred."}}`)
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(status)
	if r.Method == http.MethodHead {
		return
	}
	if _, err := w.Write(append(data, '\n')); err != nil {
		// Headers are committed; a disconnected client cannot receive a new error.
		return
	}
}
