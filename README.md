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

### Other

- Remember to commit with commitizen (`cz c`) so that semantic-release knows to create a new release

### Infra setup

- Set HCLOUD_TOKEN environment variable (recommended to use .env and direnv shell hook)
- Create a new k3s cluster with hetzner-k3s (in infra/): `hetzner-k3s create --config cluster.yaml`
- Install gitea on one of the nodes (or another server)
    - gitea is used as an Docker image registry
        - Helm charts are also pushed as OCI containers
    - note that the gitea helm chart is broken because of bitnami
    - apt install podman and podman-compose with root
    - sysctl -w net.ipv4.ip_unprivileged_port_start=80
    - add the last argument to /etc/sysctl.conf
    - adduser admin
    - add ssh key to /home/admin/.ssh/authorized_keys
    - ssh again to admin 
        - because terminfo files are copied by kitty, compared to using su - makes vim usage better
    - copy infra/gitea-compose.yml to ~/compose.yml
    - run podman-compose up -d
    - add the ip to cloudflare DNS (proxied)
        - because docker registries can only be used conveniently over https
    - open the url and setup gitea
    - create a new user named ci
    - set GITEA_PASSWORD and GITEA_USERNAME in Github CI secrets
- Install ArgoCD onto the cluster
````
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```
- to be completed