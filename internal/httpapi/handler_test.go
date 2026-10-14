package httpapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"sezzle-calculator/internal/calculator"
)

func TestCalculate(t *testing.T) {
	tests := []struct {
		name    string
		body    string
		status  int
		code    string
		result  float64
		message string
	}{
		{name: "add", body: `{"operation":"add","a":2,"b":3}`, status: 200, result: 5},
		{name: "subtract negative", body: `{"operation":"subtract","a":-2,"b":-3}`, status: 200, result: 1},
		{name: "multiply", body: `{"operation":"multiply","a":12,"b":5}`, status: 200, result: 60},
		{name: "divide fractional", body: `{"operation":"divide","a":3,"b":12}`, status: 200, result: 0.25},
		{name: "decimals", body: `{"operation":"add","a":0.5,"b":0.25}`, status: 200, result: 0.75},
		{name: "zero left", body: `{"operation":"add","a":0,"b":2}`, status: 200, result: 2},
		{name: "zero right", body: `{"operation":"multiply","a":2,"b":0}`, status: 200, result: 0},
		{name: "negative zero result", body: `{"operation":"multiply","a":-2,"b":0}`, status: 200, result: 0},
		{name: "exponents", body: `{"operation":"add","a":1e2,"b":2e-1}`, status: 200, result: 100.2},
		{name: "small divisor", body: `{"operation":"divide","a":5e-324,"b":5e-324}`, status: 200, result: 1},
		{name: "underflow", body: `{"operation":"multiply","a":5e-324,"b":0.5}`, status: 200, result: 0},
		{name: "binary rounding", body: `{"operation":"add","a":0.1,"b":0.2}`, status: 200, result: 0.30000000000000004},
		{name: "divide by zero", body: `{"operation":"divide","a":1,"b":0}`, status: 422, code: "division_by_zero", message: "Cannot divide by zero."},
		{name: "divide by negative zero", body: `{"operation":"divide","a":1,"b":-0}`, status: 422, code: "division_by_zero"},
		{name: "unsupported operation", body: `{"operation":"power","a":2,"b":3}`, status: 400, code: "invalid_operation"},
		{name: "operation case", body: `{"operation":"ADD","a":2,"b":3}`, status: 400, code: "invalid_operation"},
		{name: "operation whitespace", body: `{"operation":" add ","a":2,"b":3}`, status: 400, code: "invalid_operation"},
		{name: "missing operation", body: `{"a":2,"b":3}`, status: 400, code: "invalid_operation"},
		{name: "null operation", body: `{"operation":null,"a":2,"b":3}`, status: 400, code: "invalid_operation"},
		{name: "number operation", body: `{"operation":1,"a":2,"b":3}`, status: 400, code: "invalid_operation"},
		{name: "object operation", body: `{"operation":{},"a":2,"b":3}`, status: 400, code: "invalid_operation"},
		{name: "empty object", body: `{}`, status: 400, code: "invalid_operation"},
		{name: "missing a", body: `{"operation":"add","b":3}`, status: 400, code: "invalid_operand"},
		{name: "missing b", body: `{"operation":"add","a":2}`, status: 400, code: "invalid_operand"},
		{name: "null a", body: `{"operation":"add","a":null,"b":3}`, status: 400, code: "invalid_operand"},
		{name: "null b", body: `{"operation":"add","a":2,"b":null}`, status: 400, code: "invalid_operand"},
		{name: "string a", body: `{"operation":"add","a":"2","b":3}`, status: 400, code: "invalid_operand"},
		{name: "string b", body: `{"operation":"add","a":2,"b":"3"}`, status: 400, code: "invalid_operand"},
		{name: "boolean a", body: `{"operation":"add","a":true,"b":3}`, status: 400, code: "invalid_operand"},
		{name: "array b", body: `{"operation":"add","a":2,"b":[]}`, status: 400, code: "invalid_operand"},
		{name: "object b", body: `{"operation":"add","a":2,"b":{}}`, status: 400, code: "invalid_operand"},
		{name: "operand overflow a", body: `{"operation":"add","a":1e309,"b":3}`, status: 400, code: "invalid_operand"},
		{name: "operand overflow b", body: `{"operation":"add","a":2,"b":-1e309}`, status: 400, code: "invalid_operand"},
		{name: "operation checked before operands", body: `{"b":null,"a":"bad","operation":"power"}`, status: 400, code: "invalid_operation"},
		{name: "a checked before b", body: `{"b":null,"a":"bad","operation":"add"}`, status: 400, code: "invalid_operand", message: "Operand a must be a finite JSON number."},
		{name: "empty JSON", body: ``, status: 400, code: "invalid_json"},
		{name: "whitespace only", body: " \n\t", status: 400, code: "invalid_json"},
		{name: "malformed JSON", body: `{"operation":`, status: 400, code: "invalid_json"},
		{name: "literal NaN", body: `{"operation":"add","a":NaN,"b":3}`, status: 400, code: "invalid_json"},
		{name: "literal Infinity", body: `{"operation":"add","a":Infinity,"b":3}`, status: 400, code: "invalid_json"},
		{name: "unknown field", body: `{"operation":"add","a":2,"b":3,"secret":1}`, status: 400, code: "invalid_json"},
		{name: "unknown field before invalid operation", body: `{"operation":"power","extra":1}`, status: 400, code: "invalid_json"},
		{name: "multiple objects", body: `{"operation":"add","a":2,"b":3}{}`, status: 400, code: "invalid_json"},
		{name: "trailing null", body: `{"operation":"add","a":2,"b":3} null`, status: 400, code: "invalid_json"},
		{name: "trailing junk", body: `{"operation":"add","a":2,"b":3} garbage`, status: 400, code: "invalid_json"},
		{name: "top level null", body: `null`, status: 400, code: "invalid_json"},
		{name: "top level array", body: `[]`, status: 400, code: "invalid_json"},
		{name: "top level number", body: `42`, status: 400, code: "invalid_json"},
		{name: "top level string", body: `"hello"`, status: 400, code: "invalid_json"},
		{name: "trailing whitespace", body: "{\"operation\":\"add\",\"a\":2,\"b\":3}\n \t", status: 200, result: 5},
		{name: "case tolerant fields", body: `{"Operation":"add","A":2,"B":3}`, status: 200, result: 5},
		{name: "duplicate last value", body: `{"operation":"add","a":9,"a":2,"b":3}`, status: 200, result: 5},
		{name: "duplicate case variants", body: `{"operation":"add","a":9,"A":2,"b":3}`, status: 200, result: 5},
		{name: "duplicate invalid then valid", body: `{"operation":"add","a":"bad","a":2,"b":3}`, status: 200, result: 5},
		{name: "duplicate operand last null", body: `{"operation":"add","a":2,"a":null,"b":3}`, status: 400, code: "invalid_operand"},
		{name: "duplicate operation last null", body: `{"operation":"add","operation":null,"a":2,"b":3}`, status: 400, code: "invalid_operation"},
		{name: "addition overflow", body: `{"operation":"add","a":1e308,"b":1e308}`, status: 422, code: "result_out_of_range"},
		{name: "subtraction overflow", body: `{"operation":"subtract","a":-1e308,"b":1e308}`, status: 422, code: "result_out_of_range"},
		{name: "multiplication overflow", body: `{"operation":"multiply","a":1e308,"b":2}`, status: 422, code: "result_out_of_range"},
		{name: "division overflow", body: `{"operation":"divide","a":1e308,"b":0.1}`, status: 422, code: "result_out_of_range"},
	}
	handler := NewHandler(nil)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := httptest.NewRequest(http.MethodPost, "/api/calculate", strings.NewReader(tt.body))
			r.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, r)
			assertResponse(t, w, tt.status, tt.code, tt.result)
			if tt.message != "" {
				var response errorResponse
				if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
					t.Fatal(err)
				}
				if response.Error.Message != tt.message {
					t.Errorf("message = %q, want %q", response.Error.Message, tt.message)
				}
			}
		})
	}
}

