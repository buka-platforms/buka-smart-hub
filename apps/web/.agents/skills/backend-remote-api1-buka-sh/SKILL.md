---
name: backend-remote-api1-buka-sh
description: Laravel backend operations and code review on a remote host. Use when the user asks to inspect, review, debug, or audit backend code that is not in the local workspace and credentials are provided via `.env.local` keys `SECRET_REMOTE_BACKEND_HOST`, `SECRET_REMOTE_BACKEND_USER`, `SECRET_REMOTE_BACKEND_PASSWORD`, and `SECRET_REMOTE_BACKEND_PATH`.
---

# Remote Laravel Backend Ops

Execute backend operations against the remote Laravel project with a read-first approach.

## Use This Workflow

1. Read backend connection metadata from `.env.local`:
- `SECRET_REMOTE_BACKEND_HOST`
- `SECRET_REMOTE_BACKEND_USER`
- `SECRET_REMOTE_BACKEND_PASSWORD`
- `SECRET_REMOTE_BACKEND_PATH`

2. Treat secret values as sensitive:
- Never print passwords or tokens in responses.
- Redact secret-bearing command output when summarizing.

3. Prefer read-only remote commands first:
- `pwd`, `ls -la`, `find`, `cat`, `grep`/`rg` (if installed remotely), `php artisan route:list`
- Use write operations only when user explicitly asks for changes.

4. Connect over SSH using available tooling (Windows-friendly default: `plink`):
- Example pattern (do not echo secrets):
```powershell
plink -ssh -batch -no-antispoof -pw $remotePass "$remoteUser@$remoteHost" "cd $remotePath && ls -la"
```

5. Run all backend operations from inside the Docker container `service-nginx-api1-buka-sh`:
- Do not run Laravel/PHP/backend commands from the remote host shell.
- Host-level `php artisan` can fail due to environment/runtime differences, so container execution is mandatory.
- After SSH login, enter the container before inspecting, editing, or running Laravel/PHP commands.
- Inside the container, the backend project directory is `/app/api1.buka.sh`.
- Example pattern:
```bash
docker exec -it service-nginx-api1-buka-sh sh
```
- Non-interactive alternative for one-off commands:
```bash
docker exec service-nginx-api1-buka-sh sh -lc 'cd /app/api1.buka.sh && php artisan route:list'
```

6. Treat backend runtime config as container-local and sourced from backend `.env`:
- For database credentials and other backend config, read them from `/app/api1.buka.sh/.env` inside the container.
- Do not assume host-level env/config matches container runtime values.
- For database operations, run from inside the container context using backend `.env` values.
- Never print raw secrets (DB password, app keys, tokens); redact sensitive values in responses.

7. For backend review requests, follow this order:
- Security issues (authz/authn, secrets handling, input validation, injection risk)
- Behavioral bugs/regressions
- Data integrity and migration risks
- Performance hotspots (N+1, unbounded queries, sync I/O, expensive loops)
- Test gaps for risky paths

8. Report findings with actionable references:
- Include file paths and line numbers when possible.
- Keep summaries concise and prioritize severity.

## Remote Path Hint

Assume backend source may live remotely at `SECRET_REMOTE_BACKEND_PATH` even if a local `api/` directory exists but is empty.

## Exposed API Hint

Assume the backend is publicly exposed at `https://api1.buka.sh` for endpoint checks, health checks, and behavior verification.

## Fallbacks

- If SSH login fails, verify host/user/path assumptions and request confirmation from user.
- If password auth is blocked, request key-based access or a temporary read-only credential.
