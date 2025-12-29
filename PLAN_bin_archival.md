# Bin Archive Feature - Implementation Plan

**Version:** 1.0  
**Date:** 2025-12-29  
**Status:** Planning  
**Estimated Effort:** Sprint 5 (3-4 hours)

---

## 📋 Executive Summary

Implement soft-delete/archive functionality for bins that have movement history, preserving audit trail while removing them from active inventory views.

**Key Benefits:**

- ✅ Audit trail compliance (movement history preserved)
- ✅ Clean active inventory (archived bins hidden by default)
- ✅ Reversible operations (unarchive capability)
- ✅ No breaking changes to existing code

---

## 🎯 Phase 1: Basic Archive (MVP)

### 1.1 Database Schema Changes

**Add to `bins` table:**

```sql
ALTER TABLE bins ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE bins ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bins ADD COLUMN archived_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE bins ADD COLUMN archive_reason TEXT;

CREATE INDEX idx_bins_archived ON bins(is_archived, warehouse_id);
```

**Migration:** `alembic revision --autogenerate -m "add_bin_archival_fields"`

### 1.2 Model Updates

**File:** `app/db/models/bin.py`

```python
# Add fields
is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
archived_at: Mapped[datetime | None] = mapped_column(
    DateTime(timezone=True),
    nullable=True,
)
archived_by: Mapped[uuid.UUID | None] = mapped_column(
    GUID(),
    ForeignKey("users.id", ondelete="SET NULL"),
    nullable=True,
)
archive_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

# Add relationship
archived_by_user: Mapped["User | None"] = relationship()
```

### 1.3 Service Layer

**File:** `app/services/bin.py`

**Add function:**

```python
async def archive_bin(
    db: AsyncSession,
    bin_obj: Bin,
    user_id: UUID,
    reason: str | None = None,
) -> Bin:
    """
    Archive a bin (soft delete).

    Args:
        db: Database session
        bin_obj: Bin to archive
        user_id: User performing the archive
        reason: Optional reason for archival

    Returns:
        Updated bin object
    """
    bin_obj.is_archived = True
    bin_obj.archived_at = datetime.now(UTC)
    bin_obj.archived_by = user_id
    bin_obj.archive_reason = reason
    bin_obj.status = "inactive"  # Optional: change status

    await db.flush()
    await db.refresh(bin_obj)
    return bin_obj
```

**Modify `get_bins()` function:**

```python
async def get_bins(
    db: AsyncSession,
    page: int = 1,
    page_size: int = 50,
    warehouse_id: UUID | None = None,
    status: str | None = None,
    search: str | None = None,
    include_content: bool = False,
    include_expiry_info: bool = False,
    include_archived: bool = False,  # NEW
) -> tuple[list[Bin], int]:
    """..."""
    query = select(Bin)

    # Filter archived by default
    if not include_archived:
        query = query.where(Bin.is_archived == False)

    # ... rest of existing code
```

**Modify `delete_bin()` function:**

```python
async def delete_bin(db: AsyncSession, bin_obj: Bin) -> None:
    """
    Delete a bin (hard delete).

    Only allowed for bins without movement history.
    For bins with history, use archive_bin() instead.
    """
    # Check if bin is archived
    if bin_obj.is_archived:
        raise ValueError("Archivált tárolóhely nem törölhető. Használja az unarchive funkciót.")

    # Check movements (existing code)
    stmt = (
        select(func.count(BinMovement.id))
        .join(BinContent, BinMovement.bin_content_id == BinContent.id)
        .where(BinContent.bin_id == bin_obj.id)
    )
    result = await db.execute(stmt)
    movement_count = result.scalar_one()

    if movement_count > 0:
        raise ValueError(
            "Nem törölhető tárolóhely mozgástörténettel. "
            f"Használja az archiválást helyette ({movement_count} rekord)."
        )

    await db.delete(bin_obj)
    await db.flush()
```

### 1.4 API Endpoints

**File:** `app/api/v1/bins.py`

**Add endpoint:**

```python
@router.post("/{bin_id}/archive", status_code=status.HTTP_200_OK)
async def archive_existing_bin(
    bin_id: UUID,
    db: DbSession,
    current_user: RequireWarehouse,
    reason: str | None = None,
) -> BinResponse:
    """
    Archive a bin (soft delete).

    Archived bins are hidden from default views but preserve all history.
    """
    bin_obj = await get_bin_by_id(db, bin_id)
    if bin_obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=HU_MESSAGES["bin_not_found"],
        )

    if bin_obj.is_archived:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Tárolóhely már archivált",
        )

    archived_bin = await archive_bin(db, bin_obj, current_user.id, reason)
    await db.commit()

    return BinResponse.model_validate(archived_bin)
```

**Modify list endpoint:**

