#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Este script debe ejecutarse dentro de un repositorio git." >&2
  exit 1
fi

BRANCH="$(git branch --show-current)"
if [[ -z "$BRANCH" ]]; then
  BRANCH="main"
fi

DEFAULT_MESSAGE="Update project changes"
COMMIT_MESSAGE="${1:-$DEFAULT_MESSAGE}"

git add -A
git reset -- backend/storage >/dev/null 2>&1 || true

if git diff --cached --quiet; then
  echo "No hay cambios para subir."
  exit 0
fi

git commit -m "$COMMIT_MESSAGE"
git push origin "$BRANCH"
