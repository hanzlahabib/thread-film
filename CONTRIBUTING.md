# Contributing

Thanks for helping. Keep changes small and focused.

## Setup
```bash
pnpm install
pnpm typecheck
pnpm validate
pnpm studio
```
Use pnpm; the lockfile is committed.

## What fits
- Bug fixes in `src/engine/` with a still or short frame range that shows the fix
- New stop or chip features, if they keep the one-line, one-world model
- Improvements to the skill in `skill/thread-film/` and to the docs
- A link to your film in the README's "Made with thread-film" section

## Ground rules
- Components read colours, fonts and radii only from the theme. No hard-coded values in `src/engine/`.
- The line is drawn and measured from one `Trail`. Do not add a second path.
- Demo captures must show fictional data only. No real emails, phone numbers, tokens or customer names.
- Do not run several full renders at once; they are heavy.
- No claims in docs that you cannot back up.

## Pull requests
Describe what changed and attach a before and after still when the picture changes. Run `pnpm typecheck` and `pnpm validate` first.
