# WISE System Log Analyzer — webapp

React + TypeScript + Vite rewrite of the log analyzer. See the [repo root README](../README.md) for the overall project description and the deployment workflow.

## Commands

```bash
npm install
npm run dev      # dev server with HMR
npm run build    # production build -> dist/index.html (single self-contained file)
npm test         # unit tests (vitest)
```

## Layout

- `src/components/` — UI, grouped by feature (`timeline/`, `table/`, `sidebar/`, `upload/`, `legend/`, `modal/`, `layout/`).
- `src/lib/parser/` — one module per product series (`wifi.ts`, `lora.ts`, `nbiot.ts`, `lan.ts`), plus `registry.ts` for series detection/dispatch.
- `src/lib/timelineLayout.ts` — pure layout math for the density timeline (bucketing, dot sizing/spacing), unit-tested separately from the DOM-facing component.
- `src/hooks/` — session state (`useSessions`), theme (`useTheme`), per-PE color assignment (`usePeColorMap`).
- `test/` — vitest unit tests for the parsers and timeline layout.
