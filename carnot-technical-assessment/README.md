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

### Authentication Flow
1. Register a new user at `/register`
2. Login at `/login` 
3. Access protected pages (`/messages`, `/me`)
4. JWT tokens are automatically managed in localStorage

## Database Schema

The app uses SQLite with Prisma ORM. The database contains two main tables:

### Users Table
- **`id`** (String, Primary Key) - Unique identifier using CUID
- **`email`** (String, Unique) - User's email address for authentication
- **`password`** (String) - Hashed password using bcrypt
- **`createdAt`** (DateTime) - Account creation timestamp
- **`updatedAt`** (DateTime) - Last update timestamp
- **`messages`** (Relation) - One-to-many relationship with messages

### Messages Table
- **`id`** (String, Primary Key) - Unique identifier using CUID
- **`content`** (String) - Message content (1-1000 characters)
- **`userId`** (String, Foreign Key) - Reference to the user who sent the message
- **`user`** (Relation) - Many-to-one relationship with users
- **`createdAt`** (DateTime) - Message creation timestamp

### Database Configuration
- **Provider**: SQLite
- **File**: `dev.db` (local development)
- **Prisma Client**: Generated to `src/generated/prisma`

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
