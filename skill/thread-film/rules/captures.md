# Getting real captures

## Where captures come from
- Screenshots the project already has (marketing assets, end-to-end test screenshots) when the screen has not changed.
- A demo or seeded workspace: a local dev stack with seed data, a staging site, or a public demo account. Prefer a workspace that holds only fictional data.
- For the demo film in this repo, `pnpm render:screens` regenerates the demo captures (and `demo-screens/anchors.json`) from the HTML screens in `demo-screens/`.

## Rules while capturing
- Read-only. Navigating, opening a record, switching tabs and views, hovering and scrolling are fine. Never click anything that creates, sends, publishes, deletes, charges, spends credits, starts a call or changes settings.
- Never type or store credentials. If a session expires, stop and ask.
- Use a fresh browser tab or profile, and restore anything you changed (window size, sidebar state).
- Look at every capture for anything resembling a real person's email, phone number or token, and crop or replace it.

## Making captures usable
- Wait for data: no skeletons, spinners or toasts in frame. Dismiss tours with their own Skip or Close.
- Hide floating support widgets, environment banners and balance chips with a temporary injected style (visual only).
- Hide text that breaks the project's brand rules.
- Target 1920 px wide (a 2x device scale factor gives sharper zooms). Set the viewport with your tool's device-metrics option rather than stitching tiles.
- Capture in the mode the film will use: the app's dark or light mode decides the film's mode (`theming.md`). If the film ships both, capture both.
- Record beside each capture where and when it was taken and at what viewport.

## Keep the numbers consistent
Captures from different workspaces show different totals. Take every screen of one film from the same workspace on the same day. If that is impossible, do not put a label or counter on a figure that another screen contradicts, and say so in the report.
