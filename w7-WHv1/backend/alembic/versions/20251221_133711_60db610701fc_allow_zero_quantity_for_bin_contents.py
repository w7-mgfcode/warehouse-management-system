"""allow zero quantity for bin_contents

Revision ID: 60db610701fc
Revises: fb475d91443e
Create Date: 2025-12-21 13:37:11.483937

"""
from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '60db610701fc'
down_revision: str | None = 'fb475d91443e'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Allow bin_contents.quantity to reach 0 (e.g., when fully issued or scrapped)
    # without violating the table-level constraint.
    op.drop_constraint(
        "check_positive_quantity",
        "bin_contents",
        type_="check",
    )
    op.create_check_constraint(
        "check_positive_quantity",
        "bin_contents",
        "quantity >= 0",
    )


def downgrade() -> None:
    op.drop_constraint(
        "check_positive_quantity",
        "bin_contents",
        type_="check",
    )
    op.create_check_constraint(
        "check_positive_quantity",
        "bin_contents",
        "quantity > 0",
    )
