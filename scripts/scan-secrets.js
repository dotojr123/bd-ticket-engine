#!/usr/bin/env node
/**
 * Scanner leve de segredos para pre-commit. Não depende de binários externos.
 * Varre o diff staged do git atrás de padrões conhecidos de credenciais.
 */
const { execSync } = require("child_process");

const SECRET_PATTERNS = [
  { name: "GitHub Token", regex: /gh[pousr]_[A-Za-z0-9]{20,}/g },
  { name: "GitHub Fine-Grained Token", regex: /github_pat_[A-Za-z0-9_]{20,}/g },
  { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/g },
  { name: "Slack Token", regex: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { name: "Private Key Block", regex: /-----BEGIN\s?(RSA|EC|OPENSSH|DSA|PGP)?\s?PRIVATE KEY-----/g },
  { name: "Generic Connection String With Credentials", regex: /(postgres|postgresql|mysql|mongodb(\+srv)?):\/\/[^:\s'"]+:[^@\s'"]+@/g },
  { name: "Cloudflare API Token (assignment)", regex: /CLOUDFLARE_API_TOKEN\s*=\s*['"]?[A-Za-z0-9_-]{20,}/g },
  { name: "Generic High-Entropy Secret Assignment", regex: /\b(SECRET|TOKEN|API_KEY|APIKEY|ACCESS_KEY|PASSWORD)\s*[:=]\s*['"][A-Za-z0-9_\-/+=]{16,}['"]/gi },
];

const ALLOWLIST_FILES = new Set([
  "scripts/scan-secrets.js",
  ".gitignore",
  ".env.example",
  "_reversa_sdd/production_readiness_checklist.md",
]);

function getStagedFiles() {
  const out = execSync("git diff --cached --name-only --diff-filter=ACM", { encoding: "utf-8" });
  return out.split("\n").map((f) => f.trim()).filter(Boolean);
}

function getStagedContent(file) {
  try {
    return execSync(`git show :"${file}"`, { encoding: "utf-8" });
  } catch {
    return "";
  }
}

function main() {
  const files = getStagedFiles();
  let findings = [];

  for (const file of files) {
    if (ALLOWLIST_FILES.has(file)) continue;
    if (file === ".env" || file.endsWith(".db") || file.endsWith(".sqlite")) {
      findings.push({ file, name: "Arquivo sensível sendo commitado", match: file });
      continue;
    }

    const content = getStagedContent(file);
    if (!content) continue;

    for (const pattern of SECRET_PATTERNS) {
      const matches = content.match(pattern.regex);
      if (matches) {
        matches.forEach((m) => findings.push({ file, name: pattern.name, match: m.slice(0, 12) + "…" }));
      }
    }
  }

  if (findings.length > 0) {
    console.error("\n[FAIL-FAST] Possíveis segredos detectados no commit:\n");
    findings.forEach((f) => console.error(`  - ${f.file}: ${f.name} (${f.match})`));
    console.error("\nRemova o segredo do arquivo (ou adicione a variável a um .env não versionado) antes de commitar.");
    console.error("Se for um falso positivo legítimo, adicione o arquivo à ALLOWLIST_FILES em scripts/scan-secrets.js.\n");
    process.exit(1);
  }

  console.log("[OK] Nenhum segredo óbvio encontrado no commit.");
  process.exit(0);
}

main();
