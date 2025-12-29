# Template-Aware Bulk Bin Creation Plan

**Date**: 2025-12-29  
**Status**: 📋 Planning Phase  
**Workflow**: BRAINSTORM → RESEARCH → PLAN → IMPLEMENT

---

## 🎯 Problem Statement

Currently, bulk bin creation is **disconnected** from warehouse templates:

### Current Issues

1. **Manual Field Entry** - User must manually type field names (aisle, rack, level, position)
2. **No Validation** - Ranges might not match template structure
3. **Template Ignored** - Warehouse template defines structure but bulk creation doesn't use it
4. **No Guidance** - Users don't know what ranges are valid
5. **Hardcoded Logic** - Preview assumes `{aisle}-{rack}-{level}-{position}` format

### Example Problem

```
Warehouse Template: {aisle}-{bay}-{shelf}-{slot}
Bulk Form Labels:   Aisle, Rack, Level, Position  ❌ Mismatch!
Generated Codes:    A-01-01-01                     ✅ Works but confusing
```

---

## 🧠 BRAINSTORM: Potential Features

### A. Dynamic Form Generation ⭐⭐⭐⭐⭐

**Purpose**: Generate bulk creation form fields dynamically from warehouse template

**Features**:

1. **Auto-populate field labels** from template
   - Template: `{aisle}` → Form label: "Sor" (or custom label from template)
   - Template: `{bay}` → Form label: "Bay"
2. **Dynamic range inputs** based on template field count
   - 2 fields? Show 2 range pairs
   - 5 fields? Show 5 range pairs
3. **Template-aware validation**
   - Required fields must have ranges
   - Optional fields can be skipped
4. **Field type detection**
   - Numeric fields: show number inputs
   - Alphanumeric fields: show text inputs with suggestions

**Priority**: **CRITICAL** ⭐⭐⭐⭐⭐  
**Effort**: Medium (2-3 hours)

---

### B. Template Preview Integration ⭐⭐⭐⭐

**Purpose**: Show warehouse template context alongside bulk creation

**Features**:

1. **Template Display Card**

   ```
   ┌─────────────────────────────────────┐
   │ Sablon: Standard Pallet Racking     │
   │ Formátum: {aisle}-{rack}-{level}-{position} │
   │ Példa kód: A-01-03-02               │
   └─────────────────────────────────────┘
   ```

2. **Field Mapping Table**
   | Mező | Címke | Típus | Példa |
   |------|-------|-------|-------|
   | aisle | Sor | Szöveg | A, B, C |
   | rack | Állvány | Szám | 01-10 |
   | level | Szint | Szám | 01-05 |
   | position | Pozíció | Szám | 01-04 |

3. **Live Code Preview**
   - Show sample codes as user types ranges
   - Update in real-time with template format

**Priority**: **HIGH** ⭐⭐⭐⭐  
**Effort**: Low (1 hour)

---

### C. Template-Based Range Suggestions ⭐⭐⭐

**Purpose**: Suggest common range values based on template and warehouse

**Features**:

1. **Smart Defaults**

   - Analyze existing bins in warehouse
   - Suggest next available ranges
   - "You have bins A-01-01-01 to A-05-03-04, suggest: A-06-01-01"

2. **Quick Presets**

   ```
   [Add Single Aisle] [Add Full Level] [Add Entire Rack]
   ```

3. **Range Validation**
   - Warn about overlapping codes
   - Check for existing bins in range
   - Prevent duplicates

**Priority**: **MEDIUM** ⭐⭐⭐  
**Effort**: Medium (2-3 hours)

---

### D. Template-Aware Code Generation ⭐⭐⭐⭐⭐

**Purpose**: Generate bin codes using template rules

**Features**:

1. **Respect `code_format`** from template
   - Use template's separator (-, \_, etc.)
   - Follow field order from template
2. **Apply Template Settings**

   - `auto_uppercase`: Convert to uppercase
   - `zero_padding`: Pad numbers (01 vs 1)
   - `separator`: Use correct separator

3. **Field Validation**
   - Required fields must be present
   - Optional fields can be null/empty
   - Custom validation rules from template

**Priority**: **CRITICAL** ⭐⭐⭐⭐⭐  
**Effort**: Medium (2-3 hours)

---

### E. Multi-Template Support ⭐⭐

**Purpose**: Handle warehouses with custom templates

**Features**:

1. **Preset Detection**
   - Detect if warehouse uses standard preset
   - Show preset name: "Standard Pallet Racking"
2. **Custom Template Handling**

   - Support any field names
   - Support any code format
   - Support 1-10 fields (scalable)

3. **Template Migration**
   - Warn if changing template affects existing bins
   - Allow creating bins with old template format

