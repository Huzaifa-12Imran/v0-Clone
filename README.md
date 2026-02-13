# v0 Clone

An open-source clone of v0.app with AI-powered React component generation.

## Overview

v0 Clone transforms natural language descriptions into production-ready React components. Built with Next.js 16, React 19, and TypeScript, this project provides a self-hosted alternative to v0.app for developers who want full control over their AI-assisted development workflow.

## Features

| Feature | Description |
|---------|-------------|
| **AI Component Generation** | Convert natural language prompts into functional React components |
| **Real-time Streaming** | Watch code generation happen live with streaming responses |
| **User Authentication** | Secure email/password authentication with NextAuth.js |
| **Rate Limiting** | 50 messages per day for authenticated users |
| **Persistent Chat History** | Conversations and generated components saved to PostgreSQL |
| **Projects Dashboard** | View and manage all your generated projects |
| **Live Preview** | Split-screen resizable layout with instant component preview |
| **Dark/Light Theme** | Full theme support with system preference detection |
| **Image Attachments** | Attach images to your prompts for context |

## Tech Stack

### Core Technologies

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router |
| **React 19** | UI library |
| **TypeScript 5.9** | Type safety |
| **Tailwind CSS 4** | Utility-first styling |
| **v0 SDK** | AI component generation |

### Database & Backend

| Technology | Purpose |
|------------|---------|
| **PostgreSQL** | Primary database |
| **Drizzle ORM** | Type-safe database queries |
| **NextAuth.js** | Authentication |

### AI & UI Components

| Technology | Purpose |
|------------|---------|
| **@ai-sdk/react** | AI SDK for React |
| **Radix UI** | Accessible UI primitives |
| **Lucide Icons** | Icon library |
| **Shiki** | Syntax highlighting |

### Developer Experience

| Technology | Purpose |
|------------|---------|
| **Biome 2.3.11** | Fast linter and formatter |
| **Husky** | Git hooks for code quality |
| **lint-staged** | Run linters on staged files |

## Getting Started

### Prerequisites

- Node.js 22.x or later
- pnpm 9.0 or later
- PostgreSQL database (local or hosted)
- v0 API key from [v0.app](https://v0.app/chat/settings/keys)

### Installation

```bash
# Clone the repository
git clone https://github.com/Huzaifa-12Imran/v0-clone.git
cd v0-clone

# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env.local
```

### Environment Configuration

Create a `.env.local` file with the following variables:

```bash
# Environment
NODE_ENV=development

# Database (required)
POSTGRES_URL=postgresql://user:password@localhost:5432/v0_clone

# Authentication (required - generate with: openssl rand -base64 32)
AUTH_SECRET=your_auth_secret_here

# v0 API Key (required)
V0_API_KEY=your_v0_api_key_here

# NextAuth URL (required)
NEXTAUTH_URL=http://localhost:3000
```

### Running the Development Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
v0-clone/
├── app/                      # Next.js App Router
│   ├── (auth)/              # Authentication routes & config
│   │   ├── login/           # Login page
│   │   └── register/        # Registration page
│   ├── api/                 # API routes
│   │   ├── auth/            # NextAuth endpoints
│   │   ├── chat/            # Chat API (create, fork, delete)
│   │   └── chats/           # Chat list & detail endpoints
│   ├── chats/               # Chat pages
│   └── projects/            # Projects dashboard
├── components/
│   ├── ai-elements/         # AI-specific components (prompt, response, etc.)
│   ├── chat/                # Chat interface components
│   ├── chats/               # Chat list components
│   ├── home/                # Home page components
│   ├── projects/            # Projects page components
│   ├── providers/           # React context providers
│   ├── shared/              # Shared layout components
│   └── ui/                  # Reusable UI primitives
├── contexts/                # React contexts
├── hooks/                   # Custom React hooks
├── lib/
│   ├── db/                  # Database schema & migrations
│   └── utils.ts             # Utility functions
├── public/                  # Static assets
└── types/                   # TypeScript type definitions
```

## API Reference

### Chat API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Create a new chat message |
| `/api/chats` | GET | List all user chats |
| `/api/chats/[chatId]` | GET/PATCH/DELETE | Chat detail, rename, or delete |
| `/api/chats/[chatId]/visibility` | PATCH | Update chat visibility |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [v0.app](https://v0.app) - Original project that inspired this clone
- [Vercel](https://vercel.com) - Next.js and deployment platform
- [Radix UI](https://radix-ui.com) - UI component library
