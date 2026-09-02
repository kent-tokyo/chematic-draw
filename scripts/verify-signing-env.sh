#!/usr/bin/env bash
set -euo pipefail

# Release tags must not silently produce unsigned artifacts. Normal branch
# builds stay unsigned, while the CI tag job supplies these values from
# repository secrets.
if [[ "${GITHUB_REF:-}" != refs/tags/v* ]]; then
  echo "signing verification skipped (not a release tag)"
  exit 0
fi

case "${RUNNER_OS:-}" in
  macOS)
    required=(APPLE_CERTIFICATE_BASE64 APPLE_CERTIFICATE_PASSWORD APPLE_SIGNING_IDENTITY APPLE_ID APPLE_APP_SPECIFIC_PASSWORD APPLE_TEAM_ID)
    ;;
  Windows)
    required=(WINDOWS_CERTIFICATE_BASE64 WINDOWS_CERTIFICATE_PASSWORD)
    ;;
  *)
    echo "signing verification passed (no desktop signing credentials required on ${RUNNER_OS:-Linux})"
    exit 0
    ;;
esac

for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "missing release signing credential: $name" >&2
    exit 1
  fi
done
echo "release signing credentials are present for $RUNNER_OS"
