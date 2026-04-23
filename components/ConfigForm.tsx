"use client";

import { useConfig } from "@/lib/config";
import { isValidAccountId } from "@/lib/format";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-widest text-ink-muted">{children}</div>;
}

function Input(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  mono?: boolean;
  inputMode?: "decimal";
}) {
  return (
    <input
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      placeholder={props.placeholder}
      inputMode={props.inputMode}
      spellCheck={false}
      className={[
        "w-full bg-paper-card border px-2 py-1.5 text-sm outline-none focus:border-ink",
        props.mono !== false ? "font-mono" : "",
        props.invalid ? "border-bad" : "border-paper-rule",
      ].join(" ")}
    />
  );
}

export function ConfigForm() {
  const [config, setConfig] = useConfig();
  const daoInvalid = config.daoId !== "" && !isValidAccountId(config.daoId);
  const poolInvalid = config.poolId !== "" && !isValidAccountId(config.poolId);
  const destInvalid = config.destinationId !== "" && !isValidAccountId(config.destinationId);
  const amountInvalid =
    config.amountNear !== "" && !/^\d+(\.\d+)?$/.test(config.amountNear);

  return (
    <section className="border border-paper-rule bg-paper-card">
      <header className="flex items-baseline justify-between px-4 py-2.5 border-b border-paper-rule">
        <h2 className="font-mono text-xs uppercase tracking-widest">§1 configuration</h2>
        <span className="font-mono text-[10px] text-ink-muted">persisted to localStorage</span>
      </header>
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <FieldLabel>DAO account</FieldLabel>
          <Input
            value={config.daoId}
            onChange={(v) => setConfig({ daoId: v.trim() })}
            placeholder="example-dao.sputnik-dao.near"
            invalid={daoInvalid}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>Staking pool</FieldLabel>
          <Input
            value={config.poolId}
            onChange={(v) => setConfig({ poolId: v.trim() })}
            placeholder="validator.poolv1.near"
            invalid={poolInvalid}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>Destination (for Transfer step)</FieldLabel>
          <Input
            value={config.destinationId}
            onChange={(v) => setConfig({ destinationId: v.trim() })}
            placeholder="treasury.near"
            invalid={destInvalid}
          />
        </div>
        <div className="space-y-1">
          <FieldLabel>Amount (NEAR)</FieldLabel>
          <Input
            value={config.amountNear}
            onChange={(v) => setConfig({ amountNear: v.trim() })}
            placeholder="10"
            invalid={amountInvalid}
            inputMode="decimal"
          />
        </div>
      </div>
    </section>
  );
}
