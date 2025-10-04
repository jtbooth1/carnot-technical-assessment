# Deep Research Platform

DRP is a web app wrapping the OpenAI API to support the user
in using Deep Research functionality. These docs are provided for the benefit of
any LLM agent working on this project. If they are unclear or incomplete, please
alert the user.

## App Layout & Tech Stack

DRP is a stock react-typescript SPA with next.js backend. It uses:
- @trpc/server & @trpc/client for a typed API
- @trpc/react-query and @trpc/react-query to handle this on the frontend
- @prisma/client as a DB wrapper, sqlite inside
- zod for types

Setup steps, per ChatGPT:
> npx create-next-app@latest carnot-technical-assessment --typescript --app --eslint
> cd carnot-technical-assessment
> npm install @trpc/server @trpc/client @trpc/react-query @tanstack/react-query \
>   @prisma/client prisma \
>   zod
> npx prisma init --datasource-provider sqlite

## Style

The app style is brutalist black-on-white css. We minimize local styling in favor of top-level
definitions based on <section>/<header>/etc. Corners are not rounded. Padding/margin is 4px/8px/16px.
There is no color except as specified by the USER.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

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

## URL Structure

The app consists of the following pages:

### Public Pages
- **`/`** - Home page with welcome message and navigation
- **`/login`** - User login form (email/password)
- **`/register`** - User registration form (email/password)

### Protected Pages (require authentication)
- **`/messages`** - Send messages (messages are logged to backend console)
- **`/me`** - Display user profile and JWT claims in plaintext

### API Routes
- **`/api/trpc/*`** - tRPC API endpoints for authentication and messaging

## Authentication & Authorization

### Authentication Flow
1. **Register** a new user at `/register`
   - User provides email and password (optionally: organization name)
   - Backend creates a new Organization for the user (auto-generated name if not provided)
   - User is created and linked to the organization
   - JWT token is generated and returned
2. **Login** at `/login`
   - User provides email and password
   - Backend validates credentials using bcrypt
   - JWT token is generated and returned
3. **Access protected pages** (`/messages`, `/me`)
   - Frontend includes JWT token in request headers
   - Backend validates token and extracts claims
4. **JWT tokens** are automatically managed in localStorage by the frontend

### Authentication Implementation

**Technology Stack:**
- **Password Hashing**: bcryptjs (12 rounds)
- **JWT Signing**: jsonwebtoken library
- **Secret**: Stored in `JWT_SECRET` environment variable (defaults to 'your-secret-key' in development)
- **Token Expiration**: 7 days

**JWT Payload Structure:**
```typescript
{
  userId: string        // User's CUID
  organizationId: string // Organization's CUID
  iat: number           // Issued at (automatic)
  exp: number           // Expiration (automatic)
}
```

**tRPC Context:**
- Protected procedures have access to `ctx.user.userId` and `ctx.user.organizationId`
- Public procedures have no user context
- Invalid/missing tokens result in authentication errors

**Security Notes:**
- Passwords are hashed with bcrypt before storage (never stored in plaintext)
- JWT secret should be changed in production environments
- Tokens are stored in localStorage (consider httpOnly cookies for production)
- All protected endpoints validate JWT before processing requests

### Page Access Control

**Redirect Guards:**
- All pages **except** `/login` and `/register` require authentication
- Unauthenticated users attempting to access protected pages are automatically redirected to `/login`
- The redirect happens after the auth loading state completes to prevent flashing
- Protected pages include: `/`, `/companies`, `/messages`, `/me`

**Cross-Page Navigation:**
- Login page includes a link to register: "Don't have an account? Register"
- Register page includes a link to login: "Already have an account? Login"

**Implementation:**
Each protected page uses a `useEffect` hook that checks authentication status:
```typescript
useEffect(() => {
  if (!isLoading && !user) {
    router.push('/login')
  }
}, [isLoading, user, router])
```

## Database Schema

