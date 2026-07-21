export interface AuditEntry {
  action: "create" | "update" | "delete" | "read";
  table: string;
  recordId?: string | number | null;
  userId?: string | null;
  userRole?: string | null;
  timestamp?: string;
}

/**
 * Log estruturado (JSON, uma linha por evento) de acesso a dados sensíveis.
 * Emitido em stdout para ser coletado por qualquer agregador de logs (ex.: CloudWatch,
 * Datadog, Loki) sem exigir infraestrutura adicional deste motor.
 */
export function logAudit(entry: AuditEntry): void {
  const record = {
    type: "AUDIT",
    timestamp: entry.timestamp || new Date().toISOString(),
    action: entry.action,
    table: entry.table,
    recordId: entry.recordId ?? null,
    userId: entry.userId ?? null,
    userRole: entry.userRole ?? null
  };
  console.log(JSON.stringify(record));
}
