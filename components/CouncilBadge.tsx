"use client";

import type { Role } from "@/lib/dao";

export function CouncilBadge({
  role,
  accountId,
  loading,
}: {
  role: Role | null;
  accountId: string | null;
  loading: boolean;
}) {
  if (!accountId) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border border-paper-rule text-ink-muted">
        not connected
      </span>
    );
  }
  if (loading) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border border-paper-rule text-ink-muted">
        checking policy…
      </span>
    );
  }
  if (!role) {
    return (
      <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border border-warn/50 text-warn">
        not a council member — read-only
      </span>
    );
  }
  return (
    <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-1 border border-ok/50 text-ok">
      role: {role.name}
    </span>
  );
}
