# Deep Research Platform

DRP is a web app wrapping the OpenAI API to support the user
in using Deep Research functionality.

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