func TestContentType(t *testing.T) {
	tests := []struct {
		name   string
		values []string
		status int
	}{
		{name: "missing", status: 415},
		{name: "empty", values: []string{""}, status: 415},
		{name: "wrong type", values: []string{"text/plain"}, status: 415},
		{name: "form", values: []string{"application/x-www-form-urlencoded"}, status: 415},
		{name: "json suffix", values: []string{"application/problem+json"}, status: 415},
		{name: "malformed parameter", values: []string{"application/json; charset"}, status: 415},
		{name: "repeated header", values: []string{"application/json", "text/plain"}, status: 415},
		{name: "json", values: []string{"application/json"}, status: 200},
		{name: "charset", values: []string{"application/json; charset=utf-8"}, status: 200},
		{name: "case insensitive media type", values: []string{"Application/JSON"}, status: 200},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := httptest.NewRequest(http.MethodPost, "/api/calculate", strings.NewReader(`{"operation":"add","a":2,"b":3}`))
			for _, value := range tt.values {
				r.Header.Add("Content-Type", value)
			}
			w := httptest.NewRecorder()
			NewHandler(nil).ServeHTTP(w, r)
			code := ""
			if tt.status == 415 {
				code = "unsupported_media_type"
			}
			assertResponse(t, w, tt.status, code, 5)
		})
	}
}

