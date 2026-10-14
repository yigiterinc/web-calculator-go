package main

import (
	"errors"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"sezzle-calculator/internal/httpapi"
)

func main() {
	server, err := newServer(os.Getenv("PORT"), os.Getenv("STATIC_DIR"))
	if err != nil {
		log.Fatal(err)
	}

	log.Printf("starting HTTP server on %s", server.Addr)
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

func newServer(port, staticDir string) (*http.Server, error) {
	if port == "" {
		port = "8080"
	}
	number, err := strconv.Atoi(port)
	if err != nil || number < 1 || number > 65535 {
		return nil, errors.New("PORT must be an integer between 1 and 65535")
	}

	var frontend fs.FS
	if staticDir != "" {
		info, err := os.Stat(filepath.Join(staticDir, "index.html"))
		if err != nil {
			return nil, fmt.Errorf("STATIC_DIR must contain index.html: %w", err)
		}
		if !info.Mode().IsRegular() {
			return nil, errors.New("STATIC_DIR index.html must be a regular file")
		}
		frontend = os.DirFS(staticDir)
	}

	return &http.Server{
		Addr:              ":" + strconv.Itoa(number),
		Handler:           httpapi.NewHandler(frontend),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}, nil
}
