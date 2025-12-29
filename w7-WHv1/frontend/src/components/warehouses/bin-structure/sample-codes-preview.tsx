import { useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { generateSampleBinCodes } from "@/lib/bin-template-utils";
import type { BinStructureTemplate } from "@/types";

interface SampleCodesPreviewProps {
  template: BinStructureTemplate;
  maxSamples?: number;
}

/**
 * Live preview of generated bin codes based on template.
 *
 * Features:
 * - Real-time sample generation
 * - Table display with field breakdowns
 * - Memoized for performance
 * - Shows field values for each code
 */
export function SampleCodesPreview({
  template,
  maxSamples = 10,
}: SampleCodesPreviewProps) {
  const samples = useMemo(() => {
    try {
      return generateSampleBinCodes(template, maxSamples);
    } catch (error) {
      console.error("Error generating samples:", error);
      return [];
    }
  }, [template, maxSamples]);

  if (samples.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nem sikerült példa kódokat generálni
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Példa Kódok</h4>
        <Badge variant="secondary">{samples.length} minta</Badge>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-medium">Generált Kód</TableHead>
              {template.fields.map((field) => (
                <TableHead key={field.name} className="font-medium">
                  {field.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {samples.map((sample, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-mono font-semibold">
                  {sample.code}
                </TableCell>
                {template.fields.map((field) => (
                  <TableCell key={field.name} className="font-mono text-sm">
                    {sample.fields[field.name]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
