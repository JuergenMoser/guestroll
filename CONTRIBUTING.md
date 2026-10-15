# Contributing

Thanks for wanting to improve Guestroll. Bug reports, translations, docs and
code are all welcome.

## Before you start

- **Bugs**: open an issue with the version, how you run it, and the steps to
  reproduce. For anything security-related, use
  [private reporting](https://github.com/achedon12/guestroll/security/advisories/new) instead.
- **Features**: open an issue or a discussion first, so we can agree on the
  approach before you spend time on it. Small fixes can go straight to a PR.
- **Translations**: very welcome, see [docs/customization.md](docs/customization.md#translations).

## Making a change

1. Fork, then create a branch: `git checkout -b fix/upload-retry`.
2. Set up the project: [docs/development.md](docs/development.md).
3. Make the change, with tests when behaviour changes.
4. `npm run lint && npm run typecheck && npm test` must pass.
5. Open a pull request explaining what changes and why.

## The few rules that matter

- **Guests never see other guests' photos.** It's the product's core promise.
  Any change near access control goes through `src/lib/policy.ts` and its tests.
- **Every admin page and route checks the session itself.**
  `tests/routeGuards.test.ts` enforces it.
- **Text in four languages.** Add every new string to `en`, `fr`, `it` and
  `es`; machine translation is fine as a start, say so in the PR.
- **Tokens, not colors.** Use `bg-surface`, `text-ink-muted`… so light and
  dark themes both work.

By contributing, you agree that your contributions are licensed under the
[MIT License](LICENSE) and that you follow the [code of conduct](CODE_OF_CONDUCT.md).
