package main

import (
	"net/http"
	"net/http/httptest"
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

func TestScaffoldHasNoRoutes(t *testing.T) {
	server, err := newServer("")
	if err != nil {
		t.Fatal(err)
	}
	for _, path := range []string{"/", "/api/calculate", "/unknown"} {
		t.Run(path, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, path, nil)
			response := httptest.NewRecorder()
			server.Handler.ServeHTTP(response, request)
			if response.Code != http.StatusNotFound {
				t.Errorf("status = %d, want 404 for unimplemented route", response.Code)
			}
		})
	}
}
