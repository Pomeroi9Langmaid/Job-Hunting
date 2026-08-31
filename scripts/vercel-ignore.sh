#!/bin/sh
set -eu

changed="$(git diff --name-only HEAD^ HEAD)"
relevant="$(printf '%s\n' "$changed" | grep -Ev '^(sources/|README\.md$)' || true)"

# Vercel: exit 0 = skip build; exit 1 = build.
if [ -z "$relevant" ]; then
  exit 0
fi
exit 1
