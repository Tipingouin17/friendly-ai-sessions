# MyFacilitator - AI-Powered Workshop Facilitation

Welcome to the MyFacilitator project repository. This application provides AI-powered workshop facilitation that transforms meetings into engaging, productive sessions.

## Project Info

**Production URL**: Deployed on Railway (URL provided by Railway dashboard)
## Deployment

This project is configured for deployment on **Railway**. It uses a multi-service architecture:

1. **Frontend**: React SPA built with Vite, served via Nginx
2. **Backend Proxy**: Python Flask server acting as a Supabase proxy and AI integration layer
3. **Database**: PostgreSQL database (managed by Railway)

### Railway Deployment Steps

1. Connect your GitHub repository to Railway
2. Railway will automatically detect the `Dockerfile` in the `supabase_proxy` directory for the backend
3. Configure the following environment variables in Railway:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `JWT_SECRET`: Secret for JWT token generation
4. The frontend will be built and served automatically

## Local Development

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository
git clone https://github.com/Tipingouin17/friendly-ai-sessions.git

# Step 2: Navigate to the project directory
cd friendly-ai-sessions

# Step 3: Install the necessary dependencies
npm i

# Step 4: Start the development server
npm run dev
```

## Technologies Used

This project is built with:

- **Frontend**: Vite, TypeScript, React, shadcn-ui, Tailwind CSS
- **Backend**: Python, Flask, PostgreSQL
- **AI Integration**: OpenAI API (GPT-4o)

## Documentation

For detailed technical documentation, architecture overview, and testing reports, please refer to the `docs/` directory:

- `docs/PROJECT_DOCUMENTATION.md`: Comprehensive system architecture and feature documentation
- `docs/OPENAI_INTEGRATION.md`: Details on the AI facilitator implementation
- `docs/TEST_REPORT.md`: Quality assurance and testing results
