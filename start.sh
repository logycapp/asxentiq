#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_ENV="$BACKEND_DIR/.env"
BACKEND_ENV_EXAMPLE="$BACKEND_DIR/.env.example"
BACKEND_PID=""
FRONTEND_PID=""

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

  if grep -q "^${key}=" "$file"; then
    sed -i "s#^${key}=.*#${key}=${value}#" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >> "$file"
  fi
}

prepare_backend_env() {
  if [[ ! -f "$BACKEND_ENV" ]]; then
    cp "$BACKEND_ENV_EXAMPLE" "$BACKEND_ENV"
  fi

  upsert_env "$BACKEND_ENV" "APP_NAME" "Asxentiq"
  upsert_env "$BACKEND_ENV" "APP_ENV" "local"
  upsert_env "$BACKEND_ENV" "APP_DEBUG" "true"
  upsert_env "$BACKEND_ENV" "APP_URL" "http://localhost:8000"
  upsert_env "$BACKEND_ENV" "FRONTEND_URL" "http://localhost:4200"
  upsert_env "$BACKEND_ENV" "DB_CONNECTION" "mysql"
  upsert_env "$BACKEND_ENV" "DB_HOST" "127.0.0.1"
  upsert_env "$BACKEND_ENV" "DB_PORT" "3307"
  upsert_env "$BACKEND_ENV" "DB_DATABASE" "asxentiq"
  upsert_env "$BACKEND_ENV" "DB_USERNAME" "root"
  upsert_env "$BACKEND_ENV" "DB_PASSWORD" "1234"
  upsert_env "$BACKEND_ENV" "SESSION_DRIVER" "cookie"
  upsert_env "$BACKEND_ENV" "SESSION_DOMAIN" "localhost"
  upsert_env "$BACKEND_ENV" "SANCTUM_STATEFUL_DOMAINS" "localhost:4200,127.0.0.1:4200"

  grep -q '^DB_CONNECTION=mysql$' "$BACKEND_ENV" || { echo 'DB_CONNECTION debe ser mysql'; exit 1; }
  grep -q '^DB_DATABASE=asxentiq$' "$BACKEND_ENV" || { echo 'DB_DATABASE debe ser asxentiq'; exit 1; }
}

ensure_app_key() {
  if ! grep -q '^APP_KEY=base64:' "$BACKEND_ENV"; then
    (cd "$BACKEND_DIR" && php artisan key:generate --ansi)
  fi
}

ensure_database() {
  if mysql -h 127.0.0.1 -P 3307 -u root -p1234 -e "SELECT 1" >/dev/null 2>&1; then
    mysql -h 127.0.0.1 -P 3307 -u root -p1234 -e "CREATE DATABASE IF NOT EXISTS asxentiq CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
    return 0
  fi

  if sudo -n mysql -u root -e "SELECT 1" >/dev/null 2>&1; then
    echo "MySQL root está configurado con auth_socket/sudo y no con acceso TCP en 127.0.0.1." >&2
    echo "Laravel necesita exactamente: DB_HOST=127.0.0.1, DB_PORT=3307, DB_USERNAME=root, DB_PASSWORD=1234." >&2
    echo "Reconfigura MySQL root para acceso TCP o con la contraseña configurada o cambia credenciales y .env." >&2
    exit 1
  fi

  echo "No fue posible autenticar con MySQL usando root en 127.0.0.1." >&2
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
  echo "Iniciando Laravel API en http://localhost:8000"
  (
    cd "$BACKEND_DIR"
    php artisan migrate --seed --force
    php artisan serve --host=127.0.0.1 --port=8000
  ) &
  BACKEND_PID=$!
}

start_frontend() {
  echo "Iniciando Angular en http://localhost:4200"
  (
    cd "$FRONTEND_DIR"
    npm run start -- --host 127.0.0.1 --port 4200
  ) &
  FRONTEND_PID=$!
}

main() {
  require_dir "$BACKEND_DIR"
  require_dir "$FRONTEND_DIR"
  require_cmd php
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
