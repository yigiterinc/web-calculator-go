package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestNewServerPort(t *testing.T) {
	tests := []struct {
		name    string
		port    string
		address string
		wantErr bool
	}{
		{name: "default", address: ":8080"},
		{name: "custom", port: "9000", address: ":9000"},
		{name: "lowest", port: "1", address: ":1"},
		{name: "highest", port: "65535", address: ":65535"},
		{name: "zero", port: "0", wantErr: true},
		{name: "negative", port: "-1", wantErr: true},
		{name: "out of range", port: "65536", wantErr: true},
		{name: "non numeric", port: "http", wantErr: true},
		{name: "address instead of port", port: "localhost:8080", wantErr: true},
		{name: "whitespace", port: " 8080", wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			server, err := newServer(tt.port)
			if tt.wantErr {
				if err == nil || server != nil {
					t.Fatalf("newServer(%q) = (%v, %v), want nil server and error", tt.port, server, err)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if server.Addr != tt.address {
				t.Errorf("address = %q, want %q", server.Addr, tt.address)
			}
		})
	}
}

func TestServerRoutes(t *testing.T) {
	server, err := newServer("")
	if err != nil {
		t.Fatal(err)
	}
	tests := []struct {
		path   string
		status int
	}{
		{path: "/api/calculate", status: http.StatusOK},
		{path: "/api/calculate/", status: http.StatusNotFound},
		{path: "/api/unknown", status: http.StatusNotFound},
		{path: "/", status: http.StatusNotFound},
	}
	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, tt.path, strings.NewReader(`{"operation":"multiply","a":12,"b":5}`))
			request.Header.Set("Content-Type", "application/json")
			response := httptest.NewRecorder()
			server.Handler.ServeHTTP(response, request)
			if response.Code != tt.status {
				t.Errorf("status = %d, want %d", response.Code, tt.status)
			}
			if tt.status == http.StatusOK && response.Body.String() != "{\"result\":60}\n" {
				t.Errorf("unexpected result: %s", response.Body.String())
			}
		})
	}
}
