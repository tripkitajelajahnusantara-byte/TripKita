package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"tripkita-provider/config"
	"tripkita-provider/database"
	"tripkita-provider/routes"
)

func main() {
	// 1. Load Configurations
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Konfigurasi tidak valid: %v", err)
	}

	// Ensure uploads directory exists
	err = os.MkdirAll("uploads", 0750)
	if err != nil {
		log.Fatalf("Failed to create uploads directory: %v", err)
	}

	// 2. Initialize Database
	database.ConnectDB(cfg)

	// 3. Setup Routes
	r := routes.SetupRouter(database.DB, cfg)

	// 4. Start Server
	port := cfg.Port
	server := &http.Server{
		Addr:              ":" + port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	fmt.Printf("Server running on port %s\n", port)
	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Graceful shutdown gagal: %v", err)
	}
}
