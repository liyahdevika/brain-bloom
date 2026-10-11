import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Plant } from "@/components/Plant";
import { btn } from "@/components/AppShell";
import { Timer, Brain, Sprout } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BrainBloom — Grow Your Mind, One Focus at a Time" },
      {
        name: "description",
        content:
          "Focus sessions, reflections and goals that help students build habits and independent thinking.",
      },
      { property: "og:title", content: "BrainBloom — Grow Your Mind" },
      {
        property: "og:description",
        content: "Focus sessions, reflections and goals that help students think independently.",
      },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  return (
    <div className="min-h-screen bg-hero">
      <div className="mx-auto flex max-w-5xl flex-col px-5 py-6">
        <Logo />
        <section className="grid items-center gap-10 py-14 md:grid-cols-2 md:py-24">
          <div className="animate-rise">
            <p className="text-sm font-bold uppercase tracking-widest text-accent-foreground">
              The Future of Human Intelligence
            </p>
            <h1 className="mt-3 text-5xl font-semibold leading-tight text-sage-deep md:text-6xl">
              Grow your mind, one focus at a time.
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              BrainBloom helps you shut out distractions, build steady study habits, and practise
              explaining ideas in your own words.
            </p>
            <Link to="/dashboard" className={`${btn.primary} mt-8`}>
              Get Started
            </Link>
          </div>
          <div className="flex justify-center">
            <div className="rounded-full bg-card/70 p-10 shadow-xl">
              <Plant stage={5} className="h-64 w-64" />
            </div>
          </div>
        </section>
        <section className="grid gap-4 pb-12 sm:grid-cols-3">
          {[
            { i: Timer, t: "Focus", d: "Timed sessions with a distraction check-in." },
            { i: Brain, t: "ThinkBack", d: "Explain what you learned — no notes." },
            { i: Sprout, t: "Grow", d: "Goals bloom into plants and badges." },
          ].map(({ i: I, t, d }) => (
            <div key={t} className="card-soft p-5">
              <I className="h-6 w-6 text-primary" />
              <h3 className="mt-2 text-lg font-semibold">{t}</h3>
              <p className="text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
