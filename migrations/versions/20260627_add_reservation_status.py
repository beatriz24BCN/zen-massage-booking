"""Add status to reservation

Revision ID: 20260627_add_res_status
Revises: add_reservation_001
Create Date: 2026-06-27 18:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260627_add_res_status'
down_revision = 'add_reservation_001'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        'reservation',
        sa.Column('status', sa.String(length=20),
                  nullable=False, server_default='pendiente')
    )
    op.alter_column('reservation', 'status', server_default=None)


def downgrade():
    op.drop_column('reservation', 'status')
