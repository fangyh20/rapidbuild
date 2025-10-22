# RapidBuild Platform

An AI-powered web application builder that allows users to create, iterate, and deploy web applications using natural language requirements and visual feedback.

## Architecture Overview

RapidBuild is a full-stack platform consisting of:
- **Backend (Go)**: RESTful API server handling authentication, app management, and AI-driven code generation
- **Frontend (React + TypeScript)**: Web interface for managing apps, providing feedback, and viewing live previews
- **AI Agent**: Python-based code generation using Claude AI
- **Infrastructure**: PostgreSQL, MongoDB, Redis, AWS S3, and Vercel for deployment

## Directory Structure

```
rapidbuild/
├── backend/              # Go backend service
│   ├── cmd/             # Application entrypoints
│   │   ├── server/      # Main HTTP server
│   │   └── test_build/  # Build testing utilities
│   ├── config/          # Configuration and database schemas
│   ├── internal/        # Internal packages
│   │   ├── api/         # HTTP handlers (apps, versions, comments, SSE, auth)
│   │   ├── db/          # Database connection management
│   │   ├── middleware/  # HTTP middleware (CORS, auth, logging)
│   │   ├── models/      # Data models
│   │   ├── services/    # Business logic (auth, apps, versions, vercel)
│   │   └── worker/      # Background build worker
│   └── .env             # Environment configuration
├── frontend/            # React + TypeScript frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── lib/         # API client, auth, and utilities
│   │   └── pages/       # Page components (Dashboard, AppDetail, Login, etc.)
│   └── .env             # Frontend environment configuration
└── common/              # Shared code between services
```

## Features

### User Authentication
- Email/password authentication with JWT tokens
- Google OAuth 2.0 integration
- Email verification and password reset flows
- Refresh token mechanism for session management

### App Management
- Create apps from natural language requirements
- Upload requirement files (PDFs, images, documents)
- Track multiple versions per app
- Visual comment system for providing feedback
- Real-time build progress via Server-Sent Events (SSE)

### Build Pipeline
1. User provides requirements and comments
2. Backend triggers AI agent (Claude) to generate React code
3. Code is packaged and uploaded to AWS S3
4. Vercel deploys the generated app
5. Real-time progress updates via Redis Pub/Sub → SSE
6. Users can preview deployed apps with secure tokens

### Tech Stack

**Backend:**
- Go 1.24
- Gorilla Mux (HTTP routing)
- PostgreSQL (Neon) - User data, apps, versions, comments
- MongoDB - Preview tokens and app metadata
- Redis (Upstash) - Real-time progress broadcasting
- AWS S3 - Code storage
- Vercel API - App deployment

**Frontend:**
- React 18
- TypeScript
- Vite (build tool)
- TanStack Query (data fetching)
- Zustand (state management)
- Tailwind CSS + Lucide icons
- Axios (HTTP client)
- React Router (routing)

## Getting Started

### Prerequisites

- Go 1.24+
- Node.js 18+ and npm
- PostgreSQL database (Neon recommended)
- MongoDB instance (or MongoDB Atlas)
- Redis instance (Upstash recommended)
- AWS S3 bucket
- Vercel account with API token
- Google OAuth credentials (optional)
- Claude API access for AI agent

### Backend Setup

1. **Install Go dependencies:**
   ```bash
   cd backend
   go mod download
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

   Required variables:
   - `PORT` - Server port (default: 8092)
   - `DATABASE_URL` - PostgreSQL connection string
   - `JWT_SECRET` - Secret for JWT token signing
   - `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `AWS_REGION`, `S3_BUCKET` - AWS S3 configuration
   - `VERCEL_TOKEN` - Vercel API token
   - `REDIS_URL` - Redis connection string
   - `RESTHEART_URL`, `RESTHEART_API_KEY` - MongoDB API credentials
   - `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET` - OAuth credentials
   - `SMTP_*` - Email service configuration

3. **Initialize database:**
   ```bash
   # PostgreSQL
   psql $DATABASE_URL -f config/neon_schema.sql
   ```

4. **Build and run:**
   ```bash
   go build -o rapidbuild cmd/server/main.go
   ./rapidbuild
   ```

   Server runs on http://localhost:8092

### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env
   ```

   Required variables:
   - `VITE_API_BASE_URL` - Backend API URL (e.g., http://localhost:8092/api/v1)

3. **Run development server:**
   ```bash
   npm run dev
   ```

   Frontend runs on http://localhost:5173

4. **Build for production:**
   ```bash
   npm run build
   ```

## API Endpoints

### Authentication
- `POST /api/v1/auth/signup` - Create new account
- `POST /api/v1/auth/login` - Login with email/password
- `GET /api/v1/auth/google` - Google OAuth login
- `GET /api/v1/auth/google/callback` - OAuth callback
- `POST /api/v1/auth/refresh` - Refresh access token
- `GET /api/v1/auth/me` - Get current user
- `GET /api/v1/auth/verify-email?token=xxx` - Verify email
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password

### Apps
- `GET /api/v1/apps` - List user's apps
- `POST /api/v1/apps` - Create new app
- `GET /api/v1/apps/{id}` - Get app details
- `DELETE /api/v1/apps/{id}` - Delete app
- `POST /api/v1/apps/{id}/preview-token` - Generate preview token

### Versions
- `GET /api/v1/apps/{appId}/versions` - List app versions
- `POST /api/v1/apps/{appId}/versions` - Create new version (triggers build)
- `GET /api/v1/apps/{appId}/versions/{versionId}` - Get version details
- `DELETE /api/v1/apps/{appId}/versions/{versionId}` - Delete version
- `GET /api/v1/versions/{versionId}/progress?token=xxx` - SSE stream for build progress

### Comments
- `GET /api/v1/apps/{appId}/comments` - List draft comments
- `POST /api/v1/apps/{appId}/comments` - Add comment
- `DELETE /api/v1/apps/{appId}/comments/{commentId}` - Delete comment

### Uploads
- `POST /api/v1/upload/requirement-file` - Upload requirement file

## Development

### Backend Development

**Project Structure:**
- `cmd/server/main.go` - Application entry point
- `internal/api/` - HTTP handlers organized by resource
- `internal/services/` - Business logic layer
- `internal/worker/` - Background job processing (builds)
- `internal/middleware/` - HTTP middleware
- `internal/models/` - Data structures

**Key Components:**
- **Builder** (`internal/worker/builder.go`) - Orchestrates the build process
- **SSE Handler** (`internal/api/sse.go`) - Real-time progress updates via Redis Pub/Sub
- **Auth Service** (`internal/services/auth_service.go`) - Authentication and user management
- **Vercel Service** (`internal/services/vercel_service.go`) - Deployment automation

**Adding New Endpoints:**
1. Define handler in `internal/api/`
2. Add business logic in `internal/services/`
3. Register route in `cmd/server/main.go`
4. Add middleware if needed (auth, CORS, etc.)

**Database Migrations:**
- Update `config/neon_schema.sql`
- Apply manually via psql or migration tool

### Frontend Development

**Project Structure:**
- `src/pages/` - Page-level components
- `src/components/` - Reusable UI components
- `src/lib/api.ts` - API client with axios
- `src/lib/auth.ts` - Authentication utilities
- `src/lib/store.ts` - Global state management (Zustand)

**Key Features:**
- **Real-time Updates**: SSE connection for build progress
- **File Uploads**: Drag & drop or file picker for requirements
- **Preview System**: Secure iframe preview with token-based auth
- **Comment System**: Visual feedback on specific UI elements

**Adding New Pages:**
1. Create component in `src/pages/`
2. Add route in `src/main.tsx`
3. Update navigation if needed

### SDK Development & Testing

The RapidBuild platform uses `rapidbuildapp` SDK (published to npm) which is integrated into generated apps. When developing new SDK features or fixing bugs, you need to test changes with actual deployed apps.

#### SDK Location

The SDK source code is located at: `../rapidbuild-sdk/`

Key files:
- `src/components/RapidBuildProvider.jsx` - Main provider component
- `src/components/ElementSelector.jsx` - Element selection for edit mode
- `src/hooks/` - React hooks for data operations

#### Testing SDK Changes

When you make changes to the SDK, follow this workflow to test with deployed apps:

**1. Update SDK Code**

```bash
cd ../rapidbuild-sdk
# Make your changes to src/
npm run build  # Build the SDK
```

**2. Publish New SDK Version**

```bash
# Update version in package.json
npm version patch  # or minor/major
npm publish
```

**3. Test with Existing Deployed App**

To verify SDK changes work with actual deployed apps:

```bash
# Query database for recent apps
PGPASSWORD='npg_WGh5vlMS8wIU' psql 'postgresql://...' -t -c \
  "SELECT id, app_id, s3_code_path, vercel_url FROM versions WHERE status = 'completed' ORDER BY created_at DESC LIMIT 3;"

# Download app code from S3
mkdir -p /tmp/app-test && cd /tmp/app-test
aws s3 cp s3://rapidbuild-apps/apps/{app-id}/versions/{version-id}/code.tar.gz .
tar -xzf code.tar.gz

# Update SDK version in package.json
sed -i 's/"rapidbuildapp": "^X.X.X"/"rapidbuildapp": "^X.X.Y"/' package.json

# Install new SDK version
pnpm install

# Verify new version installed
pnpm list rapidbuildapp
```

**4. Deploy to Vercel**

```bash
# Link to existing Vercel project
vercel link --project {app-id} --yes

# Deploy to production
vercel --prod