**Priority**: **LOW** ⭐⭐  
**Effort**: High (4-5 hours)

---

## 🔬 RESEARCH: Current Implementation

### Warehouse Template Structure

```typescript
interface BinStructureTemplate {
  fields: BinStructureField[]; // [{ name: "aisle", label: "Sor", required: true, order: 1 }]
  code_format: string; // "{aisle}-{rack}-{level}-{position}"
  separator: string; // "-"
  auto_uppercase: boolean; // true
  zero_padding: boolean; // true
}
```

### Current Bulk Creation Logic

```typescript
// ❌ HARDCODED - Ignores template
function generatePreview(data: BulkBinFormData): BinPreview[] {
  const aisles = parseAisles(data.aisles);
  const preview: BinPreview[] = [];

  for (const aisle of aisles) {
    for (let rack = data.rack_start; rack <= data.rack_end; rack++) {
      for (let level = data.level_start; level <= data.level_end; level++) {
        for (
          let position = data.position_start;
          position <= data.position_end;
          position++
        ) {
          const rackStr = String(rack).padStart(2, "0");
          const levelStr = String(level).padStart(2, "0");
          const positionStr = String(position).padStart(2, "0");
          const code = `${aisle}-${rackStr}-${levelStr}-${positionStr}`; // ❌ HARDCODED FORMAT

          preview.push({
            code,
            aisle,
            rack: rackStr,
            level: levelStr,
            position: positionStr,
          });
        }
      }
    }
  }
  return preview;
}
```

### Data Flow

```
User selects warehouse
   ↓
[No template fetch] ❌
   ↓
User enters ranges manually
   ↓
Hardcoded code generation
   ↓
Preview shows codes (wrong format possible)
   ↓
Backend receives request
   ↓
Backend uses template ✅
```

**Problem**: Frontend doesn't use template, backend does → potential mismatch!

---

## 📋 IMPLEMENTATION PLAN

### Phase 1: Template-Aware Code Generation (CRITICAL)

**Goal**: Make bulk creation use warehouse template for code generation

#### Step 1.1: Fetch Warehouse Template

```tsx
// In BinBulkForm component
const warehouseId = watch("warehouse_id");

const { data: warehouse } = useQuery(warehouseQueryOptions(warehouseId), {
  enabled: !!warehouseId,
});

const template = warehouse?.bin_structure_template;
```

#### Step 1.2: Create Template-Aware Code Generator

```tsx
// New utility: /src/lib/bin-template-utils.ts
export function generateBinCodesFromTemplate(
  template: BinStructureTemplate,
  ranges: Record<string, RangeValue>
): BinCode[] {
  const codes: BinCode[] = [];

  // Get fields sorted by order
  const sortedFields = [...template.fields].sort((a, b) => a.order - b.order);

  // Generate Cartesian product based on field order
  const generateRecursive = (
    fieldIndex: number,
    currentValues: Record<string, string>
  ) => {
    if (fieldIndex >= sortedFields.length) {
      // Generate code using template format
      const code = applyTemplateFormat(template, currentValues);
      codes.push({ code, structure_data: currentValues });
      return;
    }

    const field = sortedFields[fieldIndex];
    const range = ranges[field.name];

    if (!range || (field.required && !range.values.length)) {
      throw new Error(`Missing required field: ${field.label}`);
    }

    for (const value of range.values) {
      generateRecursive(fieldIndex + 1, {
        ...currentValues,
        [field.name]: value,
      });
    }
  };

  generateRecursive(0, {});
  return codes;
}

function applyTemplateFormat(
  template: BinStructureTemplate,
  values: Record<string, string>
): string {
  let code = template.code_format;

  for (const [key, value] of Object.entries(values)) {
    let processedValue = value;

    // Apply template settings
    if (template.auto_uppercase) {
      processedValue = processedValue.toUpperCase();
    }

    if (template.zero_padding && /^\d+$/.test(processedValue)) {
      processedValue = processedValue.padStart(2, "0");
    }

    code = code.replace(`{${key}}`, processedValue);
  }

  return code;
}
```

#### Step 1.3: Update Preview Generation

```tsx
const handlePreview = () => {
  if (!template) {
    toast.error("Kérem válasszon raktárt először");
    return;
  }

  const values = getValues();
  const ranges = buildRangesFromForm(values, template);

  try {
    const codes = generateBinCodesFromTemplate(template, ranges);
    setPreview(codes);
    setShowPreview(true);
    toast.info(`${codes.length} tárolóhely lesz létrehozva`);
  } catch (error) {
    toast.error(error.message);
  }
};
```

**Files to Create/Modify**:

