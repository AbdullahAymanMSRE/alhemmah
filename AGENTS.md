<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Package manager: pnpm (required)

This project uses **pnpm** — not npm or yarn. Always use pnpm.

- Install: `pnpm install`
- Run scripts: `pnpm dev`, `pnpm build`, `pnpm db:migrate`, etc.
- Add deps: `pnpm add <pkg>` / `pnpm add -D <pkg>`
- Do **not** create or commit `package-lock.json` or `yarn.lock`. The only lockfile is `pnpm-lock.yaml`.
- Native build scripts are approved in `pnpm-workspace.yaml` under `allowBuilds` (pnpm v11+ replaced `onlyBuiltDependencies` with this `package: true/false` map). If pnpm reports `ERR_PNPM_IGNORED_BUILDS`, add the package there with `: true` and reinstall.
