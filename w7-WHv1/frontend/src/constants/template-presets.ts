import type { BinStructureTemplate } from "@/types";

/**
 * Predefined bin structure templates for common warehouse configurations.
 *
 * Each template defines:
 * - fields: Array of field definitions with name, label, required, and order
 * - code_format: Format string with placeholders like {fieldName}
 * - separator: Character(s) used to separate field values
 * - auto_uppercase: Whether to convert values to uppercase
 * - zero_padding: Whether to pad numeric values with zeros
 */
export const TEMPLATE_PRESETS: Record<string, BinStructureTemplate> = {
  standardPallet: {
    fields: [
      { name: "aisle", label: "Sor", required: true, order: 1 },
      { name: "rack", label: "Állvány", required: true, order: 2 },
      { name: "level", label: "Szint", required: true, order: 3 },
      { name: "position", label: "Pozíció", required: true, order: 4 },
    ],
    code_format: "{aisle}-{rack}-{level}-{position}",
    separator: "-",
    auto_uppercase: true,
    zero_padding: true,
  },

  simplified: {
    fields: [
      { name: "aisle", label: "Sor", required: true, order: 1 },
      { name: "level", label: "Szint", required: true, order: 2 },
      { name: "position", label: "Pozíció", required: true, order: 3 },
    ],
    code_format: "{aisle}-{level}-{position}",
    separator: "-",
    auto_uppercase: true,
    zero_padding: true,
  },

  floorStorage: {
    fields: [
      { name: "zone", label: "Zóna", required: true, order: 1 },
      { name: "position", label: "Pozíció", required: true, order: 2 },
    ],
    code_format: "{zone}-{position}",
    separator: "-",
    auto_uppercase: true,
    zero_padding: true,
  },

  freezer: {
    fields: [
      { name: "zone", label: "Zóna", required: true, order: 1 },
      { name: "temp", label: "Hőmérséklet", required: true, order: 2 },
      { name: "aisle", label: "Sor", required: true, order: 3 },
      { name: "position", label: "Pozíció", required: true, order: 4 },
    ],
    code_format: "{zone}-{temp}-{aisle}-{position}",
    separator: "-",
    auto_uppercase: true,
    zero_padding: true,
  },
};

/**
 * Metadata for displaying preset templates in the UI.
 */
export const PRESET_METADATA = {
  standardPallet: {
    name: "Szabványos raklap rendszer",
    description: "Sor-Állvány-Szint-Pozíció (pl. A-03-02-01)",
    icon: "📦",
    sampleCode: "A-03-02-01",
  },
  simplified: {
    name: "Egyszerűsített",
    description: "Sor-Szint-Pozíció (pl. A-02-01)",
    icon: "📋",
    sampleCode: "A-02-01",
  },
  floorStorage: {
    name: "Padlótárolás",
    description: "Zóna-Pozíció (pl. FRISS-12)",
    icon: "🏢",
    sampleCode: "FRISS-12",
  },
  freezer: {
    name: "Hűtőházi tárolás",
    description: "Zóna-Hőmérséklet-Sor-Pozíció (pl. F1-M18-A-05)",
    icon: "❄️",
    sampleCode: "F1-M18-A-05",
  },
};
