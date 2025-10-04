#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$SCRIPT_DIR"

# Start only the database service
echo "Starting PostgreSQL database..."
docker compose -f infra/compose.yml up -d db

# Wait for database to be ready
echo "Waiting for database to be ready..."
docker compose -f infra/compose.yml exec -T db sh -c 'until pg_isready -U postgres; do sleep 1; done'

# Set the database URL for local development
export DATABASE_URL="postgres://postgres:password@localhost:5432/trak"

# Navigate to the trak directory
cd trak

# Run migrations
echo "Running migrations..."
npx drizzle-kit migrate

# Start the SvelteKit dev server
echo "Starting SvelteKit dev server..."
npm run dev
