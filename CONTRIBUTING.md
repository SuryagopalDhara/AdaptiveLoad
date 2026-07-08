# Contributing to AdaptiveLoader

Thanks for considering contributing — this project is community-driven and welcomes issues, PRs, and ideas from developers of any experience level.

## Ways to contribute

- **Bug reports** — open a GitHub Issue with steps to reproduce, your browser/OS, and what you expected vs. what happened.
- **Feature requests** — open an Issue describing the use case. Check existing issues first to avoid duplicates.
- **Code contributions** — PRs welcome. See workflow below.
- **Documentation** — typo fixes, clearer examples, translated docs are all valued.

## Development setup

```bash
git clone https://github.com/adaptiveloader/adaptiveloader.git
cd adaptiveloader
```

No build step is required for the core library — it's plain vanilla JS. For the WordPress plugin, use a local WordPress environment (e.g. [LocalWP](https://localwp.com/)) and symlink or copy `wordpress-plugin/adaptiveloader` into `wp-content/plugins/`.

## Pull request workflow

1. Fork the repo and create a branch from `main`: `git checkout -b fix/short-description`
2. Make your changes. Keep the core library dependency-free — no adding npm packages to `core/adaptiveloader.js`.
3. Test manually in at least one browser (Chrome/Firefox) and, if touching WP code, a local WordPress install.
4. Commit with a clear message (e.g. `Fix: spinner not clearing on SPA route change`).
5. Push and open a PR against `main`, describing what changed and why.

## Code style

- **JS**: match the existing style in `core/adaptiveloader.js` (no semicolons omitted, 2-space indent, ES5-compatible syntax so it works without a build step).
- **PHP**: follow [WordPress PHP Coding Standards](https://developer.wordpress.org/coding-standards/wordpress-coding-standards/php/).
- Keep the core library dependency-free. This is a hard rule — it's what makes it usable on any site regardless of tech stack.

## Reporting security issues

Please do not open a public issue for security vulnerabilities. Instead, email the maintainers directly (see repository contact info) so a fix can be prepared before public disclosure.

## Code of Conduct

Be respectful and constructive. This project follows the spirit of the [Contributor Covenant](https://www.contributor-covenant.org/) — harassment or hostility toward other contributors won't be tolerated.