```python
@router.get("", response_model=BinListResponse)
async def list_bins(
    db: DbSession,
    _current_user: RequireAuth,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    warehouse_id: UUID | None = None,
    status: str | None = None,
    search: str | None = None,
    include_content: bool = False,
    include_archived: bool = False,  # NEW
) -> BinListResponse:
    """..."""
    bins, total = await get_bins(
        db=db,
        page=page,
        page_size=page_size,
        warehouse_id=warehouse_id,
        status=status,
        search=search,
        include_content=include_content,
        include_archived=include_archived,  # NEW
    )
    # ...
```

**Modify delete endpoint:**

```python
@router.delete("/{bin_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_existing_bin(
    bin_id: UUID,
    db: DbSession,
    _current_user: RequireWarehouse,
) -> None:
    """
    Delete bin by ID (warehouse+ only).

    Bin must be empty and have no movement history.
    For bins with history, use archive instead.
    """
    # ... existing checks ...

    try:
        await delete_bin(db, bin_obj)
    except ValueError as e:
        # Check if error is about movement history
        if "mozgástörténettel" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"{str(e)} Használja a POST /bins/{bin_id}/archive endpointot.",
            ) from e
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e),
        ) from e
```

### 1.5 Schema Updates

**File:** `app/schemas/bin.py`

```python
# Add to BinResponse
class BinResponse(BaseModel):
    # ... existing fields ...
    is_archived: bool
    archived_at: datetime | None = None
    archived_by: UUID | None = None
    archive_reason: str | None = None
```

### 1.6 Frontend Changes

**File:** `src/queries/bins.ts`

**Add mutation:**

```typescript
export function useArchiveBin() {
  const queryClient = useQueryClient();

  return useMutation<Bin, Error, { id: string; reason?: string }>({
    mutationFn: async ({ id, reason }) => {
      const response = await apiClient.post<Bin>(
        `/bins/${id}/archive`,
        reason ? { reason } : undefined
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bins"] });
    },
  });
}
```

**Update list query:**

```typescript
export const binsQueryOptions = (params: BinListParams) =>
  queryOptions({
    queryKey: ["bins", params],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Bin>>("/bins", {
        params: {
          ...params,
          include_archived: params.include_archived || false, // NEW
        },
      });
      return response.data;
    },
  });
```

**File:** `src/components/bins/bin-list.tsx`

**Add archive button:**

```typescript
// Add to props
interface BinListProps {
  bins: Bin[];
  isLoading?: boolean;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void; // NEW
  onBulkDelete?: (ids: string[]) => void;
  onBulkArchive?: (ids: string[]) => void; // NEW
  isDeleting?: boolean;
  isBulkDeleting?: boolean;
}

// Add archive button in actions
<Button
  variant="ghost"
  size="sm"
  onClick={() => onArchive(bin.id)}
  disabled={bin.is_archived}
>
  <Archive className="h-4 w-4" />
</Button>;

// Add bulk archive button
{
  selectedIds.size > 0 && (
    <div className="mb-4 flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowBulkArchiveDialog(true)}
        disabled={isBulkArchiving}
      >
        <Archive className="h-4 w-4 mr-2" />
        Kiválasztottak archiválása
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => setShowBulkDeleteDialog(true)}
        disabled={isBulkDeleting}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Kiválasztottak törlése
      </Button>
    </div>
  );
}
```

**File:** `src/pages/bins/index.tsx`

**Add handlers:**

```typescript
const archiveMutation = useArchiveBin();

const handleArchive = (id: string) => {
  archiveMutation.mutate(
    { id },
    {
      onSuccess: () => {
        toast.success("Tárolóhely archiválva");
      },
      onError: (error) => {
        const axiosError = error as AxiosError<APIError>;
        const message = axiosError.response?.data?.detail;
        toast.error(typeof message === "string" ? message : HU.errors.generic);
      },
    }
  );
};

const handleBulkArchive = async (ids: string[]) => {
  setIsBulkArchiving(true);
  let successCount = 0;
  let errorCount = 0;

  for (const id of ids) {
    try {
      await archiveMutation.mutateAsync({ id });
      successCount++;
    } catch (error) {
      errorCount++;
    }
  }

  if (successCount > 0) {
    toast.success(`${successCount} tárolóhely archiválva`);
  }
  if (errorCount > 0) {
    toast.error(`${errorCount} tárolóhely archiválása sikertelen`);
  }

  setIsBulkArchiving(false);
};
```

**Add toggle for archived:**

```typescript
const [includeArchived, setIncludeArchived] = useState(false);

// In query
const { data, isLoading } = useBins({
  search,
  warehouse_id: warehouseId,
  page: 1,
  page_size: 100,
  include_archived: includeArchived,
});

// In UI
<div className="flex items-center gap-2">
  <Checkbox
    checked={includeArchived}
    onCheckedChange={setIncludeArchived}
    id="include-archived"
  />
  <label htmlFor="include-archived">Archivált tárolóhelyek megjelenítése</label>
</div>;
```

### 1.7 Testing Checklist

**Backend:**

