#!/usr/bin/env bash

deno --allow-read --allow-write=public/docs --allow-run=git $(dirname "$0")/prepare_changelog.ts