# Note the deployment URL from output
```

**5. Create New Version in Database**

```bash
# Get current max version number
PGPASSWORD='npg_WGh5vlMS8wIU' psql 'postgresql://...' -t -c \
  "SELECT MAX(version_number) FROM versions WHERE app_id = '{app-id}';"

# Insert new version record
PGPASSWORD='npg_WGh5vlMS8wIU' psql 'postgresql://...' -c "
INSERT INTO versions (id, app_id, version_number, status, vercel_url, vercel_deploy_id, created_at, completed_at)
VALUES (
  gen_random_uuid(),
  '{app-id}',
  {version-number},
  'completed',
  'https://{deployment-url}',
  '{vercel-deploy-id}',
  NOW(),
  NOW()
) RETURNING id, version_number, vercel_url;"
```

**6. Verify in Platform UI**

1. Navigate to the app in RapidBuild platform
2. Select the new version you just created
3. Test the SDK features (e.g., element selector, data hooks)
4. Check browser console for debug logs
5. Verify functionality works as expected

#### Example: Testing Element Selector Feature

When testing the element selector feature:

1. **Frontend Platform**: Open browser console and watch for:
   - `[AppDetail] Sending LAUNCH_ELEMENT_SELECTOR to iframe` - Platform sends message
   - `[AppDetail] Element selected:` - Platform receives selection

2. **Deployed App (in iframe)**: Console shows:
   - `[ElementSelector] Component mounted and listening for messages` - SDK loaded
   - `[ElementSelector] Received message:` - Message received from parent
   - `[ElementSelector] Launching element selector...` - Selector activated
   - `[ElementSelector] Element selected:` - User clicked an element
   - `[ElementSelector] Message sent to parent` - Selection sent back

3. **Verify**:
   - Switch to Edit mode
   - Click elements in the preview
   - Selected element appears in sidebar
   - CSS selector is correct

#### Common Issues

**SDK not updating in deployed app:**
- Clear npm/pnpm cache: `pnpm store prune`
- Check npm registry has new version: `npm view rapidbuildapp versions`
- Wait 1-2 minutes for npm CDN to propagate

**Vercel deployment fails:**
- Check build logs: `vercel inspect {url} --logs`
- Verify Vercel token is valid
- Check Vercel project exists: `vercel ls`

**Database version insert fails:**
- Check table schema: `\d versions` in psql
- Verify app_id exists: `SELECT id FROM apps WHERE id = '{app-id}';`
- Ensure version_number is unique for that app_id

## Deployment

### Backend Deployment

**Option 1: Traditional Server**
```bash
# Build binary
go build -o rapidbuild cmd/server/main.go

# Run with systemd or supervisor
./rapidbuild
```

**Option 2: Docker**
```bash
docker build -t rapidbuild-backend .
docker run -p 8092:8092 --env-file .env rapidbuild-backend
```

**Nginx Configuration:**
```nginx
server {
    server_name backend.rapidbuild.app;

    location / {
        proxy_pass http://127.0.0.1:8092;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # SSE support
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 86400s;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
}
```

### Frontend Deployment

**Vercel (Recommended):**
```bash
cd frontend
npm run build
vercel --prod
```

**Environment Variables in Vercel:**
- `VITE_API_BASE_URL_PROD` - Production backend URL

## Architecture Decisions

### Why Redis Pub/Sub for SSE?
Initially used Go channels for broadcasting build progress, but this caused message competition between multiple SSE clients. Redis Pub/Sub provides proper broadcast semantics where all subscribers receive all messages.

### Why Disable HTTP WriteTimeout?
Go's default `WriteTimeout` (15s) applies to the entire response, including long-running SSE connections. Setting it to `0` allows SSE connections to remain open for hours during builds.

### Why MongoDB + PostgreSQL?
- **PostgreSQL**: Structured data (users, apps, versions, comments) with ACID guarantees
- **MongoDB**: Flexible schema for preview tokens and app metadata

### Why 2-Second Delay Before First Progress Message?
Race condition: Worker starts immediately, but SSE client subscribes after API response returns. The delay ensures SSE subscription completes before messages are published.

## Troubleshooting

### SSE Connection Errors
- Check Redis connection: `redis-cli -u $REDIS_URL ping`
- Verify nginx buffering disabled: `proxy_buffering off`
- Check HTTP WriteTimeout is disabled in server config

### Build Failures
- Check Claude API access and credentials
- Verify workspace directory permissions
- Check Vercel token validity
- Review worker logs: `tail -f backend/rapidbuild.log`

### Authentication Issues
- Verify JWT_SECRET matches between restarts
- Check OAuth redirect URLs match exactly
- Confirm SMTP credentials for email verification

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Submit pull request

## License

[Add your license here]

## Support

For issues and questions:
- GitHub Issues: [repository URL]
- Documentation: [docs URL]
- Email: admin@rorotech.com
