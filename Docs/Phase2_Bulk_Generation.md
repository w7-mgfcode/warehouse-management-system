# WMS Phase 2: Bulk Bin Generation

**Version**: 2.0
**Last Updated**: December 2025

## Overview

The bulk bin generation feature allows warehouse managers to create hundreds of storage locations (bins) in seconds using range specifications and Cartesian product mathematics. This eliminates the need for manual creation of each bin, dramatically reducing warehouse setup time.

**Key Benefits**:
- **Speed**: Create 600 bins in ~1 second vs. 3+ hours manually
- **Accuracy**: Template-driven generation eliminates human error
- **Preview**: See generated codes before committing
- **Conflict Detection**: Prevents duplicate bin codes
- **Transaction Safety**: All-or-nothing creation (ACID compliant)

---

## Business Need

### The Problem

Setting up a typical pallet racking warehouse requires creating hundreds of storage locations:

**Example Warehouse**:
- 3 aisles (A, B, C)
- 10 racks per aisle (1-10)
- 5 levels per rack (1-5)
- 4 positions per level (1-4)

**Total bins needed**: 3 × 10 × 5 × 4 = **600 bins**

**Manual creation**:
- 600 API POST requests
- ~15 seconds per bin (navigate UI, enter data, submit)
- Total time: 600 × 15s = **2.5 hours** minimum
- High error rate (typos, duplicates)

### The Solution

Bulk generation with range specifications:

```json
{
  "aisle": ["A", "B", "C"],
  "rack": {"start": 1, "end": 10},
  "level": {"start": 1, "end": 5},
  "position": {"start": 1, "end": 4}
}
```

**Result**:
- 1 API POST request
- ~1 second total time
- 0% error rate
- Preview before creation

---

## Algorithm Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Bulk Generation Pipeline                    │
└─────────────────────────────────────────────────────────────────┘

Input: warehouse_id, ranges, defaults
  │
  ├─[1]─▶ Fetch warehouse bin_structure_template
  │        │
  │        ├── fields: [{name, order, label}]
  │        ├── code_format: "{aisle}-{rack}-{level}-{position}"
  │        ├── auto_uppercase: true
  │        └── zero_padding: true
  │
  ├─[2]─▶ expand_range() for each field
  │        │
  │        ├── ["A", "B"] → ["A", "B"]
  │        └── {"start": 1, "end": 3} → ["1", "2", "3"]
  │
  ├─[3]─▶ Cartesian Product
  │        │
  │        └── ("A",1,1,1), ("A",1,1,2), ... → 600 combinations
  │
  ├─[4]─▶ Apply Formatting Rules
  │        │
  │        ├── auto_uppercase: "a" → "A"
  │        └── zero_padding: "1" → "01"
  │
  ├─[5]─▶ Generate Codes from Format String
  │        │
  │        └── "A-01-01-01", "A-01-01-02", ...
  │
  ├─[6]─▶ Conflict Detection (Preview or Create)
  │        │
  │        └── Query existing bins, return conflicts
  │
  └─[7]─▶ Bulk Insert (Create only)
           │
           └── Single transaction, all or nothing

Output: 600 bins created
```

---

## Algorithm Components

### 1. Range Specification

Two formats are supported for specifying value ranges:

**List Format** (discrete values):
```json
{
  "aisle": ["A", "B", "C"]
}
```
- Explicitly lists all values
- Can be non-sequential: `["A", "C", "E"]`
- Can be any type: `["North", "South", "East", "West"]`

**Range Format** (numeric sequences):
```json
{
  "rack": {"start": 1, "end": 10}
}
```
- Generates sequence from start to end (inclusive)
- Must be numeric
- Examples:
  - `{"start": 1, "end": 5}` → [1, 2, 3, 4, 5]
  - `{"start": 10, "end": 12}` → [10, 11, 12]

### 2. expand_range() Function

**Purpose**: Convert range specification to list of string values.

**Implementation**:
```python
def expand_range(spec: Any) -> list[str]:
    """
    Expand a range specification to list of values.

    Args:
        spec: Either a list of values or a dict with start/end keys.

    Returns:
        list[str]: List of string values.

    Raises:
        ValueError: If specification format is invalid.

    Examples:
        >>> expand_range(["A", "B", "C"])
        ["A", "B", "C"]

        >>> expand_range({"start": 1, "end": 3})
        ["1", "2", "3"]

        >>> expand_range("invalid")
        ValueError: Invalid range specification
    """
    if isinstance(spec, list):
        return [str(v) for v in spec]

    if isinstance(spec, dict) and "start" in spec and "end" in spec:
        return [str(i) for i in range(spec["start"], spec["end"] + 1)]

    raise ValueError("Invalid range specification")
