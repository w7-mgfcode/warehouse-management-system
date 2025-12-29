import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";
import { TemplateFieldList } from "./template-field-list";
import { CodeFormatBuilder } from "./code-format-builder";
import { TemplateSettings } from "./template-settings";
import { TemplatePresetCard } from "./template-preset-card";
import { SampleCodesPreview } from "./sample-codes-preview";
import { TEMPLATE_PRESETS, PRESET_METADATA } from "@/constants/template-presets";
import { isTemplateEqualToPreset } from "@/lib/bin-template-utils";
import type { BinStructureTemplate } from "@/types";

interface BinStructureTemplateEditorProps {
  value: BinStructureTemplate;
  onChange: (value: BinStructureTemplate) => void;
}

/**
 * Main bin structure template editor component.
 *
 * Features:
 * - 4 predefined template presets
 * - Custom template creation with drag-and-drop fields
 * - Live code preview
 * - Code format builder
 * - Template settings (separator, uppercase, padding)
 * - JSON import/export
 */
export function BinStructureTemplateEditor({
  value,
  onChange,
}: BinStructureTemplateEditorProps) {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importJson, setImportJson] = useState("");

  const handlePresetSelect = (presetKey: string) => {
    const preset = TEMPLATE_PRESETS[presetKey];
    onChange(preset);
    toast.success(`${PRESET_METADATA[presetKey as keyof typeof PRESET_METADATA].name} sablon alkalmazva`);
  };

  const handleExportJson = () => {
    const json = JSON.stringify(value, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bin-structure-template.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Sablon exportálva");
  };

  const handleImportJson = () => {
    try {
      const template = JSON.parse(importJson) as BinStructureTemplate;

      // Basic validation
      if (!template.fields || !Array.isArray(template.fields)) {
        throw new Error("Érvénytelen sablon struktúra");
      }
      if (!template.code_format || typeof template.code_format !== "string") {
        throw new Error("Hiányzó vagy érvénytelen code_format");
      }

      onChange(template);
      toast.success("Sablon importálva");
      setShowImportDialog(false);
      setImportJson("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Érvénytelen JSON formátum");
    }
  };

  const handleFieldDelete = (index: number) => {
    const newFields = value.fields.filter((_, i) => i !== index);
    // Re-assign order values
    const reorderedFields = newFields.map((field, idx) => ({
      ...field,
      order: idx + 1,
    }));
    onChange({ ...value, fields: reorderedFields });
  };

  // Determine active preset
  const activePreset = Object.keys(TEMPLATE_PRESETS).find((key) =>
    isTemplateEqualToPreset(value, TEMPLATE_PRESETS[key])
  );

  return (
    <div className="space-y-6 w-full">
      {/* Predefined Templates */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Előre elkészített sablonok</CardTitle>
          <CardDescription>
            Válasszon egy előre elkészített sablont, vagy hozzon létre egyéni megoldást
          </CardDescription>
        </CardHeader>
        <CardContent className="w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 w-full">
            {Object.entries(PRESET_METADATA).map(([key, meta]) => (
              <TemplatePresetCard
                key={key}
                name={meta.name}
                description={meta.description}
                icon={meta.icon}
                sampleCode={meta.sampleCode}
                isActive={activePreset === key}
                onSelect={() => handlePresetSelect(key)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Template Editor */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Egyéni sablon szerkesztése</CardTitle>
              <CardDescription>
                Alakítsa ki a tárolóhely kódok struktúráját
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleExportJson}
                className="flex-shrink-0"
              >
                <Download className="h-4 w-4 mr-2" />
                JSON Exportálás
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setShowImportDialog(true)}
                className="flex-shrink-0"
              >
                <Upload className="h-4 w-4 mr-2" />
                JSON Importálás
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 w-full">
          {/* Field List with Drag-and-Drop */}
          <div>
            <h4 className="text-sm font-medium mb-3">Mezők</h4>
            <TemplateFieldList
              fields={value.fields}
              onChange={(fields) => onChange({ ...value, fields })}
              onEditField={() => {
                // TODO: Open edit dialog (for now, just show toast)
                toast.info("Mező szerkesztés még nem implementált");
              }}
              onDeleteField={handleFieldDelete}
            />
          </div>

          {/* Code Format Builder */}
          <div>
            <h4 className="text-sm font-medium mb-3">Kód formátum</h4>
            <CodeFormatBuilder
              format={value.code_format}
              fields={value.fields}
              onChange={(format) => onChange({ ...value, code_format: format })}
            />
          </div>

          {/* Settings */}
          <div>
            <h4 className="text-sm font-medium mb-3">Beállítások</h4>
            <TemplateSettings
              separator={value.separator}
              autoUppercase={value.auto_uppercase}
              zeroPadding={value.zero_padding}
              onChange={(settings) => onChange({ ...value, ...settings })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Élő előnézet</CardTitle>
          <CardDescription>
            Így fognak kinézni a generált tárolóhely kódok
          </CardDescription>
        </CardHeader>
        <CardContent className="w-full overflow-x-auto">
          <SampleCodesPreview template={value} maxSamples={8} />
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>JSON Importálás</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder="Illessze be a JSON sablont ide..."
              rows={15}
              className="font-mono text-sm"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowImportDialog(false)}
            >
              Mégse
            </Button>
            <Button type="button" onClick={handleImportJson}>
              Importálás
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
