package main

import (
	"errors"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"sezzle-calculator/internal/httpapi"
)

func main() {
	server, err := newServer(os.Getenv("PORT"))
	if err != nil {
		log.Fatal(err)
	}

	log.Printf("starting HTTP server on %s", server.Addr)
	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

func newServer(port string) (*http.Server, error) {
	if port == "" {
		port = "8080"
	}
	number, err := strconv.Atoi(port)
	if err != nil || number < 1 || number > 65535 {
		return nil, errors.New("PORT must be an integer between 1 and 65535")
	}

	return &http.Server{
		Addr:              ":" + strconv.Itoa(number),
		Handler:           httpapi.NewHandler(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}, nil
}
