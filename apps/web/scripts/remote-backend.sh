#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENV_FILE="${REPO_ROOT}/.env.local"
CONTAINER_NAME="service-php85"
CONTAINER_PROJECT_PATH="/app/api1.buka.sh"

COMMAND="${1:-help}"
shift || true

BACKUP=0
DRY_RUN=0
POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    -Backup|--backup)
      BACKUP=1
      shift
      ;;
    -DryRun|--dry-run)
      DRY_RUN=1
      shift
      ;;
    *)
      POSITIONAL_ARGS+=("$1")
      shift
      ;;
  esac
done

usage() {
  cat <<'EOF'
Usage:
  ./scripts/remote-backend.sh env-check
  ./scripts/remote-backend.sh connect
  ./scripts/remote-backend.sh host-cmd <command>
  ./scripts/remote-backend.sh php-cmd <command>
  ./scripts/remote-backend.sh route-list [path]
  ./scripts/remote-backend.sh read-file <remotePath>
  ./scripts/remote-backend.sh file-exists <remotePath>
  ./scripts/remote-backend.sh backup-file <remotePath>
  ./scripts/remote-backend.sh upload-file <localPath> <remotePath> [-Backup]
  ./scripts/remote-backend.sh download-file <remotePath> <localPath>
  ./scripts/remote-backend.sh grep <pattern> [remotePath]
  ./scripts/remote-backend.sh bookmarks-check
  ./scripts/remote-backend.sh notes-check

Options:
  -Backup   Create a timestamped backup before upload-file overwrites a remote file.
  -DryRun   Print the command that would run without executing it.
EOF
}

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

join_args() {
  local IFS=' '
  printf '%s' "$*"
}

quote_sh_single() {
  local value="${1//\'/\'\"\'\"\'}"
  printf "'%s'" "$value"
}

