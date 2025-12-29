# Bin Archiválás & Kapcsolódó Feature-ök - Brainstorming

**Alapkoncepció:** Movement history-val rendelkező bins-ek ne törlődjenek fizikailag, hanem archiválódjanak audit trail megőrzéssel.

---

## Core Feature: Bin Archiválás

### 1. Soft Delete / Archive Flag

- `is_archived: bool` mező hozzáadása Bin modellhez
- Archived bins:
  - Nem jelennek meg alapértelmezett listában
  - Nem használhatók új műveletekhez
  - Megőrzik az összes movement history-t
  - Visszaállíthatók szükség esetén

### 2. Archive Metaadatok

- `archived_at: datetime` - mikor archiválták
- `archived_by: UUID` - ki archiválta (user_id)
- `archive_reason: str` - miért (optional)

### 3. UI/UX Szempontok

- Bulk archive button a törlés mellett
- "Archivált tárolóhelyek megtekintése" toggle/filter
- Warning dialog: "X movement rekord megmarad"
- Archive vs Delete intelligens választás:
  - Ha van movement → csak Archive opció
  - Ha nincs movement → Delete vagy Archive

---

## Extended Features

### 4. Bin Lifecycle Management

- **Státuszok bővítése:**
  - `empty` → `occupied` → `reserved` → `inactive` → `archived`
- **Inactive vs Archived:**
  - Inactive: átmenetileg nem használt, de visszaállítható
  - Archived: véglegesen kivont, csak audit célból őrzött

### 5. Warehouse Layout Changes

- **Scenario:** Raktár átrendezés
- **Feature:** Bulk bin reorganization
  - Régi bins archiválása
  - Új bins létrehozása új template-tel
  - Movement history átviszi a context-et

### 6. Bin History View

- **Audit Trail UI:**
  - Archived bin detail page
  - Teljes movement history
  - Timeline view
  - Export PDF/CSV

### 7. Archive Retention Policy

- **Compliance:**
  - Automatikus archive X év után
  - Retention period szerint szűrés
  - GDPR/adatvédelmi kompatibilitás

### 8. Unarchive / Restore

- **Visszaállítás:**
  - Admin jog szükséges
  - Ellenőrzés: code konfliktus?
  - Restore reason logging

---

## Technical Considerations

### Database

- Index: `is_archived` + `warehouse_id` (performance)
- Query filter: `WHERE is_archived = false` alapértelmezett
- Cascade behavior: archived bins továbbra is megtartják contents-et

### API Endpoints

- `POST /bins/{id}/archive` - Archive single bin
- `POST /bins/bulk-archive` - Bulk archive
- `POST /bins/{id}/unarchive` - Restore archived bin
- `GET /bins?include_archived=true` - List with archived

### Permissions

- `archive:bin` - Warehouse+ role
- `unarchive:bin` - Admin only
- `view:archived` - Warehouse+ (read-only)

---

## Phase-wise Implementation Plan

### Phase 1: Basic Archive (Sprint 5)

- [ ] Add `is_archived`, `archived_at`, `archived_by` fields
- [ ] Migration script
- [ ] Backend service: archive_bin()
- [ ] API endpoint: POST /bins/{id}/archive
- [ ] Frontend: Archive button in single bin view

### Phase 2: Bulk & UI (Sprint 5 cont.)

- [ ] Bulk archive endpoint
- [ ] Frontend: Bulk archive button in list
- [ ] "Archivált megtekintése" toggle filter
- [ ] Intelligent delete/archive decision

### Phase 3: Advanced Features (Sprint 6)

- [ ] Unarchive functionality
- [ ] Archived bin detail/history view
- [ ] Archive reason field & UI
- [ ] Audit log for archive/unarchive actions

### Phase 4: Compliance & Automation (Phase 6)

- [ ] Retention policy configuration
- [ ] Scheduled archive job (Celery)
- [ ] Archive export (PDF/CSV)
- [ ] Dashboard: archived bins statistics

---

## User Stories

### US1: Warehouse Manager Archives Old Bin

**As a** warehouse manager  
**I want to** archive a bin that's no longer used but has history  
**So that** I keep audit trail while cleaning up active inventory

**Acceptance Criteria:**

- Archive button available on bin detail page
- Confirmation dialog shows movement count
- Archived bin disappears from default list
- Movement history remains queryable

### US2: Admin Reviews Archived Bins

**As an** admin  
**I want to** view all archived bins with filters  
**So that** I can audit historical operations

**Acceptance Criteria:**

- Toggle "Show archived" in bins list
- Archived bins marked with badge
- Click opens archived bin detail (read-only)
- Full movement history visible

### US3: Accidental Archive Recovery

**As an** admin  
**I want to** unarchive a bin if archived by mistake  
**So that** I can restore it to active use

**Acceptance Criteria:**

- Unarchive button on archived bin detail
- Checks code uniqueness before unarchive
- Logs unarchive action with reason
- Bin returns to original status

---

## Questions for Clarification

1. **Retention period:** Hány évig kell őrizni az archivált bins-eket?
2. **Permissions:** Ki archiválhat? Ki állíthat vissza?
3. **Code reuse:** Archivált bin kódja újrahasználható-e új bin-nél?
4. **Batch operations:** Szükséges-e teljes warehouse section archiválás?
5. **Export:** Kell-e PDF/Excel export az archivált bins-ről?

---

## Next Steps

1. **RESEARCH:** Jelenlegi Bin model és dependencies vizsgálata
2. **PLAN:** Detailed spec írása Phase 1-hez (basic archive)
3. **IMPLEMENT:** Migration + backend service + API
4. **TEST:** Manual testing Phase 7-ben
5. **ITERATE:** Phase 2-3-4 szerint haladás

---

**Recommended Start:** Phase 1 basic archive - leggyorsabb value delivery, minimális breaking change.
