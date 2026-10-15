#!/bin/sh
# Lets the container write to a bind-mounted data folder owned by any host user:
# started as root, it hands DATA_DIR to PUID:PGID and drops to that user.
# Started with --user, it runs as that user and leaves permissions alone.
set -eu

PUID="${PUID:-1001}"
PGID="${PGID:-1001}"
DATA_DIR="${DATA_DIR:-/data}"

if [ "$(id -u)" = "0" ]; then
  mkdir -p "$DATA_DIR"
  # Only fix ownership when needed: a recursive chown on a large album is slow.
  if [ "$(stat -c '%u:%g' "$DATA_DIR")" != "$PUID:$PGID" ]; then
    echo "guestroll: giving $DATA_DIR to $PUID:$PGID"
    chown -R "$PUID:$PGID" "$DATA_DIR"
  fi
  exec su-exec "$PUID:$PGID" "$@"
fi

exec "$@"
