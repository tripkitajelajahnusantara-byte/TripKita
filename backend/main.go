package main

import (
	"fmt"
	"log"
	"os"

	"tripkita-provider/config"
	"tripkita-provider/database"
	"tripkita-provider/routes"
)

func main() {
	// 1. Load Configurations
	cfg := config.LoadConfig()

	// Ensure uploads directory exists
	err := os.MkdirAll("uploads", 0755)
	if err != nil {
		log.Fatalf("Failed to create uploads directory: %v", err)
	}

	// 2. Initialize Database
	database.ConnectDB(cfg)

	// 3. Setup Routes
	r := routes.SetupRouter(database.DB, cfg)

	// 4. Start Server
	port := cfg.Port
	fmt.Printf("Server running on port %s\n", port)
	err = r.Run(":" + port)
	if err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
