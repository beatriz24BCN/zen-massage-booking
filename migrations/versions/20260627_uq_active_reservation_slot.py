"""Add partial unique index for active reservation slot

Revision ID: 20260627_uq_active_slot
Revises: 20260627_add_res_status
Create Date: 2026-06-27 21:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260627_uq_active_slot'
down_revision = '20260627_add_res_status'
branch_labels = None
depends_on = None


def upgrade():
    op.create_index(
        'uq_reservation_active_slot',
        'reservation',
        ['reservation_date', 'reservation_time'],
        unique=True,
        postgresql_where=sa.text("status <> 'cancelada'"),
        sqlite_where=sa.text("status <> 'cancelada'"),
    )


def downgrade():
    op.drop_index('uq_reservation_active_slot', table_name='reservation')
