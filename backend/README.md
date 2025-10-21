# RapidBuild Backend Service

Go-based backend service for the RapidBuild AI web builder platform. This service handles app management, version control, comment system, and AI-powered code generation.

## Features

- **User Authentication**: Supabase-based authentication with JWT
- **App Management**: Create, read, update, and delete applications
- **Version Control**: Track multiple versions of each application
- **Comment System**: Add and manage comments on specific UI elements
- **AI Code Generation**: Integrate with Claude CLI for automated code generation
- **S3 Storage**: Store app code and requirement files
- **Vercel Deployment**: Automatic deployment to Vercel for previews
- **Real-time Updates**: SSE for build progress monitoring
- **Row Level Security**: Supabase RLS for multi-tenant data isolation

## Prerequisites

- **Go 1.21+** (required for `slices` and `maps` packages)
- **Supabase Account** with project setup
- **AWS Account** with S3 bucket
- **Vercel Account** with API token
- **Claude CLI** installed for code generation

## Installation

1. Install dependencies:
```bash
go mod tidy
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Configure environment variables in `.env`:
```bash
# Update with your actual credentials
SUPABASE_URL=https://nbtazqqqhhhdlbsavgmg.supabase.co
SUPABASE_KEY=your_service_key
SUPABASE_JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY=your_aws_key
AWS_SECRET_KEY=your_aws_secret
S3_BUCKET=your_bucket_name
VERCEL_TOKEN=your_vercel_token
```

4. Set up Supabase database:
```bash
# Run the schema file in your Supabase SQL editor
# File: config/schema.sql
```

## Database Setup

Execute the SQL schema in your Supabase project:

```bash
psql $DATABASE_URL < config/schema.sql
```

Or use the Supabase dashboard SQL editor to run `config/schema.sql`.

### Tables Created:
- `apps` - User applications
- `versions` - App versions
- `comments` - User comments on UI elements
- `requirement_files` - Uploaded requirement files

All tables have Row Level Security (RLS) enabled for multi-tenant isolation.

## Running the Service

### Development:
```bash
go run cmd/server/main.go
```

### Production:
```bash
go build -o rapidbuild cmd/server/main.go
./rapidbuild
```

The service will start on port `8092` (configurable via `PORT` env var).

## API Endpoints

### Authentication
All endpoints except `/health` require Bearer token authentication:
```
Authorization: Bearer <supabase_jwt_token>
```

### Health Check
```
GET /health
```

### Apps
```
GET    /api/v1/apps              - List all user apps
POST   /api/v1/apps              - Create new app
GET    /api/v1/apps/{id}         - Get app details
DELETE /api/v1/apps/{id}         - Delete app
```

### Versions
```
GET    /api/v1/apps/{appId}/versions                    - List versions
POST   /api/v1/apps/{appId}/versions                    - Create version
GET    /api/v1/apps/{appId}/versions/{versionId}        - Get version
DELETE /api/v1/apps/{appId}/versions/{versionId}        - Delete version
POST   /api/v1/apps/{appId}/versions/{versionId}/promote - Promote to prod
```

### Comments
```
GET    /api/v1/apps/{appId}/comments                           - List draft comments
POST   /api/v1/apps/{appId}/comments                           - Add comment
DELETE /api/v1/apps/{appId}/comments/{commentId}               - Delete comment
GET    /api/v1/apps/{appId}/versions/{versionId}/comments      - Get version comments
```

### Build Progress (SSE)
```
GET    /api/v1/versions/{versionId}/progress  - Stream build progress
```

## Architecture

```
rapidbuild/backend/
├── cmd/
│   └── server/          # Main application entry point
├── internal/
│   ├── api/             # HTTP handlers
│   ├── services/        # Business logic
│   ├── models/          # Data models
│   ├── db/              # Database client (Supabase)
│   ├── middleware/      # Auth, CORS middleware
│   └── worker/          # AI build worker
├── config/              # Configuration and schema
└── go.mod
```

## Build Process

When a new version is created:

1. **Workspace Setup**: Creates temporary workspace
2. **Code Retrieval**: Downloads latest version from S3 or uses starter code
3. **AI Generation**: Runs Claude CLI with user requirements/comments
4. **Packaging**: Compresses generated code
5. **Storage**: Uploads to S3
6. **Deployment**: Deploys to Vercel for preview
7. **Cleanup**: Removes temporary workspace

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 8092 |
| SUPABASE_URL | Supabase project URL | - |
| SUPABASE_KEY | Supabase service key | - |
| SUPABASE_JWT_SECRET | JWT secret for token validation | - |
| AWS_ACCESS_KEY | AWS access key | - |
| AWS_SECRET_KEY | AWS secret key | - |
| AWS_REGION | AWS region | us-east-1 |
| S3_BUCKET | S3 bucket name | rapidbuild-apps |
| VERCEL_TOKEN | Vercel API token | - |
| WORKSPACE_DIR | Temporary workspace directory | /tmp/rapidbuild-workspaces |
| STARTER_CODE_DIR | Path to starter code | ../react-app |

## Development

### Adding New Endpoints

1. Create handler in `internal/api/`
2. Add route in `cmd/server/main.go`
3. Implement business logic in `internal/services/`

### Testing

```bash
go test ./...
```

## Deployment

### Using Docker

```bash
docker build -t rapidbuild-backend .
docker run -p 8092:8092 --env-file .env rapidbuild-backend
```

## Security

- **JWT Authentication**: All API endpoints protected
- **Row Level Security**: Supabase RLS ensures users can only access their data
- **CORS**: Configurable CORS middleware
- **Input Validation**: Request validation on all endpoints

## Troubleshooting

### Dependencies won't install
Ensure Go version is 1.21 or higher:
```bash
go version
```

### Database connection fails
Verify Supabase credentials and network access.

### Build worker fails
Ensure Claude CLI is installed and accessible:
```bash
claude --version
```

## License

MIT
