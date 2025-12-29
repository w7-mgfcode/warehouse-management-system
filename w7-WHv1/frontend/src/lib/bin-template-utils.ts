import type { BinStructureTemplate, BinStructureField } from "@/types";

/**
 * Sample bin code with field values
 */
interface SampleBinCode {
  code: string;
  fields: Record<string, string>;
}

/**
 * Validation result for code format
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Generate sample bin codes based on template configuration.
 *
 * Creates diverse examples using predefined sample data for common field names.
 * Applies template formatting rules (uppercase, zero padding).
 *
 * @param template - Bin structure template
 * @param count - Number of sample codes to generate
 * @returns Array of sample bin codes with field values
 */
export function generateSampleBinCodes(
  template: BinStructureTemplate,
  count: number = 10
): SampleBinCode[] {
  const samples: SampleBinCode[] = [];

  // Sample data for each field type (common field names in warehouses)
  const sampleData: Record<string, string[]> = {
    aisle: ["A", "B", "C", "D", "E"],
    rack: ["01", "02", "03", "04", "05"],
    level: ["01", "02", "03", "04", "05"],
    position: ["01", "02", "03", "04", "05"],
    zone: ["FRISS", "FAGYOS", "SZARAZ", "F1", "F2"],
    temp: ["M18", "M24", "M30", "P05", "P10"],
  };

  // Generate combinations
  for (let i = 0; i < count; i++) {
    const fieldValues: Record<string, string> = {};

    template.fields.forEach((field) => {
      // Get sample values for this field (or default to "X")
      const samples = sampleData[field.name] || ["X", "Y", "Z"];
      let value = samples[i % samples.length];

      // Apply formatting rules
      if (template.auto_uppercase) {
        value = value.toUpperCase();
      }

      // Apply zero padding to numeric strings
      if (template.zero_padding && /^\d+$/.test(value)) {
        value = value.padStart(2, "0");
      }

      fieldValues[field.name] = value;
    });

    // Generate code using format string
    const code = generateBinCode(template.code_format, fieldValues);

    samples.push({ code, fields: fieldValues });
  }

  return samples;
}

/**
 * Generate a single bin code from format string and field values.
 *
 * Replaces placeholders like {fieldName} with actual field values.
 *
 * @param codeFormat - Format string with placeholders
 * @param fieldValues - Field name to value mapping
 * @returns Generated bin code
 *
 * @example
 * generateBinCode("{aisle}-{rack}-{level}", { aisle: "A", rack: "03", level: "02" })
 * // Returns: "A-03-02"
 */
export function generateBinCode(
  codeFormat: string,
  fieldValues: Record<string, string>
): string {
  let code = codeFormat;

  // Replace each placeholder with its value
  Object.entries(fieldValues).forEach(([key, value]) => {
    code = code.replace(`{${key}}`, value);
  });

  return code;
}

/**
 * Validate that code format contains all field placeholders.
 *
 * Checks:
 * - Each field has a corresponding placeholder in the format
 * - Format contains at least one placeholder
 *
 * @param codeFormat - Format string to validate
 * @param fields - Array of field definitions
 * @returns Validation result with errors
 */
export function validateCodeFormat(
  codeFormat: string,
  fields: BinStructureField[]
): ValidationResult {
  const errors: string[] = [];

  // Check each field has a placeholder
  fields.forEach((field) => {
    if (!codeFormat.includes(`{${field.name}}`)) {
      errors.push(`A kód formátum nem tartalmazza a {${field.name}} helyőrzőt`);
    }
  });

  // Check format has at least one placeholder
  if (!/\{[^}]+\}/.test(codeFormat)) {
    errors.push("A kód formátumnak tartalmaznia kell legalább egy {mező} helyőrzőt");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Extract field names from code format string.
 *
 * Finds all placeholders like {fieldName} and returns the field names.
 *
 * @param codeFormat - Format string with placeholders
 * @returns Array of field names
 *
 * @example
 * extractFieldsFromFormat("{aisle}-{rack}-{level}")
 * // Returns: ["aisle", "rack", "level"]
 */
export function extractFieldsFromFormat(codeFormat: string): string[] {
  const matches = codeFormat.match(/\{([^}]+)\}/g);
  if (!matches) return [];

  return matches.map((m) => m.slice(1, -1));
}

/**
 * Check if template is equal to a preset template.
 *
 * Performs deep comparison of template structure.
 * Used to determine which preset is currently active.
 *
 * @param template - Template to check
 * @param preset - Preset template to compare against
 * @returns True if templates are equal
 */
export function isTemplateEqualToPreset(
  template: BinStructureTemplate,
  preset: BinStructureTemplate
): boolean {
  return JSON.stringify(template) === JSON.stringify(preset);
}
