# SAM2 LoRA Fine-Tuning - Next.js App

This is a [Next.js](https://nextjs.org) application for fine-tuning SAM2 using LoRA. This app uses Better-Auth for authentication and Tailwind CSS for styling.

## Getting Started

First, install the dependencies:

```bash
npm install
```

Then, create a `.env.local` file in the root directory with the following environment variables:

```env
# Better-Auth Configuration
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3000

# OAuth Providers (optional - only if using OAuth)
BETTER_AUTH_GITHUB_CLIENT_ID=your-github-client-id
BETTER_AUTH_GITHUB_CLIENT_SECRET=your-github-client-secret
BETTER_AUTH_GOOGLE_CLIENT_ID=your-google-client-id
BETTER_AUTH_GOOGLE_CLIENT_SECRET=your-google-client-secret

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

**Note:** When you're ready to connect a database, you'll need to:
1. Install your database adapter (e.g., `@prisma/client` for Prisma)
2. Update `src/lib/auth.ts` to use the database adapter
3. Run migrations to set up the auth tables

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- **Authentication**: Better-Auth integration with email/password and OAuth (GitHub, Google)
- **Login/Signup Pages**: Dedicated pages for user authentication
- **Training Configuration**: Configure rank, checkpoint, dataset, and epochs
- **Real-time Logs**: Server-Sent Events (SSE) for real-time training log updates
- **Training Controls**: Start, cancel, and download training checkpoints
- **Typing Effects**: Animated typing effects for better UX
- **Tailwind CSS**: Modern utility-first CSS framework for styling

## Project Structure

```
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...all]/
│   │           └── route.ts    # Better-Auth API handler
│   ├── login/
│   │   └── page.tsx            # Login page
│   ├── signup/
│   │   └── page.tsx             # Signup page
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Main page component
│   └── globals.css              # Tailwind directives + custom animations
├── src/
│   ├── components/              # React components
│   │   ├── Config.tsx           # Main configuration component
│   │   ├── Header.tsx           # Header with theme switcher
│   │   ├── Footer.tsx           # Footer component
│   │   └── ...
│   ├── hooks/                   # Custom React hooks
│   │   ├── useTrainingLogs.ts
│   │   ├── useTypingEffect.ts
│   │   └── useCyclingTypingEffect.ts
│   ├── lib/
│   │   ├── auth.ts              # Better-Auth server configuration
│   │   └── auth-client.ts       # Better-Auth client hooks
│   ├── services/                # API services
│   │   └── trainingApi.ts
│   └── constants/               # Constants and configuration
│       └── trainingConfig.ts
└── public/                      # Static assets
```

## Authentication

This app uses [Better-Auth](https://www.better-auth.com/) for authentication. It supports:

- **Email/Password**: Traditional email and password authentication
- **OAuth Providers**: GitHub and Google (configurable)

### Setting up OAuth Providers

1. **GitHub OAuth**:
   - Go to GitHub Settings > Developer settings > OAuth Apps
   - Create a new OAuth App
   - Set Authorization callback URL to: `http://localhost:3000/api/auth/callback/github`
   - Copy Client ID and Client Secret to `.env.local`

2. **Google OAuth**:
   - Go to Google Cloud Console
   - Create OAuth 2.0 credentials
   - Set Authorized redirect URIs to: `http://localhost:3000/api/auth/callback/google`
   - Copy Client ID and Client Secret to `.env.local`

## Database Setup (Future)

When ready to connect a database:

1. Install your preferred database adapter (e.g., Prisma)
2. Update `src/lib/auth.ts` to include the database adapter
3. Run migrations to create the necessary auth tables
4. Better-Auth will automatically handle user management

## Learn More

To learn more about the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Better-Auth Documentation](https://www.better-auth.com/) - authentication library
- [Tailwind CSS Documentation](https://tailwindcss.com/docs) - utility-first CSS framework

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
