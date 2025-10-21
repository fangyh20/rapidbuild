package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rapidbuildapp/rapidbuild/internal/db"
	"github.com/rapidbuildapp/rapidbuild/internal/models"
)

type VersionService struct {
	DB *db.PostgresClient
}

func NewVersionService(dbClient *db.PostgresClient) *VersionService {
	return &VersionService{DB: dbClient}
}

// CreateVersion creates a new version for an app
func (s *VersionService) CreateVersion(ctx context.Context, appID string) (*models.Version, error) {
	// Get the latest version number
	var maxVersion int
	query := `SELECT COALESCE(MAX(version_number), 0) FROM versions WHERE app_id = $1`
	err := s.DB.QueryRow(ctx, query, appID).Scan(&maxVersion)
	if err != nil {
		return nil, fmt.Errorf("failed to get max version: %w", err)
	}

	version := models.Version{
		ID:            uuid.New().String(),
		AppID:         appID,
		VersionNumber: maxVersion + 1,
		Status:        "pending",
		CreatedAt:     time.Now(),
	}

	insertQuery := `
		INSERT INTO versions (id, app_id, version_number, status, created_at)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, app_id, version_number, status, s3_code_path, vercel_url, vercel_deploy_id, build_log, error_message, created_at
	`

	err = s.DB.QueryRow(ctx, insertQuery,
		version.ID, version.AppID, version.VersionNumber, version.Status, version.CreatedAt,
	).Scan(
		&version.ID, &version.AppID, &version.VersionNumber, &version.Status,
		&version.S3CodePath, &version.VercelURL, &version.VercelDeployID,
		&version.BuildLog, &version.ErrorMessage, &version.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create version: %w", err)
	}

	return &version, nil
}

// GetVersion retrieves a version by ID
func (s *VersionService) GetVersion(ctx context.Context, versionID string) (*models.Version, error) {
	version := &models.Version{}
	query := `
		SELECT id, app_id, version_number, status, s3_code_path, vercel_url, vercel_deploy_id, build_log, error_message, created_at
		FROM versions
		WHERE id = $1
	`

	err := s.DB.QueryRow(ctx, query, versionID).Scan(
		&version.ID, &version.AppID, &version.VersionNumber, &version.Status,
		&version.S3CodePath, &version.VercelURL, &version.VercelDeployID,
		&version.BuildLog, &version.ErrorMessage, &version.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("version not found: %w", err)
	}

	return version, nil
}

// ListVersions retrieves all versions for an app
func (s *VersionService) ListVersions(ctx context.Context, appID string) ([]models.Version, error) {
	query := `
		SELECT id, app_id, version_number, status, s3_code_path, vercel_url, vercel_deploy_id, build_log, error_message, created_at
		FROM versions
		WHERE app_id = $1
		ORDER BY version_number DESC
	`

	rows, err := s.DB.Query(ctx, query, appID)
	if err != nil {
		return nil, fmt.Errorf("failed to list versions: %w", err)
	}
	defer rows.Close()

	var versions []models.Version
	for rows.Next() {
		var version models.Version
		err := rows.Scan(
			&version.ID, &version.AppID, &version.VersionNumber, &version.Status,
			&version.S3CodePath, &version.VercelURL, &version.VercelDeployID,
			&version.BuildLog, &version.ErrorMessage, &version.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan version: %w", err)
		}
		versions = append(versions, version)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("error iterating versions: %w", err)
	}

	return versions, nil
}

// UpdateVersion updates a version
func (s *VersionService) UpdateVersion(ctx context.Context, versionID string, updates map[string]interface{}) (*models.Version, error) {
	// Build dynamic UPDATE query
	query := `UPDATE versions SET `
	args := []interface{}{}
	argCount := 1
	setClauses := []string{}

	// Handle all possible update fields
	if status, ok := updates["status"].(string); ok {
		setClauses = append(setClauses, fmt.Sprintf("status = $%d", argCount))
		args = append(args, status)
		argCount++
	}

	if s3CodePath, ok := updates["s3_code_path"].(string); ok {
		setClauses = append(setClauses, fmt.Sprintf("s3_code_path = $%d", argCount))
		args = append(args, s3CodePath)
		argCount++
	}

	if vercelURL, ok := updates["vercel_url"].(string); ok {
		setClauses = append(setClauses, fmt.Sprintf("vercel_url = $%d", argCount))
		args = append(args, vercelURL)
		argCount++
	}

	if vercelDeployID, ok := updates["vercel_deploy_id"].(string); ok {
		setClauses = append(setClauses, fmt.Sprintf("vercel_deploy_id = $%d", argCount))
		args = append(args, vercelDeployID)
		argCount++
	}

	if buildLog, ok := updates["build_log"].(string); ok {
		setClauses = append(setClauses, fmt.Sprintf("build_log = $%d", argCount))
		args = append(args, buildLog)
		argCount++
	}

	if errorMessage, ok := updates["error_message"].(*string); ok {
		setClauses = append(setClauses, fmt.Sprintf("error_message = $%d", argCount))
		args = append(args, errorMessage)
		argCount++
	}

	// Legacy fields for backwards compatibility
	if deployURL, ok := updates["deploy_url"].(string); ok {
		setClauses = append(setClauses, fmt.Sprintf("vercel_url = $%d", argCount))
		args = append(args, deployURL)
		argCount++
	}

	if s3Key, ok := updates["s3_key"].(string); ok {
		setClauses = append(setClauses, fmt.Sprintf("s3_code_path = $%d", argCount))
		args = append(args, s3Key)
		argCount++
	}

	// If no fields to update, return error
	if len(setClauses) == 0 {
		return nil, fmt.Errorf("no fields to update")
	}

	query += strings.Join(setClauses, ", ")
	query += fmt.Sprintf(" WHERE id = $%d", argCount)
	args = append(args, versionID)

	query += " RETURNING id, app_id, version_number, status, s3_code_path, vercel_url, vercel_deploy_id, build_log, error_message, created_at"

	version := &models.Version{}
	err := s.DB.QueryRow(ctx, query, args...).Scan(
		&version.ID, &version.AppID, &version.VersionNumber, &version.Status,
		&version.S3CodePath, &version.VercelURL, &version.VercelDeployID,
		&version.BuildLog, &version.ErrorMessage, &version.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("failed to update version: %w", err)
	}

	return version, nil
}

// DeleteVersion deletes a version
func (s *VersionService) DeleteVersion(ctx context.Context, versionID string) error {
	query := `DELETE FROM versions WHERE id = $1`
	rowsAffected, err := s.DB.Exec(ctx, query, versionID)
	if err != nil {
		return fmt.Errorf("failed to delete version: %w", err)
	}

	if rowsAffected == 0 {
		return fmt.Errorf("version not found")
	}

	return nil
}

// PromoteVersion promotes a version to production
func (s *VersionService) PromoteVersion(ctx context.Context, versionID string) error {
	version, err := s.GetVersion(ctx, versionID)
	if err != nil {
		return err
	}

	// Update the app's prod_version
	appService := NewAppService(s.DB)
	_, err = appService.UpdateApp(ctx, version.AppID, "", map[string]interface{}{
		"prod_version": version.VersionNumber,
	})
	if err != nil {
		return err
	}

	// Update version status
	_, err = s.UpdateVersion(ctx, versionID, map[string]interface{}{
		"status": "promoted",
	})

	return err
}
