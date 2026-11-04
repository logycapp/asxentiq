#!/usr/bin/env bash
set -euo pipefail

rm -rf .angular/cache
npm ci
npm run build
