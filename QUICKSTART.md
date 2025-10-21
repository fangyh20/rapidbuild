# RapidBuild Quick Start Guide

Get RapidBuild up and running in 10 minutes.

## Prerequisites Check

Before starting, ensure you have:

```bash
# Check Go version (need 1.21+)
go version

# Check Node.js version (need 18+)
node --version

# Check Claude CLI
claude --version
```

If any are missing, install them first.

## Step 1: Clone and Setup

```bash
cd /home/ubuntu/projects/rapidbuildapp
cd rapidbuild
```

## Step 2: Database Setup (5 min)

1. Go to [Supabase](https://supabase.com/) and create a new project
2. Wait for database to initialize
3. Go to SQL Editor
4. Copy contents of `backend/config/schema.sql`
5. Paste and run in SQL Editor
6. Go to Project Settings → API → Copy these values:
   - Project URL
   - anon public key
   - service_role key (keep secret!)
7. Go to Project Settings → Auth → JWT Secret → Copy it

## Step 3: AWS S3 Setup (3 min)

1. Create S3 bucket named `rapidbuild-apps`
2. Create IAM user with S3 permissions
3. Generate access keys
4. Save Access Key ID and Secret Access Key

## Step 4: Configure Backend

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env file with your credentials
nano .env
```

Update these values in `.env`:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_service_role_key_here
SUPABASE_JWT_SECRET=your_jwt_secret_here
AWS_ACCESS_KEY=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
S3_BUCKET=rapidbuild-apps
VERCEL_TOKEN=your_vercel_token_here
```

## Step 5: Start Backend

```bash
# Install dependencies
go mod tidy

# Start server
go run cmd/server/main.go
```

You should see: `Starting server on port 8092`

Keep this terminal running!

## Step 6: Configure Frontend

Open a new terminal:

```bash
cd rapidbuild/frontend

# Copy environment template
cp .env.example .env

# Edit .env
nano .env
```

Update these values:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_public_key_here
VITE_API_URL=http://localhost:8092/api/v1
```

## Step 7: Start Frontend

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

You should see: `Local: http://localhost:3000`

## Step 8: Create Your First App

1. Open browser to `http://localhost:3000`
2. Click "Sign up"
3. Enter email and password
4. Check email for verification link (if configured)
5. Log in
6. Click "New App"
7. Fill in:
   - Name: "My First App"
   - Description: "Testing RapidBuild"
   - Requirements:
   ```
   Create a simple landing page with:
   - Hero section with title and subtitle
   - Features section with 3 feature cards
   - Contact form with name, email, message fields
   - Use blue as primary color
   - Make it responsive
   ```
8. Click "Create App"
9. Watch the build progress!

## Troubleshooting

### Backend errors

**"no such file or directory"**
- Make sure you're in the `backend` directory
- Run `go mod tidy` first

**"connection refused" to Supabase**
- Check your `SUPABASE_URL` and `SUPABASE_KEY`
- Verify your Supabase project is active

**"AWS credentials error"**
- Verify your AWS keys
- Check S3 bucket name matches `.env`

### Frontend errors

**"Cannot connect to backend"**
- Ensure backend is running on port 8092
- Check `VITE_API_URL` in `.env`

**"Supabase auth error"**
- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check Supabase project is active

**"Module not found"**
- Run `npm install` again
- Delete `node_modules` and run `npm install`

### Build not starting

**Claude CLI not found**
- Install Claude CLI first
- Verify with `claude --version`

**Workspace permission error**
- Check `/tmp/rapidbuild-workspaces` directory permissions
- Try: `mkdir -p /tmp/rapidbuild-workspaces`

## Next Steps

Once your first app builds successfully:

1. **Add Comments**
   - Click "Edit" mode
   - Select an element (e.g., ".header")
   - Add a comment like "Make the header blue"
   - Click "Submit All"
   - Watch new version build!

2. **View Versions**
   - Click "Versions" tab
   - See all iterations
   - Preview any version
   - Promote to production

3. **Deploy to Production**
   - Select a version
   - Click "Promote"
   - Your app goes live!

## Common Commands

```bash
# Backend
cd backend
go run cmd/server/main.go     # Start server
go test ./...                  # Run tests
go build cmd/server/main.go   # Build binary

# Frontend
cd frontend
npm run dev      # Development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Need Help?

- Check the main README.md
- Check backend/README.md for backend details
- Check frontend/README.md for frontend details
- Review the database schema in backend/config/schema.sql

## Success Checklist

- [ ] Go 1.21+ installed
- [ ] Node 18+ installed
- [ ] Claude CLI installed
- [ ] Supabase project created
- [ ] Database schema applied
- [ ] S3 bucket created
- [ ] Backend .env configured
- [ ] Frontend .env configured
- [ ] Backend running on :8092
- [ ] Frontend running on :3000
- [ ] Can create account
- [ ] Can create app
- [ ] App builds successfully

If you checked all boxes - congratulations! RapidBuild is ready to use.

## What's Happening Behind the Scenes?

When you create an app:

1. Frontend sends requirements to backend
2. Backend creates app + version records in Supabase
3. Backend spawns AI worker
4. Worker creates temporary workspace
5. Worker runs Claude CLI with your requirements
6. Claude generates React code
7. Worker packages the code
8. Worker uploads to S3
9. Worker deploys to Vercel (if configured)
10. Frontend receives real-time updates via SSE
11. Preview URL becomes available

When you add comments:

1. Comments saved as drafts in Supabase
2. Submit creates new version
3. Worker downloads latest code from S3
4. Worker runs Claude with your comments
5. Claude modifies the code
6. Updated code uploaded to S3
7. New preview deployed
8. You see the changes!

## Tips for Best Results

**Writing Requirements:**
- Be specific about features
- Mention design preferences
- List pages you need
- Specify colors, fonts, layout
- Include examples if possible

**Adding Comments:**
- Be specific about what to change
- Reference exact elements
- Explain why you want the change
- One comment per issue

**Iteration:**
- Make small, incremental changes
- Test each version before adding more comments
- Review build logs if something goes wrong

Enjoy building with AI!
