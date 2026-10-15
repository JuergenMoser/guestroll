# Security policy

Guestroll stores other people's photos, so security reports are taken seriously.

## Reporting a vulnerability

**Please don't open a public issue.** Use GitHub's
[private vulnerability reporting](https://github.com/achedon12/guestroll/security/advisories/new)
instead. Include the version, a description of the impact, and the steps to reproduce.

You'll get an acknowledgement within 72 hours. Fixes ship as a patch release, and
reporters are credited in the advisory unless they prefer otherwise.

## Supported versions

Only the latest minor release receives security fixes.

## Scope

In scope: anything that lets someone read, download, modify or delete photos or
events they shouldn't, bypass the admin login or an event access code, or take
the instance down with little effort.

Out of scope: attacks that need the admin password or shell access to the host,
and missing hardening on deployments that ignore [docs/security.md](docs/security.md)
(for example, serving over plain HTTP).

The threat model and every protection in place are documented in
[docs/security.md](docs/security.md).