func TestMethods(t *testing.T) {
	for _, method := range []string{"GET", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD", "post"} {
		t.Run(method, func(t *testing.T) {
			// Missing media type and malformed input must not hide the method error.
			r := httptest.NewRequest(method, "/api/calculate", strings.NewReader("invalid"))
			w := httptest.NewRecorder()
			NewHandler(nil).ServeHTTP(w, r)
			if w.Header().Get("Allow") != "POST" {
				t.Errorf("Allow = %q, want POST", w.Header().Get("Allow"))
			}
			if method == "HEAD" {
				if w.Code != 405 || w.Body.Len() != 0 {
					t.Errorf("HEAD response = %d %q, want 405 without body", w.Code, w.Body.String())
				}
				assertHeaders(t, w)
				return
			}
			assertResponse(t, w, 405, "method_not_allowed", 0)
		})
	}
}

func TestBodyLimit(t *testing.T) {
	valid := `{"operation":"add","a":2,"b":3}`
	for _, size := range []int{4095, 4096, 4097} {
		for _, unknownLength := range []bool{false, true} {
			t.Run(fmt.Sprintf("bytes=%d/unknownLength=%t", size, unknownLength), func(t *testing.T) {
				body := valid + strings.Repeat(" ", size-len(valid))
				r := httptest.NewRequest(http.MethodPost, "/api/calculate", strings.NewReader(body))
				r.Header.Set("Content-Type", "application/json")
				if unknownLength {
					r.ContentLength = -1
				}
				w := httptest.NewRecorder()
				NewHandler(nil).ServeHTTP(w, r)
				if size > 4096 {
					assertResponse(t, w, 413, "payload_too_large", 0)
				} else {
					assertResponse(t, w, 200, "", 5)
				}
			})
		}
	}
}

func TestCalculationErrorMapping(t *testing.T) {
	// Wrapped errors check the errors.Is contract without changing the core or
	// injecting a fake calculator into production code.
	tests := []struct {
		err    error
		status int
		code   string
	}{
		{err: calculator.ErrUnsupportedOperation, status: 400, code: "invalid_operation"},
		{err: calculator.ErrNonFiniteOperand, status: 400, code: "invalid_operand"},
		{err: calculator.ErrDivisionByZero, status: 422, code: "division_by_zero"},
		{err: calculator.ErrNonFiniteResult, status: 422, code: "result_out_of_range"},
		{err: errors.New("private diagnostic"), status: 500, code: "internal_error"},
	}
	for _, tt := range tests {
		t.Run(tt.code, func(t *testing.T) {
			w := httptest.NewRecorder()
			r := httptest.NewRequest(http.MethodPost, "/api/calculate", nil)
			writeCalculationError(w, r, fmt.Errorf("private diagnostic: %w", tt.err))
			assertResponse(t, w, tt.status, tt.code, 0)
			if strings.Contains(w.Body.String(), "private diagnostic") {
				t.Error("response leaked internal error details")
			}
		})
	}
}

type failedBody struct {
	closed bool
}

func (*failedBody) Read([]byte) (int, error) { return 0, errors.New("private read error") }
func (b *failedBody) Close() error           { b.closed = true; return nil }

func TestBodyReadFailure(t *testing.T) {
	body := &failedBody{}
	r := httptest.NewRequest(http.MethodPost, "/api/calculate", nil)
	r.Body = body
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	NewHandler(nil).ServeHTTP(w, r)
	assertResponse(t, w, 400, "invalid_json", 0)
	if !body.closed {
		t.Error("request body was not closed")
	}
	if strings.Contains(w.Body.String(), "private read error") {
		t.Error("response leaked the body read error")
	}
}

func assertHeaders(t *testing.T, w *httptest.ResponseRecorder) {
	t.Helper()
	for name, want := range map[string]string{
		"Content-Type":           "application/json",
		"Cache-Control":          "no-store",
		"X-Content-Type-Options": "nosniff",
	} {
		if got := w.Header().Get(name); got != want {
			t.Errorf("%s = %q, want %q", name, got, want)
		}
	}
}

func assertResponse(t *testing.T, w *httptest.ResponseRecorder, status int, code string, result float64) {
	t.Helper()
	if w.Code != status {
		t.Fatalf("status = %d, want %d; body: %s", w.Code, status, w.Body.String())
	}
	assertHeaders(t, w)
	var response map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("invalid response JSON: %v; body: %s", err, w.Body.String())
	}
	if len(response) != 1 {
		t.Fatalf("want exactly one response field, got %v", response)
	}
	if code == "" {
		if got, ok := response["result"].(float64); !ok || got != result {
			t.Errorf("result = %v, want %v", response["result"], result)
		}
		return
	}
	failure, ok := response["error"].(map[string]any)
	if !ok || len(failure) != 2 {
		t.Fatalf("want error object with code and message, got %v", response)
	}
	if failure["code"] != code {
		t.Errorf("code = %v, want %s", failure["code"], code)
	}
	if message, ok := failure["message"].(string); !ok || message == "" {
		t.Errorf("missing error message: %v", failure)
	}
}
