---
name: backend-ops-laravel-remote
description: Laravel backend operations and code review on a remote host. Use when the user asks to inspect, review, debug, or audit backend code that is not in the local workspace and credentials are provided via `.env.local` keys `SECRET_BACKEND_HOST`, `SECRET_BACKEND_USER`, `SECRET_BACKEND_PASSWORD`, and `SECRET_BACKEND_PATH`.
---

# Remote Laravel Backend Ops

Execute backend operations against the remote Laravel project with a read-first approach.

## Use This Workflow

1. Read backend connection metadata from `.env.local`:
- `SECRET_BACKEND_HOST`
- `SECRET_BACKEND_USER`
- `SECRET_BACKEND_PASSWORD`
- `SECRET_BACKEND_PATH`

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

5. For backend review requests, follow this order:
- Security issues (authz/authn, secrets handling, input validation, injection risk)
- Behavioral bugs/regressions
- Data integrity and migration risks
- Performance hotspots (N+1, unbounded queries, sync I/O, expensive loops)
- Test gaps for risky paths

6. Report findings with actionable references:
- Include file paths and line numbers when possible.
- Keep summaries concise and prioritize severity.

## Remote Path Hint

Assume backend source may live remotely at `SECRET_BACKEND_PATH` even if a local `api/` directory exists but is empty.

## Fallbacks

- If SSH login fails, verify host/user/path assumptions and request confirmation from user.
- If password auth is blocked, request key-based access or a temporary read-only credential.
