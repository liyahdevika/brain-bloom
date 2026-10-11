import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { UploadZone } from "@/components/import/UploadZone";
import { MaterialShelf } from "@/components/import/MaterialShelf";
import { LearningToolsSection } from "@/components/import/LearningToolsSection";
import { TextCorrectionModal } from "@/components/import/TextCorrectionModal";
import { useImport } from "@/lib/import-store";
import { importFromFile } from "@/lib/extractors";
import type { ImportedMaterial } from "@/lib/extractors/types";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Smart Import — BrainBloom" },
      {
        name: "description",
        content:
          "Import PDFs, PowerPoint presentations, photos, handwritten notes, YouTube videos or lecture notes to generate flashcards, quizzes, and revision guides.",
      },
      { property: "og:title", content: "Smart Import — BrainBloom" },
      {
        property: "og:description",
        content:
          "Convert PDFs, PPTs, photos, and YouTube videos into instant flashcards and quizzes.",
      },
    ],
  }),
  component: SmartImportPage,
});

function SmartImportPage() {
  const { materials, addMaterial, updateMaterial, removeMaterial } = useImport();
  const [selectedId, setSelectedId] = useState<string | null>(materials[0]?.id || null);
  const [inspectingMaterial, setInspectingMaterial] = useState<ImportedMaterial | null>(null);

  const activeMaterial = materials.find((m) => m.id === selectedId) || materials[0] || null;

  const handleMaterialImported = (material: ImportedMaterial) => {
    addMaterial(material);
    setSelectedId(material.id);
  };

  const handleReplaceFile = async (id: string, file: File) => {
    try {
      const updated = await importFromFile(file);
      updateMaterial(id, {
        title: updated.title,
        type: updated.type,
        sizeBytes: updated.sizeBytes,
        extractedText: updated.extractedText,
        originalText: updated.extractedText,
        previewUrl: updated.previewUrl,
        metadata: updated.metadata,
      });
    } catch (err: unknown) {
      console.error("Failed to replace file:", err);
    }
  };

  return (
    <AppShell
      title="BrainBloom Smart Import"
      subtitle="Transform PDFs, slides, whiteboard photos, YouTube lectures or pasted notes into interactive study kits."
    >
      <div className="space-y-6">
        {/* Upload Zone */}
        <UploadZone onMaterialImported={handleMaterialImported} />

        {/* Shelf of imported materials */}
        <MaterialShelf
          materials={materials}
          selectedId={selectedId}
          onSelect={(id) => setSelectedId(id)}
          onRemove={(id) => {
            removeMaterial(id);
            if (selectedId === id) {
              const remaining = materials.filter((m) => m.id !== id);
              setSelectedId(remaining[0]?.id || null);
            }
          }}
          onInspectText={(mat) => setInspectingMaterial(mat)}
          onReplaceFile={handleReplaceFile}
        />

        {/* Learning Tools Section for the selected material */}
        {activeMaterial && <LearningToolsSection material={activeMaterial} />}

        {/* Text Inspection & Correction Modal */}
        <TextCorrectionModal
          material={inspectingMaterial}
          isOpen={!!inspectingMaterial}
          onClose={() => setInspectingMaterial(null)}
          onSave={(id, updatedText, updatedTitle) => {
            updateMaterial(id, {
              extractedText: updatedText,
              title: updatedTitle,
              metadata: {
                ...inspectingMaterial?.metadata,
                wordCount: updatedText.split(/\s+/).filter(Boolean).length,
              },
            });
            setInspectingMaterial(null);
          }}
        />
      </div>
    </AppShell>
  );
}
