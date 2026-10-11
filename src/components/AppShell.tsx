import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  LayoutDashboard,
  Timer,
  Sprout,
  Brain,
  Trophy,
  BarChart3,
  MessageCircle,
  Layers,
  ListChecks,
  Library,
  FileUp,
} from "lucide-react";
import { Logo } from "./Logo";
import { useStore } from "@/lib/store";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/import", label: "Smart Import", icon: FileUp },
  { to: "/tutor", label: "BloomBuddy AI", icon: MessageCircle },
  { to: "/flashcards", label: "Flashcards", icon: Layers },
  { to: "/quizzes", label: "Quizzes", icon: ListChecks },
  { to: "/library", label: "Study Library", icon: Library },
  { to: "/thinkback", label: "ThinkBack", icon: Brain },
  { to: "/progress", label: "Progress", icon: BarChart3 },
  { to: "/focus", label: "Focus Zone", icon: Timer },
  { to: "/goals", label: "Goal Garden", icon: Sprout },
  { to: "/rewards", label: "Rewards", icon: Trophy },
] as const;

function SampleBanner() {
  const { isSample, startFresh } = useStore();
  if (!isSample) return null;
  return (
    <div className="mb-5 flex flex-col gap-2 rounded-2xl border border-lavender bg-accent px-4 py-3 text-sm text-accent-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>
        <strong>Sample data preview.</strong> These goals and sessions are examples. Your own
        entries are saved only in this browser.
      </span>
      <button
        onClick={startFresh}
        className="shrink-0 rounded-full bg-accent-foreground px-4 py-1.5 font-semibold text-primary-foreground"
      >
        Start fresh
      </button>
    </div>
  );
}

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-cream p-5 md:flex">
        <Link to="/">
          <Logo />
        </Link>
        <nav className="mt-6 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-xl px-3 py-2 font-semibold text-muted-foreground transition hover:bg-secondary"
              activeProps={{ className: "bg-secondary text-sage-deep" }}
            >
              <Icon className="h-5 w-5" /> {label}
            </Link>
          ))}
        </nav>
        <p className="mt-auto text-xs text-muted-foreground">
          Grow your mind, one focus at a time.
        </p>
      </aside>

      <header className="flex items-center justify-between border-b bg-cream px-4 py-3 md:hidden">
        <Link to="/">
          <Logo />
        </Link>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-6 md:px-8 md:pb-10">
        <SampleBanner />
        <div className="mb-6 animate-rise">
          <h1 className="text-3xl font-semibold text-sage-deep md:text-4xl">{title}</h1>
          {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
        </div>
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex overflow-x-auto border-t bg-card md:hidden">
        {NAV.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex min-w-[4.5rem] shrink-0 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate">
              {label.replace("Study ", "").replace(" Zone", "").replace("Goal ", "")}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card-soft p-5 animate-rise ${className}`}>{children}</div>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Card>
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold text-sage-deep">{value}</p>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export const btn = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-full bg-sage-gradient px-6 py-3 font-bold text-primary-foreground shadow-md transition hover:opacity-90 disabled:opacity-50",
  soft: "inline-flex items-center justify-center gap-2 rounded-full bg-secondary px-5 py-2.5 font-bold text-secondary-foreground transition hover:bg-primary/20 disabled:opacity-50",
  lav: "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 font-bold text-accent-foreground transition hover:bg-lavender/50",
};
