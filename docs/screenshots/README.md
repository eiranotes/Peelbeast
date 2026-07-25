# Screenshots

Visual QA output, reviewed by hand. Captured at 1440×900 with a fixed seed:

```bash
npm run preview
node scripts/shoot.mjs screenshots     # writes 1440x900 and 1280x720 sets
```

Downscaled to 1200 px wide for the repository. `assembly-preview.png` comes from
`scripts/preview-assembly.mjs` — a headless composite of five builds using the real
catalog anchors, so anchor regressions show up without launching a browser.

What was found and fixed in this pass is listed in
[`../08_TEST_PLAN.md`](../08_TEST_PLAN.md) §5.