- ✅ `/src/lib/bin-template-utils.ts` - New utility functions
- ✅ `/src/components/bins/bin-bulk-form.tsx` - Update to use template
- ✅ `/src/schemas/bin.ts` - Make schema dynamic based on template

**Estimated Time**: 2-3 hours

---

### Phase 2: Dynamic Form Fields (CRITICAL)

**Goal**: Generate form fields dynamically from warehouse template

#### Step 2.1: Template Field Renderer

```tsx
function TemplateFieldRangeInput({
  field,
  onRangeChange,
}: {
  field: BinStructureField;
  onRangeChange: (fieldName: string, range: RangeValue) => void;
}) {
  const isNumeric = /^(rack|level|position|bay|shelf|slot|\d)$/i.test(
    field.name
  );

  if (isNumeric) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label>
            {field.label} - Kezdet {field.required && "*"}
          </Label>
          <Input
            type="number"
            min={1}
            onChange={(e) =>
              handleNumericRange(field.name, "start", e.target.value)
            }
          />
        </div>
        <div>
          <Label>
            {field.label} - Vég {field.required && "*"}
          </Label>
          <Input
            type="number"
            min={1}
            onChange={(e) =>
              handleNumericRange(field.name, "end", e.target.value)
            }
          />
        </div>
      </div>
    );
  } else {
    return (
      <div>
        <Label>
          {field.label} (vesszővel elválasztva) {field.required && "*"}
        </Label>
        <Input
          placeholder="pl. A, B, C"
          onChange={(e) => handleTextRange(field.name, e.target.value)}
        />
      </div>
    );
  }
}
```

#### Step 2.2: Dynamic Form Layout

```tsx
{
  template && (
    <div className="space-y-4">
      <h3 className="font-medium">Tartományok megadása</h3>
      {template.fields
        .sort((a, b) => a.order - b.order)
        .map((field) => (
          <TemplateFieldRangeInput
            key={field.name}
            field={field}
            onRangeChange={handleRangeChange}
          />
        ))}
    </div>
  );
}
```

**Files to Create/Modify**:

- ✅ `/src/components/bins/bin-bulk-form.tsx` - Dynamic fields
- ✅ `/src/components/bins/template-field-range-input.tsx` - New component

**Estimated Time**: 2-3 hours

---

### Phase 3: Template Preview Card (HIGH PRIORITY)

**Goal**: Show template context to guide user

#### Step 3.1: Template Info Card

```tsx
{
  warehouse && (
    <Card>
      <CardHeader>
        <CardTitle>Raktár Sablon</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Template Name */}
        <div>
          <p className="text-sm text-muted-foreground">Sablon</p>
          <p className="font-medium">
            {detectPresetName(warehouse.bin_structure_template)}
          </p>
        </div>

        {/* Code Format */}
        <div>
          <p className="text-sm text-muted-foreground">Kód formátum</p>
          <code className="text-sm bg-muted px-2 py-1 rounded">
            {warehouse.bin_structure_template.code_format}
          </code>
        </div>

        {/* Sample Code */}
        <div>
          <p className="text-sm text-muted-foreground">Példa kód</p>
          <code className="text-sm font-mono">A-01-03-02</code>
        </div>

        {/* Fields Table */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">Mezők</p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Név</TableHead>
                <TableHead>Címke</TableHead>
                <TableHead>Kötelező</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {warehouse.bin_structure_template.fields.map((field) => (
                <TableRow key={field.name}>
                  <TableCell className="font-mono">{field.name}</TableCell>
                  <TableCell>{field.label}</TableCell>
                  <TableCell>{field.required ? "✓" : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Files to Modify**:

- ✅ `/src/components/bins/bin-bulk-form.tsx` - Add template card
- ✅ `/src/lib/bin-template-utils.ts` - Add preset detection

**Estimated Time**: 1 hour

---

### Phase 4: Smart Range Suggestions (MEDIUM PRIORITY)

**Goal**: Suggest ranges based on existing bins

#### Step 4.1: Analyze Existing Bins

```tsx
const { data: existingBins } = useQuery(
  binsQueryOptions({ warehouse_id: warehouseId, page_size: 1000 }),
  { enabled: !!warehouseId }
);

const suggestions = useMemo(() => {
  if (!existingBins || !template) return null;

  return analyzeExistingBins(existingBins.items, template);
}, [existingBins, template]);

