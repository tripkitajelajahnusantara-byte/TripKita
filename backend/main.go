package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"tripkita-provider/config"
	"tripkita-provider/database"
	"tripkita-provider/jobs"
	"tripkita-provider/routes"
	"tripkita-provider/services"
)

// shutdownTimeout memberi waktu permintaan yang sedang berjalan untuk selesai
// sebelum proses dimatikan paksa oleh orchestrator.
const shutdownTimeout = 20 * time.Second

func main() {
	log.SetFlags(log.LstdFlags | log.LUTC)

	// 1. Load Configurations
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Konfigurasi tidak valid: %v", err)
	}

	// Ensure uploads directory exists
	if err := os.MkdirAll("uploads", 0750); err != nil {
		log.Fatalf("Failed to create uploads directory: %v", err)
	}

	// 2. Initialize Database
	database.ConnectDB(cfg)

	// 3. Bangun seluruh service sekali, lalu pakai bersama oleh router dan job.
	container := services.NewContainer(database.DB, cfg)

	// 4. Jalankan job latar belakang dengan konteks yang ikut dibatalkan saat shutdown.
	jobCtx, stopJobs := context.WithCancel(context.Background())
	jobsStopped := jobs.NewRunner(database.DB, cfg, container).Start(jobCtx)

	// 5. Setup Routes
	r := routes.SetupRouter(database.DB, cfg, container)

	// 6. Start Server
	server := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	serverFailed := make(chan error, 1)
	go func() {
		log.Printf("Server berjalan pada port %s (env=%s)", cfg.Port, cfg.AppEnv)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			serverFailed <- err
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

	select {
	case err := <-serverFailed:
		stopJobs()
		log.Fatalf("Server gagal dijalankan: %v", err)
	case sig := <-stop:
		log.Printf("Sinyal %s diterima, memulai graceful shutdown", sig)
	}

	// 7. Berhenti menerima permintaan baru lebih dulu, lalu hentikan job dan
	// tutup koneksi database supaya tidak ada transaksi yang terputus.
	ctx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("Graceful shutdown gagal: %v", err)
	}

	stopJobs()
	select {
	case <-jobsStopped:
	case <-time.After(10 * time.Second):
		log.Println("Job latar belakang belum berhenti dalam batas waktu; proses tetap dihentikan")
	}

	database.Close()
	log.Println("Shutdown selesai")
}