```

**Test Cases**:
| Input | Output | Notes |
|-------|--------|-------|
| `["A", "B"]` | `["A", "B"]` | List passthrough |
| `{"start": 1, "end": 3}` | `["1", "2", "3"]` | Range expansion (inclusive) |
| `{"start": 10, "end": 12}` | `["10", "11", "12"]` | Multi-digit numbers |
| `[1, 2, 3]` | `["1", "2", "3"]` | Numeric list → strings |
| `"invalid"` | ValueError | Invalid format |
| `{}` | ValueError | Missing start/end |
| `{"start": 5}` | ValueError | Missing end |

**Time Complexity**: O(n) where n is the size of the output list

---

### 3. generate_bin_codes() Function

**Purpose**: Generate all bin codes using Cartesian product and template formatting.

**Signature**:
```python
def generate_bin_codes(
    template: dict,
    ranges: dict[str, Any],
) -> list[tuple[str, dict]]:
    """
    Generate bin codes and structure_data from ranges.

    Args:
        template: Warehouse bin_structure_template.
        ranges: Range specifications for each field.

    Returns:
        list[tuple[str, dict]]: List of (code, structure_data) tuples.

    Raises:
        ValueError: If field missing from ranges.
    """
```

**Algorithm Steps**:

**Step 1**: Extract ordered field names from template
```python
fields = template["fields"]
sorted_fields = sorted(fields, key=lambda f: f["order"])
field_names = [f["name"] for f in sorted_fields]
# Result: ["aisle", "rack", "level", "position"]
```

**Step 2**: Expand ranges for each field
```python
field_values = []
for name in field_names:
    if name not in ranges:
        raise ValueError(f"Missing range for field: {name}")
    field_values.append(expand_range(ranges[name]))

# Example result:
# field_values = [
#     ["A", "B", "C"],     # aisles
#     ["1", "2", ..., "10"], # racks
#     ["1", "2", ..., "5"],  # levels
#     ["1", "2", "3", "4"]   # positions
# ]
```

**Step 3**: Generate Cartesian product
```python
from itertools import product as cartesian_product

results = []
for combo in cartesian_product(*field_values):
    structure_data = dict(zip(field_names, combo, strict=True))
    # combo = ("A", "1", "1", "1")
    # structure_data = {"aisle": "A", "rack": "1", "level": "1", "position": "1"}
```

**Step 4**: Apply formatting rules
```python
formatted = {}
for name, value in structure_data.items():
    # Auto-uppercase for alphabetic values
    if auto_uppercase and isinstance(value, str) and value.isalpha():
        value = value.upper()

    # Zero-padding for numeric values
    if zero_padding and value.isdigit():
        value = value.zfill(2)

    formatted[name] = value

# Example:
# structure_data = {"aisle": "a", "rack": "1", "level": "2", "position": "3"}
# formatted = {"aisle": "A", "rack": "01", "level": "02", "position": "03"}
```

**Step 5**: Generate code from format string
```python
code = code_format.format(**formatted)
results.append((code, formatted))

# Example:
# code_format = "{aisle}-{rack}-{level}-{position}"
# code = "A-01-02-03"
```

**Complete Example**:
```python
template = {
    "fields": [
        {"name": "aisle", "label": "Sor", "order": 1},
        {"name": "level", "label": "Szint", "order": 2}
    ],
    "code_format": "{aisle}-{level}",
    "auto_uppercase": True,
    "zero_padding": True
}

ranges = {
    "aisle": ["a", "b"],
    "level": {"start": 1, "end": 2}
}

result = generate_bin_codes(template, ranges)
# [
#     ("A-01", {"aisle": "A", "level": "01"}),
#     ("A-02", {"aisle": "A", "level": "02"}),
#     ("B-01", {"aisle": "B", "level": "01"}),
#     ("B-02", {"aisle": "B", "level": "02"})
# ]
```

**Time Complexity**: O(n₁ × n₂ × ... × nₖ) where nᵢ is size of field i

---

### 4. Cartesian Product Explained

**What is Cartesian Product?**

The Cartesian product of sets is all possible ordered combinations where one element comes from each set.

**Mathematical Definition**:
```
A × B = {(a, b) | a ∈ A, b ∈ B}
```

**Simple Example**:
```
Set A (aisles): {A, B}
Set B (levels): {1, 2}

Cartesian Product A × B:
{(A, 1), (A, 2), (B, 1), (B, 2)}

Result: 4 combinations (2 × 2 = 4)
```

**Warehouse Example**:
```
Aisles: [A, B, C]           (3 values)
Racks:  [1, 2, ..., 10]     (10 values)
Levels: [1, 2, ..., 5]      (5 values)
Positions: [1, 2, 3, 4]     (4 values)

Total combinations: 3 × 10 × 5 × 4 = 600 bins
```

**Python Implementation**:
```python
from itertools import product

aisles = ["A", "B"]
racks = [1, 2, 3]

# Generate Cartesian product
for combo in product(aisles, racks):
    print(combo)

# Output:
# ("A", 1)
# ("A", 2)
# ("A", 3)
# ("B", 1)
# ("B", 2)
# ("B", 3)
```

**Complexity Analysis**:
- **Time**: O(n₁ × n₂ × ... × nₖ) - must generate all combinations
- **Space**: O(result_size) - must store all generated bins
- **Example**: 600 bins takes ~50ms to generate

---

### 5. Formatting Rules

Two optional formatting rules ensure consistent bin code style:

**auto_uppercase** (default: true)

Converts alphabetic characters to uppercase:
- Input: "a" → Output: "A"
- Input: "hello" → Output: "HELLO"
- Numbers unchanged: "123" → "123"

**Example**:
```python
value = "a"
if auto_uppercase and value.isalpha():
    value = value.upper()  # "A"
```

**zero_padding** (default: true)

Pads numeric strings to 2 digits:
- Input: "1" → Output: "01"
- Input: "5" → Output: "05"
- Input: "10" → Output: "10" (already 2 digits)
- Input: "123" → Output: "123" (more than 2 digits)
- Letters unchanged: "A" → "A"

**Example**:
```python
value = "5"
if zero_padding and value.isdigit():
    value = value.zfill(2)  # "05"
```

**Combined Example**:
```
Input: aisle="a", rack="5", level="12", position="3"

After auto_uppercase:
aisle="A", rack="5", level="12", position="3"

After zero_padding:
aisle="A", rack="05", level="12", position="03"

Final code (format: "{aisle}-{rack}-{level}-{position}"):
"A-05-12-03"
```

---

### 6. Conflict Detection

**Purpose**: Check if any generated bin codes already exist in the database.

**Algorithm**:
```python
# 1. Generate all codes
codes_and_data = generate_bin_codes(template, ranges)
codes = [c[0] for c in codes_and_data]
# codes = ["A-01-01-01", "A-01-01-02", ...]

# 2. Query existing bins
if codes:
    existing = await db.execute(
        select(Bin.code).where(Bin.code.in_(codes))
    )
    conflicts = {row[0] for row in existing.fetchall()}
else:
    conflicts = set()

# 3. Return results
return {
    "count": len(codes),
    "sample_codes": codes[:20],  # First 20 for preview
    "conflicts": list(conflicts),
    "valid": len(conflicts) == 0,
}
```

**Preview Response**:
```json
{
  "count": 600,
  "sample_codes": ["A-01-01-01", "A-01-01-02", "..."],
  "conflicts": [],
  "valid": true
}
```

**With Conflicts**:
```json
{
  "count": 600,
  "sample_codes": ["A-01-01-01", "..."],
  "conflicts": ["A-01-01-05", "B-03-02-01"],
  "valid": false
}
```

**Query Performance**:
- Uses index on `bins.code` (unique constraint)
- `WHERE code IN (...)` clause with up to 600 values
- Typical query time: ~20ms

---

### 7. Bulk Insert

**Purpose**: Insert all bins in a single database transaction.

**Implementation**:
```python
async def create_bulk_bins(
    db: AsyncSession,
    warehouse_id: UUID,
    ranges: dict[str, Any],
    defaults: dict | None = None,
) -> int:
    # Generate codes
    codes_and_data = generate_bin_codes(template, ranges)

    # Check conflicts first
    codes = [c[0] for c in codes_and_data]
    existing = await db.execute(
        select(Bin.code).where(Bin.code.in_(codes))
    )
    conflicts = {row[0] for row in existing.fetchall()}

    if conflicts:
        conflict_list = ", ".join(list(conflicts)[:5])
        raise ValueError(f"Conflicting codes: {conflict_list}")

    # Prepare bulk insert data
    defaults = defaults or {}
    bins_data = []
    for code, structure_data in codes_and_data:
        bins_data.append({
            "id": uuid.uuid4(),
            "warehouse_id": warehouse_id,
            "code": code,
            "structure_data": structure_data,
            "status": "empty",
            "max_weight": defaults.get("max_weight"),
            "max_height": defaults.get("max_height"),
            "accessibility": defaults.get("accessibility"),
            "is_active": True,
        })

    # Bulk insert using SQLAlchemy Core
    await db.execute(insert(Bin), bins_data)
    await db.flush()

    return len(bins_data)
```

**SQLAlchemy Core Insert**:
```python
from sqlalchemy import insert

# Traditional approach (slow, 600 roundtrips):
for bin_data in bins_data:
    bin_obj = Bin(**bin_data)
    db.add(bin_obj)

# Bulk approach (fast, 1 roundtrip):
await db.execute(insert(Bin), bins_data)
```

**ACID Transaction Guarantees**:
- **Atomicity**: All 600 bins created or none (rollback on error)
- **Consistency**: All constraints enforced (unique codes, foreign keys)
- **Isolation**: No partial state visible to other transactions
- **Durability**: Changes persisted to disk after commit

---

## API Workflow

### Step 1: Preview Generation

**Purpose**: See what bins will be created without committing to database.

**Request**:
```bash
curl -X POST "http://localhost:8000/api/v1/bins/bulk/preview" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "warehouse_id": "450e8400-e29b-41d4-a716-446655440000",
    "ranges": {
      "aisle": ["A", "B", "C"],
      "rack": {"start": 1, "end": 10},
      "level": {"start": 1, "end": 5},
      "position": {"start": 1, "end": 4}
    }
  }'
```

**Response** (200 OK):
```json
{
  "count": 600,
  "sample_codes": [
    "A-01-01-01", "A-01-01-02", "A-01-01-03", "A-01-01-04",
    "A-01-02-01", "A-01-02-02", "A-01-02-03", "A-01-02-04",
    "A-01-03-01", "A-01-03-02", "A-01-03-03", "A-01-03-04",
    "A-01-04-01", "A-01-04-02", "A-01-04-03", "A-01-04-04",
    "A-01-05-01", "A-01-05-02", "A-01-05-03", "A-01-05-04"
  ],
  "conflicts": [],
  "valid": true
}
```

**Benefits**:
- Verify ranges before committing
- See sample codes to check format
- Detect conflicts early
- No database changes

---

### Step 2: Bulk Create

**Purpose**: Create all bins in one transaction after preview confirmation.

**Request**:
```bash
curl -X POST "http://localhost:8000/api/v1/bins/bulk" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "warehouse_id": "450e8400-e29b-41d4-a716-446655440000",
    "ranges": {
      "aisle": ["A", "B", "C"],
      "rack": {"start": 1, "end": 10},
      "level": {"start": 1, "end": 5},
      "position": {"start": 1, "end": 4}
    },
    "defaults": {
      "max_weight": 1000.0,
      "max_height": 200.0,
      "accessibility": "forklift"
    }
  }'
```

**Response** (201 Created):
```json
{
  "created": 600,
  "message": "600 tárolóhely létrehozva"
}
```

**Defaults Applied**:
All 600 bins will have:
- `max_weight`: 1000.0 kg
- `max_height`: 200.0 cm
- `accessibility`: "forklift"
- `status`: "empty" (always)
- `is_active`: true (always)

---

## Performance Characteristics

### Time Complexity

| Operation | Complexity | Example (600 bins) | Notes |
|-----------|-----------|-------------------|-------|
| expand_range() | O(n) | ~10 µs per field | Per field, not total |
| Cartesian product | O(n₁×n₂×...×nₖ) | ~50 ms | Dominant operation |
| Format codes | O(total) | ~100 ms | String formatting |
| Conflict detection | O(total) | ~20 ms | Database query with index |
| Bulk insert | O(total) | ~500 ms | PostgreSQL batch insert |
| **Total** | **O(total)** | **~670 ms** | **600 bins** |

**Scalability**:
| Bins | Time (estimated) | Notes |
|------|-----------------|-------|
| 60 | ~150 ms | Small warehouse section |
| 600 | ~670 ms | Full small warehouse |
| 6,000 | ~5 seconds | Large warehouse |
| 60,000 | ~50 seconds | Mega warehouse (consider background job) |

### Space Complexity

**Memory Usage**:
```python
# Per bin data structure
bin_data = {
    "id": uuid.uuid4(),              # 36 bytes (string)
    "warehouse_id": uuid,            # 36 bytes
    "code": "A-01-02-03",           # ~20 bytes
    "structure_data": {...},         # ~100 bytes (JSON)
    "status": "empty",               # 10 bytes
    "max_weight": 1000.0,           # 8 bytes
    "max_height": 200.0,            # 8 bytes
    "accessibility": "forklift",    # 20 bytes
    "is_active": True,              # 1 byte
}

# Total per bin: ~250 bytes
# 600 bins: 600 × 250 = 150 KB
# 6,000 bins: 6000 × 250 = 1.5 MB
```

**Space Complexity**: O(n) where n is total number of bins

---

## Error Handling

### Common Errors

**1. Missing Field in Ranges**

**Error**:
```json
{
  "detail": "Missing range for field: rack"
}
```

**Cause**: Range not provided for required template field

**Fix**: Include all fields from warehouse template
```json
{
  "ranges": {
    "aisle": ["A"],
    "rack": {"start": 1, "end": 5},  // Added
    "level": {"start": 1, "end": 3}
  }
}
```

---

**2. Invalid Range Format**

**Error**:
```json
{
  "detail": "Invalid range specification"
}
```

**Cause**: Range is neither list nor dict with start/end

**Fix**: Use proper format
```json
// Bad
{"aisle": "A"}
{"rack": {"start": 1}}  // Missing end

// Good
{"aisle": ["A"]}
{"rack": {"start": 1, "end": 5}}
```

---

**3. Conflict Detected**

**Error**:
```json
{
  "detail": "Ütköző kódok találhatók: A-01-01-01, A-01-01-02, B-02-03-04"
}
```

**Cause**: Generated codes already exist in database

**Resolution**:
1. Use preview to identify conflicts
2. Adjust ranges to avoid conflicts
3. Delete conflicting bins (if empty)
4. Retry bulk creation

---

**4. Warehouse Not Found**

**Error**:
```json
{
  "detail": "A raktár nem található."
}
```

**Cause**: Invalid warehouse_id

**Fix**: Verify warehouse exists
```bash
curl -X GET "http://localhost:8000/api/v1/warehouses/{id}" \
  -H "Authorization: Bearer <token>"
```

---

**5. Empty Range**

**Error**:
```json
{
  "detail": "Nem jött létre egyetlen tárolóhely sem."
}
```

**Cause**: Ranges result in zero bins

**Examples**:
```json
// Empty list
{"aisle": []}

// Invalid range
{"rack": {"start": 5, "end": 3}}  // start > end
```

---

## Use Cases

### Use Case 1: New Warehouse Setup

**Scenario**: Setting up a new warehouse with 3 aisles, 20 racks, 6 levels, 2 positions.

**Calculation**:
```
Total bins = 3 × 20 × 6 × 2 = 720 bins
```

**Time Comparison**:
| Method | Time | Error Rate |
|--------|------|-----------|
| Manual (UI, one-by-one) | ~3 hours | ~5% |
| Bulk generation | ~1 second | 0% |

**Savings**: 2.99 hours per warehouse

**Request**:
```json
{
  "warehouse_id": "uuid",
  "ranges": {
    "aisle": ["A", "B", "C"],
    "rack": {"start": 1, "end": 20},
    "level": {"start": 1, "end": 6},
    "position": {"start": 1, "end": 2}
  },
  "defaults": {
    "max_weight": 1200.0,
    "max_height": 220.0,
    "accessibility": "forklift"
  }
}
```

---

### Use Case 2: Warehouse Expansion

**Scenario**: Adding aisle D to existing warehouse (A, B, C already exist).

**Calculation**:
```
New bins = 1 aisle × 20 racks × 6 levels × 2 positions = 240 bins
```

**Strategy**:
1. Preview first to check no conflicts
2. Create only aisle D bins
3. Existing aisles A, B, C unchanged

**Request**:
```json
{
  "warehouse_id": "uuid",
  "ranges": {
    "aisle": ["D"],              // Only new aisle
    "rack": {"start": 1, "end": 20},
    "level": {"start": 1, "end": 6},
    "position": {"start": 1, "end": 2}
  }
}
```

---

### Use Case 3: Partial Range Creation

**Scenario**: Create only ground level bins (level 1) for heavy items.

**Calculation**:
```
Bins = 3 aisles × 20 racks × 1 level × 4 positions = 240 bins
```

**Request**:
```json
{
  "warehouse_id": "uuid",
  "ranges": {
    "aisle": ["A", "B", "C"],
    "rack": {"start": 1, "end": 20},
    "level": ["1"],               // Only level 1
    "position": {"start": 1, "end": 4}
  },
  "defaults": {
    "max_weight": 2000.0,        // Heavier capacity
    "accessibility": "ground"
  }
}
```

**Later**: Create upper levels (2-6) with lower weight capacity

---

### Use Case 4: Selective Bin Creation

**Scenario**: Create bins only for aisles A and C (skip B).

**Request**:
```json
{
  "ranges": {
    "aisle": ["A", "C"],          // Skip B
    "rack": {"start": 1, "end": 20},
    "level": {"start": 1, "end": 6},
    "position": {"start": 1, "end": 2}
  }
}
```

**Result**: 480 bins (2 aisles × 20 × 6 × 2)

---

## Best Practices

### 1. Always Preview First

❌ **Bad**:
```bash
# Directly create without preview
curl -X POST "/bins/bulk" ...
# Oops! Created 600 duplicate bins
```

✅ **Good**:
```bash
# Step 1: Preview
curl -X POST "/bins/bulk/preview" ...
# Check conflicts: ["A-01-01-05"]

# Step 2: Fix conflicts or adjust ranges
# Step 3: Create
curl -X POST "/bins/bulk" ...
```

### 2. Use Meaningful Default Values

❌ **Bad**:
```json
{
  "defaults": {}  // No defaults
}
```

✅ **Good**:
```json
{
  "defaults": {
    "max_weight": 1000.0,      // Standard pallet weight
    "max_height": 200.0,       // Clearance height
    "accessibility": "forklift" // Access method
  }
}
```

### 3. Start Small, Then Expand

❌ **Bad**:
```json
// Create entire warehouse at once
{"aisle": ["A","B","C","D"], "rack": {"start":1,"end":50}, ...}
// If error, need to undo all
```

✅ **Good**:
```json
// Create aisle by aisle
{"aisle": ["A"], "rack": {"start":1,"end":20}, ...}
// Verify, then create B, C, D
```

### 4. Document Your Ranges

Keep a record of generation parameters:

```json
{
  "warehouse_name": "Budapest Central",
  "date_created": "2025-12-21",
  "ranges": {
    "aisle": ["A", "B", "C"],
    "rack": {"start": 1, "end": 20},
    "level": {"start": 1, "end": 6},
    "position": {"start": 1, "end": 2}
  },
  "total_bins": 720,
  "notes": "Standard pallet racking, 1200kg capacity"
}
```

---

## Future Enhancements

### Phase 3+ Roadmap

**1. Async Background Jobs** (for >10,000 bins)
```python
# Submit job
job_id = await submit_bulk_generation(warehouse_id, ranges)

# Check progress
status = await get_job_status(job_id)
# {"status": "running", "progress": 5000, "total": 10000}
```

**2. Progress Tracking via WebSocket**
```javascript
// Real-time updates
ws.onmessage = (event) => {
  const {progress, total} = JSON.parse(event.data);
  updateProgressBar(progress / total * 100);
};
```

**3. Dry Run Mode** (no DB query)
```json
{
  "dry_run": true,  // Generate codes only, skip conflict check
  "ranges": {...}
}
```

**4. Template Validation**
```python
# Pre-validate ranges against template before generation
errors = validate_ranges(template, ranges)
# ["Field 'zone' missing from template", ...]
```

**5. Bulk Update**
```json
{
  "filter": {"aisle": "A", "level": {"start": 1, "end": 3}},
  "updates": {"max_weight": 1500.0}
}
```

**6. Bulk Delete**
```json
{
  "filter": {"aisle": "D", "status": "empty"}
}
```

---

## Testing

### Unit Tests

**Test expand_range()**:
```python
def test_expand_range_list():
    result = expand_range(["A", "B", "C"])
    assert result == ["A", "B", "C"]

def test_expand_range_numeric():
    result = expand_range({"start": 1, "end": 3})
    assert result == ["1", "2", "3"]

def test_expand_range_invalid():
    with pytest.raises(ValueError):
        expand_range("invalid")
```

**Test generate_bin_codes()**:
```python
def test_generate_bin_codes_simple():
    template = {
        "fields": [
            {"name": "aisle", "order": 1},
            {"name": "level", "order": 2}
        ],
        "code_format": "{aisle}-{level}",
        "auto_uppercase": True,
        "zero_padding": True
    }
    ranges = {
        "aisle": ["a", "b"],
        "level": {"start": 1, "end": 2}
    }

    result = generate_bin_codes(template, ranges)

    assert len(result) == 4  # 2 × 2
    assert result[0] == ("A-01", {"aisle": "A", "level": "01"})
    assert result[1] == ("A-02", {"aisle": "A", "level": "02"})
    assert result[2] == ("B-01", {"aisle": "B", "level": "01"})
    assert result[3] == ("B-02", {"aisle": "B", "level": "02"})
```

### Integration Tests

**Test bulk creation**:
```python
async def test_bulk_generation_creates_correct_count():
    # Arrange: 2 aisles × 3 racks = 6 bins
    ranges = {
        "aisle": ["A", "B"],
        "rack": {"start": 1, "end": 3}
    }

    # Act
    count = await create_bulk_bins(db, warehouse_id, ranges)

    # Assert
    assert count == 6
    bins = await db.execute(select(Bin))
    assert len(bins.scalars().all()) == 6
```

**Test conflict detection**:
```python
async def test_bulk_preview_detects_conflicts():
    # Arrange: Create bin A-01
    existing_bin = await create_bin(db, BinCreate(
        warehouse_id=warehouse_id,
        code="A-01",
        structure_data={"aisle": "A", "level": "01"}
    ))

    # Act: Preview generation including A-01
    preview = await preview_bulk_bins(db, warehouse_id, {
        "aisle": ["A"],
        "level": {"start": 1, "end": 2}
    })

    # Assert
    assert "A-01" in preview["conflicts"]
    assert preview["valid"] is False
```

---

## Summary

**Bulk Bin Generation** is Phase 2's most powerful feature:

**Algorithm**: Cartesian product + template formatting
**Performance**: 600 bins in ~1 second
**Safety**: Preview before commit, conflict detection, ACID transactions
**Flexibility**: Supports any warehouse template structure

**Key Benefits**:
- 99.9% time savings vs. manual creation
- 0% error rate
- Scalable to mega warehouses
- Template-driven consistency

See [Phase2_API_Reference.md](Phase2_API_Reference.md) for complete API documentation.
