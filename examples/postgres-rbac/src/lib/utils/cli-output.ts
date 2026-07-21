import pc from "picocolors";
import * as path from "path";

/**
 * Camada de apresentação compartilhada pelos CLIs (extractor/codegen/validator/migrate/init).
 * `picocolors` já respeita `NO_COLOR`/`FORCE_COLOR` e detecção de TTY nativamente — em CI ou
 * quando a saída é redirecionada para um arquivo, degrada para texto plano sem exigir configuração.
 */
export const success = (msg: string): string => `${pc.green("[SUCCESS]")} ${msg}`;
export const error = (msg: string): string => `${pc.red("[ERROR]")} ${msg}`;
export const warn = (msg: string): string => `${pc.yellow("[WARNING]")} ${msg}`;
export const info = (msg: string): string => `${pc.blue("[INFO]")} ${msg}`;
export const fix = (msg: string): string => `  ${pc.cyan("[FIX SUGERIDO]")} ${msg}`;
export const dim = (msg: string): string => pc.dim(msg);
export const bold = (msg: string): string => pc.bold(msg);

const ESC = String.fromCharCode(27);

/**
 * Formata uma referência arquivo:linha[:coluna] como hyperlink de terminal (OSC 8), que editores
 * de terminal modernos (VS Code integrado, iTerm2, Windows Terminal) tornam clicável, abrindo o
 * arquivo direto na linha do problema. Degrada graciosamente para texto plano em terminais sem
 * suporte a cor/OSC 8 — o texto exibido nunca muda, só ganha (ou não) a camada de link.
 */
export function fileLink(filePath: string, line = 1, column = 1): string {
  const label = `${filePath}:${line}:${column}`;
  if (!pc.isColorSupported) return label;

  const absPath = path.isAbsolute(filePath) ? filePath : path.resolve(filePath);
  const uri = `file://${absPath.replace(/\\/g, "/")}`;
  const linkStart = ESC + "]8;;" + uri + ESC + "\\";
  const linkEnd = ESC + "]8;;" + ESC + "\\";
  return linkStart + label + linkEnd;
}

const QUOTED_TS_PATH = /'([^']+\.tsx?)'/g;

/**
 * Substitui caminhos de arquivo `.ts`/`.tsx` entre aspas simples, já presentes em mensagens de
 * erro existentes (drift/referência órfã), por hyperlinks de terminal clicáveis — sem exigir que
 * cada mensagem seja reescrita para gerar o link explicitamente.
 */
export function linkifyPaths(message: string): string {
  return message.replace(QUOTED_TS_PATH, (_match, filePath) => `'${fileLink(filePath)}'`);
}