resolve_local_path() {
  local path_value="$1"
  if [[ "$path_value" = /* ]]; then
    printf '%s\n' "$path_value"
  else
    local parent_dir
    local base_name
    parent_dir="$(dirname "$path_value")"
    base_name="$(basename "$path_value")"
    (
      cd "$REPO_ROOT/$parent_dir"
      printf '%s/%s\n' "$(pwd)" "$base_name"
    )
  fi
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

load_backend_config() {
  [[ -f "$ENV_FILE" ]] || fail "Missing .env.local at $ENV_FILE"

  local required_keys=(
    SECRET_REMOTE_BACKEND_HOST
    SECRET_REMOTE_BACKEND_USER
    SECRET_REMOTE_BACKEND_PASSWORD
    SECRET_REMOTE_BACKEND_PATH
  )

  declare -gA BACKEND_CONFIG=()

  while IFS= read -r line; do
    [[ "$line" =~ ^SECRET_REMOTE_BACKEND_[A-Z_]+= ]] || continue
    local key="${line%%=*}"
    local value="${line#*=}"
    BACKEND_CONFIG["$key"]="$value"
  done <"$ENV_FILE"

  local key
  for key in "${required_keys[@]}"; do
    [[ -n "${BACKEND_CONFIG[$key]:-}" ]] || fail "Missing required key in .env.local: $key"
  done

  require_command ssh
  require_command scp
}

invoke_remote_host_command() {
  local remote_command="$1"
  local target="${BACKEND_CONFIG[SECRET_REMOTE_BACKEND_USER]}@${BACKEND_CONFIG[SECRET_REMOTE_BACKEND_HOST]}"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] ssh %s %s\n' "$target" "$remote_command"
    return 0
  fi

  ssh \
    -o BatchMode=yes \
    -o StrictHostKeyChecking=accept-new \
    "$target" \
    "$remote_command"
}

invoke_remote_php_command() {
  local php_command="$1"
  local remote_command="docker exec ${CONTAINER_NAME} sh -lc $(quote_sh_single "cd ${CONTAINER_PROJECT_PATH} && ${php_command}")"
  invoke_remote_host_command "$remote_command"
}

backup_remote_file() {
  local remote_relative_path="${1//\\//}"
  local timestamp
  timestamp="$(date +%Y%m%d%H%M%S)"
  local source="${BACKEND_CONFIG[SECRET_REMOTE_BACKEND_PATH]%/}/${remote_relative_path}"
  local backup="${source}.bak.${timestamp}"
  local remote_command="cp $(quote_sh_single "$source") $(quote_sh_single "$backup")"
  invoke_remote_host_command "$remote_command"
  printf 'Backup created: %s.bak.%s\n' "$remote_relative_path" "$timestamp"
}

upload_remote_file() {
  local local_path
  local remote_relative_path
  local resolved_local_path
  local remote_target

  local_path="$1"
  remote_relative_path="${2//\\//}"
  resolved_local_path="$(resolve_local_path "$local_path")"
  [[ -f "$resolved_local_path" ]] || fail "Local file not found: $resolved_local_path"

  if [[ "$BACKUP" -eq 1 ]]; then
    backup_remote_file "$remote_relative_path"
  fi

  remote_target="${BACKEND_CONFIG[SECRET_REMOTE_BACKEND_USER]}@${BACKEND_CONFIG[SECRET_REMOTE_BACKEND_HOST]}:${BACKEND_CONFIG[SECRET_REMOTE_BACKEND_PATH]%/}/${remote_relative_path}"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] upload %s -> %s\n' "$resolved_local_path" "$remote_target"
    return 0
  fi

  scp "$resolved_local_path" "$remote_target"
}

download_remote_file() {
  local remote_relative_path="${1//\\//}"
  local local_path="$2"
  local resolved_local_path
  local remote_source
  local local_dir

  resolved_local_path="$(resolve_local_path "$local_path")"
  local_dir="$(dirname "$resolved_local_path")"
  mkdir -p "$local_dir"

  remote_source="${BACKEND_CONFIG[SECRET_REMOTE_BACKEND_USER]}@${BACKEND_CONFIG[SECRET_REMOTE_BACKEND_HOST]}:${BACKEND_CONFIG[SECRET_REMOTE_BACKEND_PATH]%/}/${remote_relative_path}"

  if [[ "$DRY_RUN" -eq 1 ]]; then
    printf '[dry-run] download %s -> %s\n' "$remote_source" "$resolved_local_path"
    return 0
  fi

  scp "$remote_source" "$resolved_local_path"
}

show_env_check() {
  local password="${BACKEND_CONFIG[SECRET_REMOTE_BACKEND_PASSWORD]}"
  local password_mask
  password_mask="$(printf '%*s' "${#password}" '' | tr ' ' '*')"
  if [[ ${#password_mask} -gt 12 ]]; then
    password_mask="${password_mask:0:12}"
  fi

  cat <<EOF
env_file: $ENV_FILE
host: ${BACKEND_CONFIG[SECRET_REMOTE_BACKEND_HOST]}
user: ${BACKEND_CONFIG[SECRET_REMOTE_BACKEND_USER]}
password: $password_mask
remote_path: ${BACKEND_CONFIG[SECRET_REMOTE_BACKEND_PATH]}
container: $CONTAINER_NAME
container_project_path: $CONTAINER_PROJECT_PATH
ssh: $(command -v ssh)
scp: $(command -v scp)
EOF
}

load_backend_config

case "$COMMAND" in
  help)
    usage
    ;;
  env-check)
    show_env_check
    ;;
  connect)
    invoke_remote_host_command "pwd"
    ;;
  host-cmd)
    [[ ${#POSITIONAL_ARGS[@]} -ge 1 ]] || fail "host-cmd requires a command string."
    invoke_remote_host_command "$(join_args "${POSITIONAL_ARGS[@]}")"
    ;;
  php-cmd)
    [[ ${#POSITIONAL_ARGS[@]} -ge 1 ]] || fail "php-cmd requires a command string."
    invoke_remote_php_command "$(join_args "${POSITIONAL_ARGS[@]}")"
    ;;
  route-list)
    if [[ ${#POSITIONAL_ARGS[@]} -ge 1 ]]; then
      invoke_remote_php_command "php artisan route:list --path=$(join_args "${POSITIONAL_ARGS[@]}")"
    else
      invoke_remote_php_command "php artisan route:list"
    fi
    ;;
  read-file)
    [[ ${#POSITIONAL_ARGS[@]} -ge 1 ]] || fail "read-file requires <remotePath>."
    invoke_remote_php_command "cat $(quote_sh_single "${POSITIONAL_ARGS[0]//\\//}")"
    ;;
  file-exists)
    [[ ${#POSITIONAL_ARGS[@]} -ge 1 ]] || fail "file-exists requires <remotePath>."
    invoke_remote_php_command "if [ -e $(quote_sh_single "${POSITIONAL_ARGS[0]//\\//}") ]; then echo exists; else echo missing; fi"
    ;;
  backup-file)
    [[ ${#POSITIONAL_ARGS[@]} -ge 1 ]] || fail "backup-file requires <remotePath>."
    backup_remote_file "${POSITIONAL_ARGS[0]}"
    ;;
  upload-file)
    [[ ${#POSITIONAL_ARGS[@]} -ge 2 ]] || fail "upload-file requires <localPath> <remotePath>."
    upload_remote_file "${POSITIONAL_ARGS[0]}" "${POSITIONAL_ARGS[1]}"
    ;;
  download-file)
    [[ ${#POSITIONAL_ARGS[@]} -ge 2 ]] || fail "download-file requires <remotePath> <localPath>."
    download_remote_file "${POSITIONAL_ARGS[0]}" "${POSITIONAL_ARGS[1]}"
    ;;
  grep)
    [[ ${#POSITIONAL_ARGS[@]} -ge 1 ]] || fail "grep requires <pattern> [remotePath]."
    search_path="."
    if [[ ${#POSITIONAL_ARGS[@]} -ge 2 ]]; then
      search_path="${POSITIONAL_ARGS[1]}"
    fi
    invoke_remote_php_command "grep -RIn -- $(quote_sh_single "${POSITIONAL_ARGS[0]}") $(quote_sh_single "${search_path//\\//}")"
    ;;
  bookmarks-check)
    invoke_remote_php_command "php artisan route:list --path=api/bookmarks"
    ;;
  notes-check)
    invoke_remote_php_command "php artisan route:list --path=api/notes"
    ;;
  *)
    usage
    fail "Unknown command: $COMMAND"
    ;;
esac
