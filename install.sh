#!/usr/bin/env bash
set -euo pipefail

REPO="${COGMEM_REPO:-liuqin164/cogmem}"
INSTALL_HOME="${COGMEM_INSTALL_HOME:-$HOME/.cogmem/pkg}"
BIN_DIR="${COGMEM_BIN_DIR:-$HOME/.bun/bin}"
ASSET_URL="${COGMEM_RELEASE_TARBALL:-}"

log() {
  printf 'cogmem: %s\n' "$*"
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1
}

ensure_bun() {
  if need_cmd bun; then
    return
  fi

  log "Bun was not found; installing Bun for the current user."
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
  export PATH="$BUN_INSTALL/bin:$PATH"

  if ! need_cmd bun; then
    log "Bun install finished but bun is still not on PATH."
    log "Add $HOME/.bun/bin to PATH and rerun this installer."
    exit 1
  fi
}

latest_release_asset() {
  if [ -n "$ASSET_URL" ]; then
    printf '%s\n' "$ASSET_URL"
    return
  fi

  local api="https://api.github.com/repos/$REPO/releases/latest"
  local payload
  payload="$(curl -fsSL "$api" || true)"
  
  local tag
  tag="$(printf '%s\n' "$payload" | sed -n 's/.*"tag_name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -n 1)"

  if [ -n "$tag" ]; then
    printf 'github:%s#%s\n' "$REPO" "$tag"
  else
    printf 'github:%s#main\n' "$REPO"
  fi
}

ensure_install_home() {
  mkdir -p "$INSTALL_HOME"
  if [ ! -f "$INSTALL_HOME/package.json" ]; then
    printf '{"private":true,"dependencies":{}}\n' > "$INSTALL_HOME/package.json"
  fi
}

link_cli() {
  mkdir -p "$BIN_DIR"
  local target="$INSTALL_HOME/node_modules/.bin/cogmem"
  if [ ! -x "$target" ]; then
    log "Installed package did not expose $target."
    exit 1
  fi
  for bin in "$INSTALL_HOME"/node_modules/.bin/cogmem*; do
    if [ -x "$bin" ]; then
      ln -sf "$bin" "$BIN_DIR/$(basename "$bin")"
    fi
  done
  log "Installed CLI: $BIN_DIR/cogmem"
}

main() {
  ensure_bun
  ensure_install_home

  local asset
  asset="$(latest_release_asset)"
  log "Installing latest release from $asset"
  (
    cd "$INSTALL_HOME"
    bun add "cogmem@$asset"
  )
  link_cli

  log "Installed package home: $INSTALL_HOME"
  log "Run this later to update: cogmem update --yes"

  if [ "${COGMEM_SKIP_INIT:-0}" = "1" ]; then
    log "Skipping init because COGMEM_SKIP_INIT=1."
    exit 0
  fi

  log "Starting interactive setup. Configure an embedding model and a memory-model LLM for Dream Curator."
  # shellcheck disable=SC2086
  "$BIN_DIR/cogmem" init ${COGMEM_INIT_ARGS:-}
}

main "$@"
