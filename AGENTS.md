# Gamelist — AI Agent Instructions

## Git, SemVer, Changelog & Release Workflow (Variant 1)
Every AI agent (Claude Code, Google Antigravity, Gemini CLI, GitHub Copilot, OpenAI Codex) MUST follow this workflow:
1. **Branch per change**: Never commit feature or fix work directly on `main`/`master`. Create a branch: `feat/<slug>`, `fix/<slug>`, `perf/<slug>`, `refactor/<slug>`, or `chore/<slug>`.
2. **Conventional Commits**: Format every commit message as `<type>(<scope>): <summary>` (e.g., `feat(ui): add dashboard filter`, `fix(api): handle empty payload`). Breaking changes use `!` or a `BREAKING CHANGE:` footer.
3. **Merge to default branch**: Open a PR or merge into `main` once verified.
4. **Automated Release & Deploy**: Pushing/merging to `main`/`master` triggers `.github/workflows/release.yml` (computes the next SemVer in `VERSION` / `package.json`, updates `CHANGELOG.md`, creates tag `vX.Y.Z` + GitHub Release) and triggers auto-deploy.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
