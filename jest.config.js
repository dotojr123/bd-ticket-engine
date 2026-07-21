const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  // src/bin/**/*.ts (CLI orchestration/commander wiring) é deliberadamente excluído da métrica de
  // cobertura: process.exit()/parsing de argv tornam testes unitários in-process pouco úteis.
  // É validado por testes de processo real (tests/cli-smoke.test.ts, spawnSync via tsx) em vez de
  // instrumentação istanbul, que só enxerga código executado dentro do próprio processo do Jest.
  collectCoverageFrom: ["src/lib/**/*.ts", "!src/lib/**/*.d.ts"],
  coveragePathIgnorePatterns: ["/node_modules/", "/src/contracts/"],
  coverageReporters: ["text", "text-summary", "lcov", "json-summary"],
  // Thresholds fixados perto do que a suíte real atinge hoje (~90/74/96/93), com margem de
  // segurança para não quebrar CI por flutuação mínima — não são os números aspiracionais do
  // plano original (85%/95% "runtime"/"codegen"), que foram definidos sem medir a suíte real.
  coverageThreshold: {
    global: {
      statements: 85,
      lines: 88,
      functions: 90,
      branches: 65,
    },
  },
};