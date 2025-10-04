#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
cd "$SCRIPT_DIR"

echo "Stopping database..."
docker compose -f infra/compose.yml down

echo "Removing database volume..."
docker compose -f infra/compose.yml down -v

echo "Database has been reset!"
echo "Run ./dev.sh or ./run.sh to start fresh."
