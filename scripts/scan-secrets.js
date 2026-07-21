#!/usr/bin/env node
/**
 * Scanner leve de segredos. Não depende de binários externos.
 * Dois modos:
 *   - padrão (pre-commit local): varre o diff staged do commit em andamento.
 *   - `--all` (CI / auditoria manual): varre todo o conteúdo versionado do checkout atual —
 *     necessário em CI porque não há "staged diff" num checkout limpo de PR/branch.
 */
const { execSync } = require("child_process");

// Palavras comuns de placeholder em exemplos de connection string — uma credencial real não seria
// literalmente a palavra "senha"/"password". Evita falso positivo em documentação/exemplos sem
// precisar allowlistar cada arquivo de doc individualmente.
const PLACEHOLDER_WORDS = new Set([
  "user", "usuario", "username", "youruser",
  "pass", "senha", "password", "yourpassword", "changeme"
]);

const SECRET_PATTERNS = [
  { name: "GitHub Token", regex: /gh[pousr]_[A-Za-z0-9]{20,}/g },
  { name: "GitHub Fine-Grained Token", regex: /github_pat_[A-Za-z0-9_]{20,}/g },
  { name: "AWS Access Key", regex: /AKIA[0-9A-Z]{16}/g },
  { name: "Slack Token", regex: /xox[baprs]-[A-Za-z0-9-]{10,}/g },
  { name: "Private Key Block", regex: /-----BEGIN\s?(RSA|EC|OPENSSH|DSA|PGP)?\s?PRIVATE KEY-----/g },
  {
    name: "Generic Connection String With Credentials",
    regex: /(postgres|postgresql|mysql|mongodb(\+srv)?):\/\/([^:\s'"]+):([^@\s'"]+)@/g,
    isPlaceholder: (match) => {
      const [, , , user, pass] = match;
      return PLACEHOLDER_WORDS.has(user.toLowerCase()) && PLACEHOLDER_WORDS.has(pass.toLowerCase());
    }
  },
  { name: "Cloudflare API Token (assignment)", regex: /CLOUDFLARE_API_TOKEN\s*=\s*['"]?[A-Za-z0-9_-]{20,}/g },
  { name: "Generic High-Entropy Secret Assignment", regex: /\b(SECRET|TOKEN|API_KEY|APIKEY|ACCESS_KEY|PASSWORD)\s*[:=]\s*['"][A-Za-z0-9_\-/+=]{16,}['"]/gi },
  { name: "Slack Webhook URL", regex: /https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/]{20,}/g },
  {
    name: "Generic Bearer/API key in header assignment",
    regex: /Authorization['"]?\s*[:=]\s*['"]Bearer\s+([A-Za-z0-9._<>-]{10,})['"]/g,
    isPlaceholder: (match) => /^[<].+[>]$/.test(match[1]) || /\.\.\.$/.test(match[1])
  }
];

// Nomes de arquivo (path completo OU só o basename) sempre isentos — documentação/config cujo
// propósito é justamente conter exemplos.
const ALLOWLIST_FILES = new Set(["scripts/scan-secrets.js", ".gitignore"]);
const ALLOWLIST_BASENAMES = new Set([".env.example"]);

function isAllowlisted(file) {
  if (ALLOWLIST_FILES.has(file)) return true;
  const basename = file.split("/").pop();
  return ALLOWLIST_BASENAMES.has(basename);
}

function getFileList(mode) {
  const cmd = mode === "all" ? "git ls-files" : "git diff --cached --name-only --diff-filter=ACM";
  const out = execSync(cmd, { encoding: "utf-8" });
  return out.split("\n").map((f) => f.trim()).filter(Boolean);
}

function getFileContent(file, mode) {
  try {
    if (mode === "all") {
      const fs = require("fs");
      return fs.readFileSync(file, "utf-8");
    }
    return execSync(`git show :"${file}"`, { encoding: "utf-8" });
  } catch {
    return "";
  }
}

function main() {
  const mode = process.argv.includes("--all") ? "all" : "staged";
  const files = getFileList(mode);
  let findings = [];

  for (const file of files) {
    if (isAllowlisted(file)) continue;
    if (file === ".env" || file.endsWith(".db") || file.endsWith(".sqlite")) {
      findings.push({ file, name: "Arquivo sensível versionado", match: file });
      continue;
    }

    const content = getFileContent(file, mode);
    if (!content) continue;

    for (const pattern of SECRET_PATTERNS) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match;
      while ((match = regex.exec(content)) !== null) {
        if (pattern.isPlaceholder && pattern.isPlaceholder(match)) continue;
        findings.push({ file, name: pattern.name, match: match[0].slice(0, 12) + "…" });
      }
    }
  }

  if (findings.length > 0) {
    console.error(`\n[FAIL-FAST] Possíveis segredos detectados (modo: ${mode}):\n`);
    findings.forEach((f) => console.error(`  - ${f.file}: ${f.name} (${f.match})`));
    console.error("\nRemova o segredo do arquivo (ou adicione a variável a um .env não versionado) antes de commitar.");
    console.error("Se for um falso positivo legítimo, adicione o arquivo à ALLOWLIST_FILES em scripts/scan-secrets.js.\n");
    process.exit(1);
  }

  console.log(`[OK] Nenhum segredo óbvio encontrado (modo: ${mode}).`);
  process.exit(0);
}

main();