The app uses SQLite with Prisma ORM. The database is structured to support multi-tenant organizations with research task management.

### Core Tables

#### Organizations Table
- **`id`** (String, Primary Key) - Unique identifier using CUID
- **`name`** (String) - Organization name
- **`createdAt`** (DateTime) - Creation timestamp
- **`updatedAt`** (DateTime) - Last update timestamp
- **Relations**: users, topics

#### Users Table
- **`id`** (String, Primary Key) - Unique identifier using CUID
- **`email`** (String, Unique) - User's email address for authentication
- **`password`** (String) - Hashed password using bcrypt (12 rounds)
- **`organizationId`** (String, Foreign Key) - Reference to organization
- **`createdAt`** (DateTime) - Account creation timestamp
- **`updatedAt`** (DateTime) - Last update timestamp
- **Relations**: organization, messages, topics

#### Messages Table
- **`id`** (String, Primary Key) - Unique identifier using CUID
- **`content`** (String) - Message content (1-1000 characters)
- **`userId`** (String, Foreign Key) - Reference to the user who sent the message
- **`createdAt`** (DateTime) - Message creation timestamp
- **Relations**: user

### Research Management Tables

#### Topics Table
- **`id`** (String, Primary Key) - Unique identifier using CUID
- **`organizationId`** (String, Foreign Key) - Organization that owns the topic
- **`userId`** (String, Foreign Key) - User who created the topic
- **`type`** (String) - Topic type (Company, Product, Employee, etc.)
- **`name`** (String) - Topic name
- **`private`** (Boolean) - Privacy flag (false = org-wide, true = creator-only)
- **`createdAt`** (DateTime) - Creation timestamp
- **`updatedAt`** (DateTime) - Last update timestamp
- **Relations**: organization, user, researchTasks
- **Indexes**: (organizationId, private), (userId, type), (organizationId, createdAt)

#### ResearchTask Table
- **`id`** (String, Primary Key) - Unique identifier using CUID
- **`topicId`** (String, Foreign Key) - Topic this research belongs to
- **`status`** (String) - Task status: PENDING, PROCESSING, COMPLETED, FAILED
- **`error`** (String, Optional) - Error message if task failed
- **`createdAt`** (DateTime) - Task creation timestamp
- **`startedAt`** (DateTime, Optional) - When processing began
- **`completedAt`** (DateTime, Optional) - When task finished
- **Relations**: topic, query (1:1), result (1:1)
- **Indexes**: (topicId, status), (status), (createdAt)

#### ResearchQuery Table
- **`id`** (String, Primary Key) - Unique identifier using CUID
- **`taskId`** (String, Foreign Key, Unique) - Associated research task (1:1)
- **`prompt`** (String) - Original user prompt
- **`rewrittenPrompt`** (String, Optional) - OpenAI-rewritten prompt if generated
- **`createdAt`** (DateTime) - Query creation timestamp
- **Relations**: task

#### ResearchResult Table
- **`id`** (String, Primary Key) - Unique identifier using CUID
- **`taskId`** (String, Foreign Key, Unique) - Associated research task (1:1)
- **`text`** (String) - Main output text from Deep Research
- **`rawJson`** (String, Optional) - Full raw JSON response for debugging
- **`createdAt`** (DateTime) - Result creation timestamp
- **Relations**: task, links

#### Links Table (Citations)
- **`id`** (String, Primary Key) - Unique identifier using CUID
- **`resultId`** (String, Foreign Key) - Associated research result
- **`url`** (String) - Citation URL
- **`title`** (String) - Citation title
- **`startIndex`** (Integer) - Starting position in text
- **`endIndex`** (Integer) - Ending position in text
- **Relations**: result
- **Index**: (resultId)

### Database Configuration
- **Provider**: SQLite
- **File**: `dev.db` (local development)
- **Prisma Client**: Generated to `src/generated/prisma`
- **Cascade Deletes**: Deleting an organization cascades to all related records

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
