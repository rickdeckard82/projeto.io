#!/bin/sh
# Roda `npm audit` no backend e no frontend, dentro de containers (não há Node no host).
# Falha (código != 0) se houver vulnerabilidade de severidade >= `AUDIT_LEVEL` (padrão: high),
# ignorando as aceitas em docs/security.md (via `.npmrc`/`audit-level` não cobre exceções —
# use `npm audit --json` + filtro se precisar de allowlist fina).
#
# Uso:  ./scripts/audit.sh            # nível high
#       AUDIT_LEVEL=moderate ./scripts/audit.sh

set -eu

REPO_ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
AUDIT_LEVEL="${AUDIT_LEVEL:-high}"
IMAGE="node:20-alpine"
status=0

for pkg in backend frontend; do
  echo "=== npm audit ($pkg, nível $AUDIT_LEVEL) ==="
  if ! docker run --rm -v "$REPO_ROOT/$pkg:/app" -w /app "$IMAGE" \
      sh -c "npm ci --no-audit --no-fund >/dev/null 2>&1 && npm audit --audit-level=$AUDIT_LEVEL"; then
    status=1
  fi
  echo
done

exit $status
