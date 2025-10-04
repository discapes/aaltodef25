Useful MCP tools for interacting with Github.
Get CI workflows: github.list_workflows
Get CI workflows runs: github.list_workflow_runs
Get CI workflows jobs: github.list_workflow_jobs
Get CI job logs: github.get_job_logs

- prefer npm commands to editing package.json or package-lock.json 
- when making dockerfiles or docker compose files don't pin the version, instead let docker get the lastest possible