/**
 * Log estruturado (JSON, uma linha por evento) para métricas de execução dos CLIs.
 * Mantido separado das mensagens [INFO]/[SUCCESS]/[ERROR] legíveis já existentes nos scripts
 * (voltadas para o operador humano no terminal) — este canal é voltado para agregadores de log
 * e dashboards de observabilidade, sem exigir infraestrutura adicional deste motor.
 */
export interface MetricEvent {
  [key: string]: unknown;
}

export function logMetric(event: string, data: MetricEvent = {}): void {
  console.log(JSON.stringify({ type: "METRIC", event, timestamp: new Date().toISOString(), ...data }));
}
