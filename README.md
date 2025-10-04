# Entry for Aalto Defense hackathon

## Development Scripts

### `./run.sh`
Runs the full application stack in production mode using Docker Compose.
- Builds and starts both the database and the SvelteKit app in Docker containers
- App is accessible at `http://localhost:3000`
- Database runs inside Docker with persistent volume

```bash
./run.sh
```

### `./dev.sh`
Runs the application in development mode with hot-reloading.
- Starts only the PostgreSQL database in Docker
- Runs database migrations automatically
- Runs the SvelteKit app locally with `npm run dev`
- Perfect for active development with instant feedback

```bash
./dev.sh
```

### `./reset.sh`
Resets the database by removing all data and volumes.
- Stops all running services
- Deletes the database volume (all data is lost!)
- Use this when you need a clean database state

```bash
./reset.sh
```

After resetting, run `./dev.sh` or `./run.sh` to start fresh with migrations applied to an empty database.
