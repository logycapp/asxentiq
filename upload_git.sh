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

REMOTE_URL="$(git remote get-url origin)"
if [[ -z "$REMOTE_URL" ]]; then
  echo "No se pudo leer la URL del remoto origin." >&2
  exit 1
fi

if [[ "$REMOTE_URL" =~ ^git@([^:]+): ]]; then
  SSH_HOST="${BASH_REMATCH[1]}"
elif [[ "$REMOTE_URL" =~ ^ssh://([^/]+)/ ]]; then
  SSH_HOST="${BASH_REMATCH[1]}"
else
  echo "El remoto origin no usa SSH: $REMOTE_URL" >&2
  echo "Cámbialo a una URL SSH antes de ejecutar este script." >&2
  exit 1
fi

SSH_KEYS=(
  "$HOME/.ssh/id_ed25519_github"
  "$HOME/.ssh/id_ed25519_asxentiq"
  "$HOME/.ssh/id_ed25519"
)
SSH_CMD=(ssh -o BatchMode=yes)
SSH_KEY=""
for candidate in "${SSH_KEYS[@]}"; do
  if [[ -f "$candidate" ]]; then
    SSH_KEY="$candidate"
    SSH_CMD+=(-i "$SSH_KEY" -o IdentitiesOnly=yes)
    export GIT_SSH_COMMAND="ssh -i $SSH_KEY -o IdentitiesOnly=yes"
    break
  fi
done

if [[ -z "$SSH_KEY" ]]; then
  echo "No se encontró una llave SSH utilizable en ~/.ssh/id_ed25519_asxentiq ni ~/.ssh/id_ed25519." >&2
  exit 1
fi

SSH_CHECK_OUTPUT="$("${SSH_CMD[@]}" -T "git@${SSH_HOST}" 2>&1 || true)"
if [[ "$SSH_CHECK_OUTPUT" != *"successfully authenticated"* ]]; then
  echo "La autenticación SSH no está lista para $SSH_HOST." >&2
  echo "Se intentó usar la llave: $SSH_KEY" >&2
  echo "Verifica el acceso con: ssh -T git@${SSH_HOST}" >&2
  [[ -n "$SSH_CHECK_OUTPUT" ]] && echo "$SSH_CHECK_OUTPUT" >&2
  exit 1
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