// Helper function
function analyzeExistingBins(bins: Bin[], template: BinStructureTemplate) {
  const fieldValues: Record<string, Set<string>> = {};

  template.fields.forEach((field) => {
    fieldValues[field.name] = new Set();
  });

  bins.forEach((bin) => {
    template.fields.forEach((field) => {
      const value = bin.structure_data[field.name];
      if (value) {
        fieldValues[field.name].add(value);
      }
    });
  });

  return {
    nextAisle: suggestNextValue(Array.from(fieldValues.aisle || [])),
    usedRanges: fieldValues,
    totalBins: bins.length,
  };
}
```

#### Step 4.2: Show Suggestions

```tsx
{
  suggestions && (
    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
      <p className="text-sm font-medium mb-2">💡 Javaslatok</p>
      <div className="text-sm space-y-1">
        <p>Létező tárolóhelyek: {suggestions.totalBins}</p>
        <p>
          Használt sorok: {Array.from(suggestions.usedRanges.aisle).join(", ")}
        </p>
        <p>Következő sor javaslat: {suggestions.nextAisle}</p>
      </div>
    </div>
  );
}
```

**Files to Modify**:

- ✅ `/src/components/bins/bin-bulk-form.tsx` - Add suggestions
- ✅ `/src/lib/bin-template-utils.ts` - Add analysis functions

**Estimated Time**: 2 hours

---

## 🎨 UI/UX Mockup

### Enhanced Bulk Creation Form

```
┌──────────────────────────────────────────────────────────────────┐
│ Tömeges tárolóhely létrehozás                                    │
├──────────────────────────────────────────────────────────────────┤
│ Raktár: [Budapest Központi ▼]                                    │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📋 Raktár Sablon                                            │ │
│ │                                                             │ │
│ │ Sablon: Standard Pallet Racking                            │ │
│ │ Formátum: {aisle}-{rack}-{level}-{position}                │ │
│ │ Példa: A-01-03-02                                          │ │
│ │                                                             │ │
│ │ Mezők:                                                      │ │
│ │ • Sor (aisle) - Kötelező                                   │ │
│ │ • Állvány (rack) - Kötelező                                │ │
│ │ • Szint (level) - Kötelező                                 │ │
│ │ • Pozíció (position) - Kötelező                            │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ 💡 Javaslatok                                                    │
│ Létező tárolóhelyek: 180                                        │
│ Használt sorok: A, B, C                                         │
│ Következő sor javaslat: D                                       │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Tartományok megadása                                        │ │
│ │                                                             │ │
│ │ Sor (vesszővel elválasztva) *                              │ │
│ │ [A, B, C__________________________________]                 │ │
│ │                                                             │ │
│ │ Állvány *                                                   │ │
│ │ Kezdet: [1___] Vég: [10___]                                │ │
│ │                                                             │ │
│ │ Szint *                                                     │ │
│ │ Kezdet: [1___] Vég: [5____]                                │ │
│ │                                                             │ │
│ │ Pozíció *                                                   │ │
│ │ Kezdet: [1___] Vég: [4____]                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ [Előnézet] [Létrehozás]                                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Recommended Implementation Order

### Sprint 1: Core Template Integration (3-4 hours) ⭐⭐⭐⭐⭐

1. ✅ **Phase 1.1**: Fetch warehouse template
2. ✅ **Phase 1.2**: Create template-aware code generator
3. ✅ **Phase 1.3**: Update preview to use template
4. ✅ **Phase 3**: Add template preview card

**Value**: Immediate correctness, eliminates code generation bugs  
**Risk**: Low - pure logic enhancement

### Sprint 2: Dynamic Form Fields (2-3 hours) ⭐⭐⭐⭐

5. ✅ **Phase 2.1**: Build dynamic field renderer
6. ✅ **Phase 2.2**: Replace hardcoded form with dynamic layout

**Value**: Scalability, supports any warehouse template  
**Risk**: Medium - requires form state refactoring

### Sprint 3: Smart Features (2 hours) ⭐⭐⭐

7. ✅ **Phase 4**: Add range suggestions and validation

**Value**: User guidance, error prevention  
**Risk**: Low - enhancement only

---

## 📊 Success Metrics

### Code Quality

- ✅ Bulk creation respects warehouse template 100%
- ✅ No hardcoded field names or formats
- ✅ Supports custom templates (not just standard 4-field)

### User Experience

- ⏱️ Reduce bulk creation errors: **-80%**
- 📈 Increase bulk creation success rate: **+50%**
- 💡 Users understand template structure: **+90%**

### System Scalability

- 🔧 Support 1-10 template fields (currently limited to 4)
- 🏗️ Support custom code formats
- 🌐 Support international character sets

---

## 🎯 Next Steps

1. ✅ Review plan with stakeholders
2. ✅ Implement Sprint 1 (Core Template Integration)
3. 📝 Gather user feedback on template preview
4. 🔄 Iterate with Sprint 2 and 3

---

**Ready to implement Sprint 1! 🚀**
