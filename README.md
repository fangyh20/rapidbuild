# RapidBuild - AI Web App Builder Platform

A complete AI-powered web application builder that allows users to create, iterate, and deploy web applications through natural language requirements and visual feedback.

## Overview

RapidBuild is a comprehensive platform that combines:
- **Go Backend** - High-performance API server with Supabase integration
- **React Frontend** - Modern, responsive web interface
- **AI Code Generation** - Claude CLI integration for automated development
- **Cloud Infrastructure** - S3 storage and Vercel deployment

## Key Features

### For Users

1. **Create Apps with AI**
   - Describe your app in natural language
   - Upload design mockups and requirements
   - AI generates working code automatically

2. **Visual Iteration**
   - Comment directly on UI elements
   - Request changes through natural language
   - See changes in real-time previews

3. **Version Management**
   - Track every iteration of your app
   - Preview any version
   - Promote versions to production
   - Rollback when needed

4. **Deployment**
   - Automatic Vercel deployment for each version
   - One-click promotion to production
   - Preview URLs for testing

### Technical Features

- **Multi-tenant Architecture** with Supabase RLS
- **Real-time Build Updates** via Server-Sent Events
- **Secure Authentication** with JWT tokens
- **File Upload** for requirements and mockups
- **S3 Storage** for code and assets
- **AI Worker** orchestration with workspace management

## Architecture

```
rapidbuild/
├── backend/              # Go API server
│   ├── cmd/
│   │   └── server/       # Main entry point
│   ├── internal/
│   │   ├── api/          # HTTP handlers
│   │   ├── services/     # Business logic
│   │   ├── models/       # Data models
│   │   ├── db/           # Database client
│   │   ├── middleware/   # Auth & CORS
│   │   └── worker/       # AI build worker
│   └── config/           # Configuration & schema
│
├── frontend/             # React app
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── lib/          # API & utilities
│   │   └── components/   # UI components
│   └── public/           # Static assets
│
└── common/               # Shared starter code
```

## Quick Start

### Prerequisites

- **Go 1.21+**
- **Node.js 18+**
- **Supabase Account**
- **AWS Account** (S3)
- **Vercel Account**
- **Claude CLI** installed

### Backend Setup

```bash
cd backend

# Install dependencies
go mod tidy

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Set up database
# Run backend/config/schema.sql in your Supabase SQL editor

# Run server
go run cmd/server/main.go
```

Backend will start on `http://localhost:8092`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run development server
npm run dev
```

Frontend will start on `http://localhost:3000`

## Configuration

### Supabase Setup

1. Create a new Supabase project
2. Run the SQL schema from `backend/config/schema.sql`
3. Get your project URL and API keys
4. Configure email authentication

### AWS S3 Setup

1. Create an S3 bucket (e.g., `rapidbuild-apps`)
2. Create IAM user with S3 permissions
3. Get access key and secret key
4. Configure CORS for the bucket

### Vercel Setup

1. Create Vercel account
2. Generate API token
3. Add token to backend configuration

### Claude CLI

Ensure Claude CLI is installed and accessible:
```bash
claude --version
```

## Environment Variables

### Backend (.env)

```env
PORT=8092
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_key
SUPABASE_JWT_SECRET=your_jwt_secret
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET=rapidbuild-apps
VERCEL_TOKEN=your_vercel_token
WORKSPACE_DIR=/tmp/rapidbuild-workspaces
STARTER_CODE_DIR=../react-app
```

### Frontend (.env)

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_API_URL=http://localhost:8092/api/v1
```

## How It Works

### 1. App Creation

```
User submits requirements
    ↓
Backend creates app record
    ↓
Creates initial version
    ↓
Spawns AI worker
    ↓
Worker sets up workspace
    ↓
Pulls starter code
    ↓
Runs Claude CLI with requirements
    ↓
Packages generated code
    ↓
Uploads to S3
    ↓
Deploys to Vercel
    ↓
Updates version with preview URL
```

### 2. Iteration Flow

```
User adds comments in edit mode
    ↓
Comments saved as drafts
    ↓
User submits all comments
    ↓
Backend creates new version
    ↓
Links comments to version
    ↓
Worker downloads latest code from S3
    ↓
Runs Claude CLI with comments
    ↓
Generates updated code
    ↓
Uploads to S3
    ↓
Deploys new preview
```

### 3. Production Deployment

```
User promotes a version
    ↓
Backend updates app.prod_version
    ↓
Calls Vercel API to promote deployment
    ↓
App goes live at production URL
```

## API Endpoints

### Authentication
All endpoints require `Authorization: Bearer <token>` header

### Apps
- `GET /api/v1/apps` - List user's apps
- `POST /api/v1/apps` - Create new app
- `GET /api/v1/apps/:id` - Get app details
- `DELETE /api/v1/apps/:id` - Delete app

### Versions
- `GET /api/v1/apps/:appId/versions` - List versions
- `POST /api/v1/apps/:appId/versions` - Create version
- `GET /api/v1/apps/:appId/versions/:versionId` - Get version
- `DELETE /api/v1/apps/:appId/versions/:versionId` - Delete version
- `POST /api/v1/apps/:appId/versions/:versionId/promote` - Promote to prod

### Comments
- `GET /api/v1/apps/:appId/comments` - List draft comments
- `POST /api/v1/apps/:appId/comments` - Add comment
- `DELETE /api/v1/apps/:appId/comments/:commentId` - Delete comment
- `GET /api/v1/apps/:appId/versions/:versionId/comments` - Get version comments

### Real-time
- `GET /api/v1/versions/:versionId/progress` - SSE build progress

## Database Schema

### Tables

- **apps** - User applications
- **versions** - App versions with build artifacts
- **comments** - User feedback on UI elements
- **requirement_files** - Uploaded files

All tables have Row Level Security (RLS) enabled for multi-tenant isolation.

## Development

### Backend Development

```bash
cd backend
go run cmd/server/main.go

# Run tests
go test ./...

# Build
go build -o rapidbuild cmd/server/main.go
```

### Frontend Development

```bash
cd frontend
npm run dev

# Build
npm run build

# Preview build
npm run preview
```

## Deployment

### Backend

**Using Docker:**
```bash
cd backend
docker build -t rapidbuild-backend .
docker run -p 8092:8092 --env-file .env rapidbuild-backend
```

**Direct deployment:**
```bash
go build -o rapidbuild cmd/server/main.go
./rapidbuild
```

### Frontend

**Vercel:**
```bash
cd frontend
vercel
```

**Netlify:**
```bash
npm run build
# Upload dist/ to Netlify
```

## Security

- **JWT Authentication** - Secure token-based auth
- **Row Level Security** - Database-level access control
- **CORS** - Configurable cross-origin policies
- **Input Validation** - All API endpoints validated
- **Environment Secrets** - Never commit credentials

## Monitoring

- Build logs stored in `versions.build_log`
- Error messages in `versions.error_message`
- SSE for real-time updates
- Status tracking on all entities

## Troubleshooting

### Backend won't start

1. Check Go version: `go version` (needs 1.21+)
2. Verify environment variables
3. Test Supabase connection
4. Check AWS credentials

### Frontend can't connect

1. Verify backend is running
2. Check CORS configuration
3. Verify Supabase credentials
4. Check API URL in .env

### Builds failing

1. Verify Claude CLI is installed
2. Check workspace directory permissions
3. Verify AWS S3 access
4. Check Vercel token

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT

## Support

For issues and questions:
- GitHub Issues: [rapidbuildapp/rapidbuild](https://github.com/rapidbuildapp/rapidbuild)
- Documentation: See README files in backend/ and frontend/

## Roadmap

- [ ] Team collaboration features
- [ ] Custom domain support
- [ ] Advanced AI prompting
- [ ] Template marketplace
- [ ] Analytics dashboard
- [ ] CI/CD integration
- [ ] Multi-cloud deployment
- [ ] Mobile app builder

## Credits

Built with:
- [Go](https://golang.org/)
- [React](https://react.dev/)
- [Supabase](https://supabase.com/)
- [Claude AI](https://claude.ai/)
- [Vercel](https://vercel.com/)
- [AWS S3](https://aws.amazon.com/s3/)
