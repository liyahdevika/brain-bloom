import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { BloomBuddyChat } from "@/components/bloombuddy/BloomBuddyChat";
import { BloomBuddyControls } from "@/components/bloombuddy/BloomBuddyControls";
import type { BloomBuddyPreferences } from "@/lib/ai/types";
export const Route = createFileRoute("/tutor")({
  validateSearch: (search: Record<string, unknown>) => ({
    materialId: typeof search["materialId"] === "string" ? search["materialId"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "BloomBuddy AI — BrainBloom" },
      {
        name: "description",
        content:
          "Your friendly AI study assistant. Ask questions, receive step-by-step guidance, and chat directly with your uploaded course materials.",
      },
      { property: "og:title", content: "BloomBuddy AI — BrainBloom" },
      {
        property: "og:description",
        content:
          "Friendly AI study companion for students. Practice problems, get hints, and chat with your uploaded notes.",
      },
    ],
  }),
  component: BloomBuddyPage,
});

function BloomBuddyPage() {
  const search = Route.useSearch();

  const [preferences, setPreferences] = useState<BloomBuddyPreferences>({
    language: "en",
    explanationLevel: "beginner",
    answerStyle: "hints_first",
    thinkFirstMode: true,
    activeMaterialId: search.materialId || null,
  });

  useEffect(() => {
    if (search.materialId) {
      setPreferences((prev) => ({
        ...prev,
        activeMaterialId: search.materialId || null,
      }));
    }
  }, [search.materialId]);

  const handlePreferencesChange = (patch: Partial<BloomBuddyPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...patch }));
  };

  return (
    <AppShell
      title="BloomBuddy AI"
      subtitle="Your supportive study companion. Ask follow-up questions, get hints before full answers, or discuss your uploaded notes."
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        {/* Main Chat Interface */}
        <BloomBuddyChat preferences={preferences} />

        {/* Sidebar Controls: Material Context, Language, Level, Teaching Style */}
        <div className="space-y-4">
          <BloomBuddyControls preferences={preferences} onChange={handlePreferencesChange} />
        </div>
      </div>
    </AppShell>
  );
}