- [ ] Migration runs successfully
- [ ] `archive_bin()` updates all fields correctly
- [ ] `get_bins()` excludes archived by default
- [ ] `get_bins(include_archived=true)` includes archived
- [ ] `delete_bin()` rejects archived bins
- [ ] `delete_bin()` suggests archive for bins with movements
- [ ] Archive endpoint returns 200 with updated bin
- [ ] Archive endpoint returns 404 for non-existent bin
- [ ] Archive endpoint returns 409 for already archived bin

**Frontend:**

- [ ] Archive button appears in bin list
- [ ] Archive button disabled for archived bins
- [ ] Archive mutation invalidates cache
- [ ] Success toast appears on archive
- [ ] Error toast shows helpful message
- [ ] Bulk archive works with multiple selections
- [ ] "Archivált megjelenítése" toggle works
- [ ] Archived bins show badge/indicator
- [ ] Delete button hidden/disabled for bins with movements

---

## 🚀 Phase 2: Advanced Features (Future)

### 2.1 Unarchive Functionality

- [ ] `unarchive_bin()` service function
- [ ] `POST /bins/{id}/unarchive` endpoint
- [ ] Check code uniqueness before unarchive
- [ ] Admin permission check
- [ ] Frontend unarchive button

### 2.2 Archived Bin Detail View

- [ ] Read-only detail page
- [ ] Full movement history timeline
- [ ] Archive metadata display
- [ ] Unarchive action (admin only)

### 2.3 Bulk Operations Enhancement

- [ ] Bulk archive with reason
- [ ] Archive confirmation dialog with movement count
- [ ] Progress indicator for bulk operations

---

## 📊 Database Migration Script

**File:** `alembic/versions/YYYYMMDD_HHMMSS_add_bin_archival_fields.py`

```python
"""add_bin_archival_fields

Revision ID: xxxxx
Revises: 7ec1163
Create Date: 2025-12-29
"""
from collections.abc import Sequence
from typing import Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = 'xxxxx'
down_revision: str | None = '7ec1163'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Add archival columns
    op.add_column('bins', sa.Column('is_archived', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('bins', sa.Column('archived_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('bins', sa.Column('archived_by', postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column('bins', sa.Column('archive_reason', sa.Text(), nullable=True))

    # Add foreign key
    op.create_foreign_key(
        'fk_bins_archived_by',
        'bins', 'users',
        ['archived_by'], ['id'],
        ondelete='SET NULL'
    )

    # Add index
    op.create_index('idx_bins_archived', 'bins', ['is_archived', 'warehouse_id'])


def downgrade() -> None:
    op.drop_index('idx_bins_archived', table_name='bins')
    op.drop_constraint('fk_bins_archived_by', 'bins', type_='foreignkey')
    op.drop_column('bins', 'archive_reason')
    op.drop_column('bins', 'archived_by')
    op.drop_column('bins', 'archived_at')
    op.drop_column('bins', 'is_archived')
```

---

## 📝 Hungarian Messages

**File:** `app/core/i18n.py`

```python
HU_MESSAGES = {
    # ... existing ...
    "bin_archived": "Tárolóhely archiválva",
    "bin_already_archived": "Tárolóhely már archivált",
    "bin_unarchived": "Tárolóhely visszaállítva",
    "bin_cannot_delete_use_archive": "Nem törölhető tárolóhely mozgástörténettel. Használja az archiválást helyette.",
    "archived_bin_cannot_delete": "Archivált tárolóhely nem törölhető",
}
```

---

## ✅ Acceptance Criteria

**Must Have:**

1. Bins with movement history can be archived instead of deleted
2. Archived bins are hidden from default bin list
3. Archived bins preserve all movement history
4. Bulk archive works with checkbox selection
5. "Show archived" toggle displays archived bins with indicator
6. Delete operation guides user to archive for bins with history

**Should Have:** 7. Archive reason field (optional) 8. Archived metadata (by whom, when) 9. Error messages in Hungarian 10. Success/error toasts for user feedback

**Could Have:** 11. Unarchive functionality (Phase 2) 12. Archived bin detail view (Phase 2) 13. Export archived bins (Phase 4)

---

## 🔄 Rollback Plan

If issues arise:

1. Set `is_archived = false` for all bins: `UPDATE bins SET is_archived = false;`
2. Rollback migration: `docker compose exec backend alembic downgrade -1`
3. Revert code changes via git
4. No data loss - only new columns added

---

## 📈 Success Metrics

- Zero audit trail loss
- 100% movement history preserved
- < 100ms archive operation
- User feedback: clear understanding of archive vs delete
- No production incidents related to bin deletion

---

## 🎯 Implementation Order

1. **Database migration** (15 min)
2. **Model updates** (10 min)
3. **Service layer** (30 min)
4. **API endpoints** (30 min)
5. **Schema updates** (10 min)
6. **Frontend queries** (20 min)
7. **Frontend UI** (45 min)
8. **Testing** (60 min)
9. **Documentation** (15 min)

**Total Estimated Time:** ~3.5 hours

---

**Ready to implement?** Let me know and I'll start with the migration! 🚀
