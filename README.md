# Limn Systems App

Clean version optimized for bolt.new deployment.

## Quick Start

```bash
npm install
npm run dev
```

## Environment Setup

Copy `.env.example` to `.env.local` and fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Project Structure

- `/app` - Next.js 14 app directory
- `/components` - Reusable React components
- `/lib` - Utility functions and services
- `/hooks` - Custom React hooks
- `/types` - TypeScript type definitions
- `/api` - API services and routes

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Supabase for backend
- Shadcn/ui components

## Documentation

Full documentation available in `limn-systems-docs` repository.
