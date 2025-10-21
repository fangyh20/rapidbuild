# RapidBuild Frontend

React-based frontend for the RapidBuild AI web builder platform. Built with Vite, TypeScript, TailwindCSS, and React Query.

## Features

- **User Authentication**: Supabase Auth integration with email/password
- **App Dashboard**: View and manage all your applications
- **App Creation**: Create new apps with rich text requirements and file uploads
- **Visual Editor**: Comment on UI elements for iterative improvements
- **Version Control**: Track and manage multiple versions of your app
- **Real-time Updates**: SSE for live build progress monitoring
- **Responsive Design**: Mobile-first, modern UI with TailwindCSS

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling
- **React Query** - Server state management
- **React Router** - Routing
- **Supabase** - Authentication
- **Axios** - HTTP client
- **Zustand** - Client state management
- **Lucide React** - Icons

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase project
- Backend service running

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your credentials:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:8092/api/v1
```

## Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Preview Production Build

```bash
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/            # Page components
│   │   ├── Login.tsx     # Login page
│   │   ├── Signup.tsx    # Signup page
│   │   ├── Dashboard.tsx # Apps dashboard
│   │   ├── NewApp.tsx    # Create new app
│   │   └── AppDetail.tsx # App detail with editor
│   ├── lib/              # Utilities and configs
│   │   ├── api.ts        # API client
│   │   ├── supabase.ts   # Supabase client
│   │   ├── store.ts      # Global state
│   │   └── utils.ts      # Helper functions
│   ├── App.tsx           # Root component with routing
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── public/               # Static assets
├── index.html            # HTML template
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── vite.config.ts        # Vite config
└── tailwind.config.js    # Tailwind config
```

## Key Features

### Authentication

The app uses Supabase Auth for user management:
- Email/password signup with email verification
- Secure JWT-based sessions
- Automatic session refresh
- Protected routes

### App Management

- **Dashboard**: View all your apps with status indicators
- **Create App**: Rich text editor for requirements, file uploads for mockups
- **Real-time Status**: See build progress in real-time

### Visual Editor

The app detail page features:
- **View Mode**: Preview your app in an iframe
- **Edit Mode**: Add comments on specific UI elements
- **Comment System**: Draft comments and submit them together
- **Version History**: Track all versions and their associated comments

### Build Progress

Real-time build updates using Server-Sent Events (SSE):
- Live status updates
- Progress messages
- Error handling
- Automatic reconnection

## API Integration

The frontend communicates with the backend API:

```typescript
// Example: Create a new app
const response = await api.createApp({
  name: 'My App',
  description: 'App description',
  requirements: 'Detailed requirements...',
})

// Example: Stream build progress
api.streamBuildProgress(versionId, (progress) => {
  console.log(progress.message)
})
```

## Deployment

### Vercel

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm run build
# Upload dist/ folder to Netlify
```

### Docker

```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| VITE_SUPABASE_URL | Supabase project URL | Yes |
| VITE_SUPABASE_ANON_KEY | Supabase anonymous key | Yes |
| VITE_API_URL | Backend API URL | Yes |

## Troubleshooting

### CORS Errors

Ensure the backend has proper CORS configuration:
```go
w.Header().Set("Access-Control-Allow-Origin", "*")
```

### Authentication Issues

1. Check Supabase credentials
2. Verify JWT token is being sent
3. Ensure backend validates tokens correctly

### Build Fails

1. Clear node_modules and reinstall: `rm -rf node_modules && npm install`
2. Check Node.js version: `node --version` (should be 18+)
3. Clear Vite cache: `rm -rf node_modules/.vite`

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT
