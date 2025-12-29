# Sprint 4: Template-Aware Single Bin Creation/Edit

## Objective

Make the individual bin creation/edit form template-aware, matching the warehouse template structure dynamically.

## Implementation Plan

### Phase 1: Form Structure Changes

- [x] Fetch warehouse template when warehouse selected
- [ ] Replace hardcoded fields (aisle/rack/level/position) with dynamic template fields
- [ ] Add fieldValues state for structure_data
- [ ] Auto-generate bin code from template

### Phase 2: Field Rendering

- [ ] Render fields dynamically based on template.fields
- [ ] Support both text and numeric field types
- [ ] Show field labels and validation

### Phase 3: Code Generation

- [ ] Generate code preview as user types
- [ ] Use template code_format with placeholders
- [ ] Apply auto_uppercase and zero_padding

### Phase 4: API Integration

- [ ] Build structure_data object from fieldValues
- [ ] Submit to backend with proper format
- [ ] Handle edit mode with existing structure_data

## Files to Modify

- `w7-WHv1/frontend/src/components/bins/bin-form.tsx` - Main form component
- `w7-WHv1/frontend/src/schemas/bin.ts` - Schema (if needed)

## Current Status

Starting implementation...
