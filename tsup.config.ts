import { defineConfig } from "tsup";

/**
 * Build dual CJS+ESM (+ .d.ts) só da SUPERFÍCIE DE BIBLIOTECA (src/index.ts e
 * src/components/index.ts) — usada por quem faz `import`/`require` do pacote publicado.
 *
 * Os CLIs (`src/bin/*.ts`) continuam compilados separadamente via `tsc` (script `build` em
 * package.json, que já injeta o shebang necessário para os binários) — eles não passam por aqui
 * porque são scripts de execução direta (`program.parse(process.argv)`), não módulos importáveis;
 * gerar ESM para eles não traria benefício e complicaria o shebang/bin do npm.
 */
export default defineConfig({
  entry: {
    index: "src/index.ts",
    "components/index": "src/components/index.ts",
  },
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: false,
  outDir: "dist",
  // Nenhuma dependência real deve ser embutida no bundle publicado — todas já são
  // dependencies/peerDependencies do pacote e devem ser resolvidas pelo projeto consumidor.
  external: [
    "react",
    "react-dom",
    "react-hook-form",
    "@hookform/resolvers",
    "hono",
    "@hono/zod-validator",
    "pg",
    "better-sqlite3",
    "drizzle-orm",
    "zod",
    "clsx",
    "tailwind-merge",
    "express",
  ],
});
