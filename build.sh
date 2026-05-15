#!/bin/bash
# Smart build script: uses production env on main branch, dev env on all other branches
# Vercel sets VERCEL_GIT_COMMIT_REF to the branch name

BRANCH="${VERCEL_GIT_COMMIT_REF:-main}"

echo "Building for branch: $BRANCH"

if [ "$BRANCH" = "main" ]; then
  echo "Using production build"
  # Override API URL to point to production Railway backend
  export VITE_API_URL=https://friendly-ai-sessions-production.up.railway.app
  npm run build
  node scripts/generate-seo-pages.mjs
else
  echo "Using development build"
  npm run build:dev
  node scripts/generate-seo-pages.mjs
fi
