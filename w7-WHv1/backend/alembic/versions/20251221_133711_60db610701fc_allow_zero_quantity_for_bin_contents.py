"""allow zero quantity for bin_contents

Revision ID: 60db610701fc
Revises: fb475d91443e
Create Date: 2025-12-21 13:37:11.483937

"""

from collections.abc import Sequence

from sqlalchemy import text

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "60db610701fc"
down_revision: str | None = "fb475d91443e"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Allow bin_contents.quantity to reach 0 (e.g., when fully issued or scrapped)
    # without violating the table-level constraint.
    # Use raw SQL with IF EXISTS for safety in case constraint doesn't exist
    conn = op.get_bind()
    conn.execute(
        text(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'check_positive_quantity'
                    AND conrelid = 'bin_contents'::regclass
                ) THEN
                    ALTER TABLE bin_contents DROP CONSTRAINT check_positive_quantity;
                END IF;
            END $$;
            """
        )
    )
    op.create_check_constraint(
        "check_positive_quantity",
        "bin_contents",
        "quantity >= 0",
    )


def downgrade() -> None:
    conn = op.get_bind()
    conn.execute(
        text(
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM pg_constraint
                    WHERE conname = 'check_positive_quantity'
                    AND conrelid = 'bin_contents'::regclass
                ) THEN
                    ALTER TABLE bin_contents DROP CONSTRAINT check_positive_quantity;
                END IF;
            END $$;
            """
        )
    )
    op.create_check_constraint(
        "check_positive_quantity",
        "bin_contents",
        "quantity > 0",
    )
