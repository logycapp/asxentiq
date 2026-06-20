#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_ENV="$BACKEND_DIR/.env"
BACKEND_ENV_EXAMPLE="$BACKEND_DIR/.env.example"
BACKEND_PID=""
FRONTEND_PID=""
PHP_BIN="${PHP_BIN:-}"
BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_HOST="${FRONTEND_HOST:-0.0.0.0}"
FRONTEND_PORT="${FRONTEND_PORT:-4200}"

cleanup() {
  echo
  echo "Deteniendo servicios..."
  if [[ -n "$BACKEND_PID" ]] && kill -0 "$BACKEND_PID" 2>/dev/null; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [[ -n "$FRONTEND_PID" ]] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  wait 2>/dev/null || true
}

trap cleanup EXIT INT TERM

require_dir() {
  local dir="$1"
  if [[ ! -d "$dir" ]]; then
    echo "Falta la carpeta requerida: $dir" >&2
    exit 1
  fi
}

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "No se encontró el comando requerido: $cmd" >&2
    exit 1
  fi
}

upsert_env() {
  local file="$1"
  local key="$2"
  local value="$3"
  local tmp_file="${file}.tmp.$$"

  awk -v key="$key" -v value="$value" '
    BEGIN { found = 0 }
    $0 ~ "^" key "=" {
      print key "=" value
      found = 1
      next
    }
    { print }
    END {
      if (!found) {
        print key "=" value
      }
    }
  ' "$file" > "$tmp_file"

  mv "$tmp_file" "$file"
}

env_file_value() {
  local file="$1"
  local key="$2"

  grep -m 1 "^${key}=" "$file" 2>/dev/null | cut -d= -f2-
}

