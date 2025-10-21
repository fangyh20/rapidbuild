package config

import (
	"os"
	"strconv"
	"time"
)

type Config struct {
	// Server
	Port string

	// Database (Neon PostgreSQL)
	DatabaseURL string

	// JWT
	JWTSecret         string
	JWTExpiry         time.Duration
	RefreshTokenExpiry time.Duration

	// SMTP Email
	SMTPHost     string
	SMTPPort     int
	SMTPUsername string
	SMTPPassword string
	SMTPFrom     string

	// Google OAuth
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string

	// AWS S3
	AWSAccessKey string
	AWSSecretKey string
	AWSRegion    string
	S3Bucket     string

	// Vercel
	VercelToken string

	// RESTHeart (MongoDB API)
	RestHeartURL    string
	RestHeartAPIKey string

	// Workspace
	WorkspaceDir   string
	StarterCodeDir string

	// Frontend URL (for email links)
	FrontendURL string
}

func Load() *Config {
	jwtExpiry, _ := time.ParseDuration(getEnv("JWT_EXPIRY", "15m"))
	refreshExpiry, _ := time.ParseDuration(getEnv("REFRESH_TOKEN_EXPIRY", "168h")) // 7 days

	smtpPort, _ := strconv.Atoi(getEnv("SMTP_PORT", "587"))

	return &Config{
		// Server
		Port: getEnv("PORT", "8092"),

		// Database
		DatabaseURL: getEnv("DATABASE_URL", ""),

		// JWT
		JWTSecret:          getEnv("JWT_SECRET", ""),
		JWTExpiry:          jwtExpiry,
		RefreshTokenExpiry: refreshExpiry,

		// SMTP
		SMTPHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		SMTPPort:     smtpPort,
		SMTPUsername: getEnv("SMTP_USERNAME", ""),
		SMTPPassword: getEnv("SMTP_PASSWORD", ""),
		SMTPFrom:     getEnv("SMTP_FROM", ""),

		// Google OAuth
		GoogleClientID:     getEnv("GOOGLE_OAUTH_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_OAUTH_CLIENT_SECRET", ""),
		GoogleRedirectURL:  getEnv("GOOGLE_OAUTH_REDIRECT_URL", "http://localhost:5173/auth/google/callback"),

		// AWS S3
		AWSAccessKey: getEnv("AWS_ACCESS_KEY", ""),
		AWSSecretKey: getEnv("AWS_SECRET_KEY", ""),
		AWSRegion:    getEnv("AWS_REGION", "us-east-1"),
		S3Bucket:     getEnv("S3_BUCKET", "rapidbuild-apps"),

		// Vercel
		VercelToken: getEnv("VERCEL_TOKEN", ""),

		// RESTHeart
		RestHeartURL:    getEnv("RESTHEART_URL", "https://api.rapidbuild.app"),
		RestHeartAPIKey: getEnv("RESTHEART_API_KEY", ""),

		// Workspace
		WorkspaceDir:   getEnv("WORKSPACE_DIR", "/tmp/rapidbuild-workspaces"),
		StarterCodeDir: getEnv("STARTER_CODE_DIR", "../../react-app"),

		// Frontend
		FrontendURL: getEnv("FRONTEND_URL", "http://localhost:5173"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
