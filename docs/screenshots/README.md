# Screenshots

Visual QA output, reviewed by hand. Captured with a fixed seed:

```bash
npm run preview
node scripts/shoot.mjs screenshots     # 1440x900 · 1280x720 · 390x844
```

`01`–`12`는 1440×900 세트를 1200 px 폭으로 축소한 것이다.
`13-battle-portrait.png`는 390×844 세로 전용 레이아웃(원본 크기) —
세로에서도 캐릭터와 적이 나란히 남는지 확인하는 용도다.

`assembly-preview.png` comes from `scripts/preview-assembly.mjs` — a headless
composite of five builds using the real catalog anchors, so anchor regressions
show up without launching a browser.

What was found and fixed in this pass is listed in
[`../08_TEST_PLAN.md`](../08_TEST_PLAN.md) §6.
