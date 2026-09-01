# Security Policy

## Supported Versions

chematic-draw is pre-1.0; the current stable release is `v0.9.0`.
Security fixes are made against `main`
and included in the next tagged pre-release; older pre-releases do not
receive backports.

| Version | Supported |
|---|---|
| `v0.9.0` | :white_check_mark: |
| `main` / latest pre-release | :white_check_mark: |
| Older pre-releases | :x: |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Report privately using one of:

- [GitHub Security Advisories](https://github.com/kent-tokyo/chematic-draw/security/advisories/new)
  for this repository (preferred — keeps the report private until a fix
  ships), or
- Email **ke.tanabe@gmail.com** with a description of the issue, steps to
  reproduce, and any relevant file/input that triggers it.

This is a solo-maintained project — there's no dedicated security team or
formal SLA. Expect an initial response within a few days. Confirmed
vulnerabilities will be fixed and disclosed via a GitHub Security Advisory
and the [CHANGELOG](./CHANGELOG.md); credit is given unless you ask
otherwise.

## Scope

**In scope:** the application code in `crates/`, `electron/`, and the
build/release pipeline in `.github/workflows/`.

**Out of scope / already known:**
- Released binaries are **unsigned** — no code signing or notarization is
  configured (see [`docs/CI_CD.md`](./docs/CI_CD.md)). This is a known
  limitation, not something to report.
- The `SHA256SUMS-<OS>.txt` files published with each release ([Quick
  Start](./docs/QUICK_START.md#installation)) let you confirm a download
  wasn't corrupted or altered in transit. They are **not** a substitute for
  code signing — the checksums themselves are published unsigned in the
  same release, so they don't prove the release itself is authentic, only
  that your download matches what CI produced.
- Vulnerabilities in the underlying [`chematic`](https://crates.io/crates/chematic)
  chemistry engine should be reported to that project directly, not here.
