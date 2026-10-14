package httpapi

import (
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
)

func TestFrontendRoutes(t *testing.T) {
	const index = `<!doctype html><div id="root"></div>`
	frontend := fstest.MapFS{
		"index.html":     {Data: []byte(index)},
		"assets/app.js":  {Data: []byte("console.log('calculator');")},
		"assets/app.css": {Data: []byte("body { margin: 0; }")},
		"api/index.html": {Data: []byte("must never be served")},
	}
	tests := []struct {
		name, method, path, body, wantBody, contentType string
		status                                          int
	}{
		{name: "page", method: "GET", path: "/", status: 200, wantBody: index, contentType: "text/html"},
		{name: "page HEAD", method: "HEAD", path: "/", status: 200, contentType: "text/html"},
		{name: "script", method: "GET", path: "/assets/app.js", status: 200, wantBody: "console.log('calculator');", contentType: "javascript"},
		{name: "stylesheet", method: "GET", path: "/assets/app.css", status: 200, wantBody: "body { margin: 0; }", contentType: "text/css"},
		{name: "missing asset", method: "GET", path: "/assets/missing.js", status: 404},
		{name: "unknown page", method: "GET", path: "/unknown", status: 404},
		{name: "page POST", method: "POST", path: "/", status: 405},
		{name: "asset POST", method: "POST", path: "/assets/app.js", status: 405},
		{name: "API root", method: "GET", path: "/api", status: 404},
		{name: "API directory", method: "GET", path: "/api/", status: 404},
		{name: "API unknown", method: "POST", path: "/api/unknown", status: 404},
		{name: "API trailing slash", method: "GET", path: "/api/calculate/", status: 404},
		{name: "API method", method: "GET", path: "/api/calculate", status: 405, contentType: "application/json"},
		{name: "API success", method: "POST", path: "/api/calculate", body: `{"operation":"multiply","a":12,"b":5}`, status: 200, wantBody: "{\"result\":60}\n", contentType: "application/json"},
		{name: "API error", method: "POST", path: "/api/calculate", body: `{"operation":"divide","a":8,"b":0}`, status: 422, wantBody: "division_by_zero", contentType: "application/json"},
		{name: "API validation", method: "POST", path: "/api/calculate", body: `{"operation":"add","a":null,"b":5}`, status: 400, wantBody: "invalid_operand", contentType: "application/json"},
	}
	handler := NewHandler(frontend)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := httptest.NewRequest(tt.method, tt.path, strings.NewReader(tt.body))
			r.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.ServeHTTP(w, r)
			if w.Code != tt.status {
				t.Fatalf("status = %d, want %d; body: %s", w.Code, tt.status, w.Body.String())
			}
			if tt.contentType != "" && !strings.Contains(w.Header().Get("Content-Type"), tt.contentType) {
				t.Errorf("Content-Type = %q, want %q", w.Header().Get("Content-Type"), tt.contentType)
			}
			if tt.wantBody != "" && !strings.Contains(w.Body.String(), tt.wantBody) {
				t.Errorf("body = %q, want %q", w.Body.String(), tt.wantBody)
			}
			if tt.method == "HEAD" && w.Body.Len() != 0 {
				t.Error("HEAD returned a body")
			}
			if strings.HasPrefix(tt.path, "/api") {
				if strings.Contains(w.Body.String(), index) || strings.Contains(w.Body.String(), "must never be served") {
					t.Error("API route returned frontend content")
				}
				if tt.status == 405 && w.Header().Get("Allow") != "POST" {
					t.Error("API method response lost Allow: POST")
				}
			}
		})
	}
}

func TestFrontendDisabled(t *testing.T) {
	for _, path := range []string{"/", "/assets/app.js"} {
		t.Run(path, func(t *testing.T) {
			w := httptest.NewRecorder()
			NewHandler(nil).ServeHTTP(w, httptest.NewRequest("GET", path, nil))
			if w.Code != 404 {
				t.Fatalf("status = %d, want 404 without a frontend", w.Code)
			}
		})
	}
}