env_file_value_unquoted() {
  local value="$1"

  if [[ "$value" == \"*\" && "$value" == *\" ]]; then
    printf '%s' "${value:1:${#value}-2}"
    return
  fi

  if [[ "$value" == \'*\' && "$value" == *\' ]]; then
    printf '%s' "${value:1:${#value}-2}"
    return
  fi

  printf '%s' "$value"
}

value_for_env() {
  local file="$1"
  local key="$2"
  local default_value="$3"
  local shell_value="${!key-}"
  local file_value

  if [[ -n "$shell_value" ]]; then
    printf '%s' "$shell_value"
    return
  fi

  file_value="$(env_file_value "$file" "$key")"
  if [[ -n "$file_value" ]]; then
    printf '%s' "$file_value"
    return
  fi

  printf '%s' "$default_value"
}

prepare_backend_env() {
  if [[ ! -f "$BACKEND_ENV" ]]; then
    cp "$BACKEND_ENV_EXAMPLE" "$BACKEND_ENV"
  fi

  local app_url="${APP_URL:-${PUBLIC_BACKEND_URL:-$(env_file_value "$BACKEND_ENV" "APP_URL")}}"
  local frontend_url="${FRONTEND_URL:-${PUBLIC_FRONTEND_URL:-$(env_file_value "$BACKEND_ENV" "FRONTEND_URL")}}"
  local session_domain_default="${SESSION_DOMAIN:-}"
  local sanctum_default="${SANCTUM_STATEFUL_DOMAINS:-localhost:${FRONTEND_PORT},127.0.0.1:${FRONTEND_PORT}}"

  app_url="${app_url:-http://localhost:${BACKEND_PORT}}"
  frontend_url="${frontend_url:-http://localhost:${FRONTEND_PORT}}"

  upsert_env "$BACKEND_ENV" "APP_NAME" "$(value_for_env "$BACKEND_ENV" "APP_NAME" "Asxentiq")"
  upsert_env "$BACKEND_ENV" "APP_ENV" "$(value_for_env "$BACKEND_ENV" "APP_ENV" "local")"
  upsert_env "$BACKEND_ENV" "APP_DEBUG" "$(value_for_env "$BACKEND_ENV" "APP_DEBUG" "true")"
  upsert_env "$BACKEND_ENV" "APP_URL" "$app_url"
  upsert_env "$BACKEND_ENV" "FRONTEND_URL" "$frontend_url"
  upsert_env "$BACKEND_ENV" "DB_CONNECTION" "$(value_for_env "$BACKEND_ENV" "DB_CONNECTION" "mysql")"
  upsert_env "$BACKEND_ENV" "DB_HOST" "$(value_for_env "$BACKEND_ENV" "DB_HOST" "127.0.0.1")"
  upsert_env "$BACKEND_ENV" "DB_PORT" "$(value_for_env "$BACKEND_ENV" "DB_PORT" "3306")"
  upsert_env "$BACKEND_ENV" "DB_DATABASE" "$(value_for_env "$BACKEND_ENV" "DB_DATABASE" "asxentiq")"
  upsert_env "$BACKEND_ENV" "DB_USERNAME" "$(value_for_env "$BACKEND_ENV" "DB_USERNAME" "root")"
  upsert_env "$BACKEND_ENV" "DB_PASSWORD" "$(value_for_env "$BACKEND_ENV" "DB_PASSWORD" "")"
  upsert_env "$BACKEND_ENV" "SESSION_DRIVER" "$(value_for_env "$BACKEND_ENV" "SESSION_DRIVER" "cookie")"
  upsert_env "$BACKEND_ENV" "SESSION_DOMAIN" "$(value_for_env "$BACKEND_ENV" "SESSION_DOMAIN" "$session_domain_default")"
  upsert_env "$BACKEND_ENV" "SANCTUM_STATEFUL_DOMAINS" "$(value_for_env "$BACKEND_ENV" "SANCTUM_STATEFUL_DOMAINS" "$sanctum_default")"

  grep -q '^DB_CONNECTION=mysql$' "$BACKEND_ENV" || { echo 'DB_CONNECTION debe ser mysql'; exit 1; }
}

ensure_app_key() {
  if ! grep -q '^APP_KEY=base64:' "$BACKEND_ENV"; then
    (cd "$BACKEND_DIR" && "$PHP_BIN" artisan key:generate --ansi)
  fi
}

ensure_database() {
  local db_host db_port db_name db_user db_pass
  db_host="$(env_file_value_unquoted "$(env_file_value "$BACKEND_ENV" "DB_HOST")")"
  db_port="$(env_file_value_unquoted "$(env_file_value "$BACKEND_ENV" "DB_PORT")")"
  db_name="$(env_file_value_unquoted "$(env_file_value "$BACKEND_ENV" "DB_DATABASE")")"
  db_user="$(env_file_value_unquoted "$(env_file_value "$BACKEND_ENV" "DB_USERNAME")")"
  db_pass="$(env_file_value_unquoted "$(env_file_value "$BACKEND_ENV" "DB_PASSWORD")")"

  local mysql_args=(-h "$db_host" -P "$db_port" -u "$db_user")
  if [[ -n "$db_pass" ]]; then
    mysql_args+=("-p${db_pass}")
  fi

  if mysql "${mysql_args[@]}" "$db_name" -e "SELECT 1" >/dev/null 2>&1; then
    return 0
  fi

  if mysql "${mysql_args[@]}" -e "CREATE DATABASE IF NOT EXISTS \`${db_name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" >/dev/null 2>&1; then
    return 0
  fi

  echo "No fue posible conectar o crear la base de datos MySQL configurada." >&2
  echo "Revisa DB_HOST, DB_PORT, DB_DATABASE, DB_USERNAME y DB_PASSWORD en backend/.env o exportalas antes de ejecutar el script." >&2
  exit 1
}

install_backend_dependencies() {
  if [[ ! -f "$BACKEND_DIR/vendor/autoload.php" ]]; then
    echo "Instalando dependencias de Laravel..."
    (cd "$BACKEND_DIR" && composer install)
  fi
}

install_frontend_dependencies() {
  if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
    echo "Instalando dependencias de Angular..."
    (cd "$FRONTEND_DIR" && npm install)
  fi
}

start_backend() {
  echo "Iniciando Laravel API en ${BACKEND_HOST}:${BACKEND_PORT}"
  (
    cd "$BACKEND_DIR"
    "$PHP_BIN" artisan migrate --seed --force
    "$PHP_BIN" artisan serve --host="$BACKEND_HOST" --port="$BACKEND_PORT"
  ) &
  BACKEND_PID=$!
}

start_frontend() {
  echo "Iniciando Angular en ${FRONTEND_HOST}:${FRONTEND_PORT}"
  (
    cd "$FRONTEND_DIR"
    npm run start -- --host "$FRONTEND_HOST" --port "$FRONTEND_PORT"
  ) &
  FRONTEND_PID=$!
}

main() {
  require_dir "$BACKEND_DIR"
  require_dir "$FRONTEND_DIR"
  if [[ -z "$PHP_BIN" ]]; then
    if command -v php8.2 >/dev/null 2>&1; then
      PHP_BIN="$(command -v php8.2)"
    else
      PHP_BIN="$(command -v php)"
    fi
  fi
  require_cmd "$PHP_BIN"
  require_cmd composer
  require_cmd mysql
  require_cmd node
  require_cmd npm

  prepare_backend_env
  install_backend_dependencies
  ensure_app_key
  ensure_database
  start_backend
  install_frontend_dependencies
  start_frontend

  echo "Servicios iniciados. Presiona CTRL + C para detenerlos."
  wait "$BACKEND_PID" "$FRONTEND_PID"
}

main "$@"
