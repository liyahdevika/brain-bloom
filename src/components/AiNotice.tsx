import { PlugZap } from "lucide-react";

/** Shown wherever an AI feature would run. AI is not connected yet — nothing is generated. */
export function AiNotice({ feature }: { feature: string }) {
  return (
    <div
      role="status"
      className="flex gap-3 rounded-2xl border border-dashed border-lavender bg-accent p-4 text-sm text-accent-foreground"
    >
      <PlugZap className="h-5 w-5 shrink-0" />
      <p>
        <strong>AI not configured yet.</strong> {feature} needs an AI connection, which hasn't been
        set up. No answers are generated or faked — once AI is connected, this will work for real.
      </p>
    </div>
  );
}

export function DemoTag() {
  return (
    <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
      Demo
    </span>
  );
}
