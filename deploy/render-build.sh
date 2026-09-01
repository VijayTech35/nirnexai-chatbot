#!/bin/sh
# Render build script (native single Service). Build context = repo root.
# This installs both workspaces and produces the Next standalone output that
# render-server.js runs, keeping the whole stack behind one origin.
set -e

echo "[render-build] installing backend deps..."
npm --prefix backend install --omit=dev

echo "[render-build] installing frontend deps..."
npm --prefix frontend install --omit=dev

echo "[render-build] building frontend (standalone)..."
npm --prefix frontend run build

# Make the standalone server self-contained (assets + static chunks).
echo "[render-build] copying static assets into standalone..."
cp -R frontend/.next/static frontend/.next/standalone/.next/static 2>/dev/null || true

echo "[render-build] done."
