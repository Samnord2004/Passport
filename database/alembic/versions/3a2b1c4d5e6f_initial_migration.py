"""Initial migration

Revision ID: 3a2b1c4d5e6f
Revises: 
Create Date: 2026-05-27 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '3a2b1c4d5e6f'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users Table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=100), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('fullname', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('phone', sa.String(length=100), nullable=True),
        sa.Column('company', sa.String(length=255), nullable=True),
        sa.Column('telegram_chat_id', sa.String(length=100), nullable=True),
        sa.Column('max_chat_id', sa.String(length=100), nullable=True),
        sa.Column('vk_user_id', sa.String(length=100), nullable=True),
        sa.Column('password_hash', sa.Text(), nullable=False),
        sa.Column('has_biometrics', sa.Boolean(), server_default='False', nullable=True),
        sa.Column('biometric_credential_id', sa.Text(), nullable=True),
        sa.Column('biometric_public_key', sa.Text(), nullable=True),
        sa.Column('biometric_device_name', sa.Text(), nullable=True),
        sa.Column('key_skills', sa.Text(), nullable=True),
        sa.Column('rating', sa.Numeric(precision=3, scale=2), server_default='0.00', nullable=True),
        sa.Column('rating_count', sa.Integer(), server_default='0', nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. building_objects Table
    op.create_table(
        'building_objects',
        sa.Column('id', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('address', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('owner_id', sa.String(length=100), nullable=True),
        sa.Column('yandex_disk_path', sa.Text(), nullable=False),
        sa.Column('allowed_specialist_ids', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['owner_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # 3. checklist_templates Table
    op.create_table(
        'checklist_templates',
        sa.Column('id', sa.String(length=100), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('questions', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 4. schedules Table
    op.create_table(
        'schedules',
        sa.Column('id', sa.String(length=100), nullable=False),
        sa.Column('object_id', sa.String(length=100), nullable=True),
        sa.Column('category', sa.String(length=255), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('interval_days', sa.Integer(), server_default='1', nullable=False),
        sa.Column('last_done_date', sa.String(length=50), nullable=True),
        sa.Column('responsible_user_id', sa.String(length=100), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('checklist_template_id', sa.String(length=100), nullable=True),
        sa.Column('commissioning_date', sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(['checklist_template_id'], ['checklist_templates.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['object_id'], ['building_objects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['responsible_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # 5. completed_checklists Table
    op.create_table(
        'completed_checklists',
        sa.Column('id', sa.String(length=100), nullable=False),
        sa.Column('object_id', sa.String(length=100), nullable=False),
        sa.Column('schedule_item_id', sa.String(length=100), nullable=False),
        sa.Column('checklist_template_id', sa.String(length=100), nullable=False),
        sa.Column('date_done', sa.Text(), nullable=False),
        sa.Column('answers', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('specialist_info', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('specialist_user_id', sa.String(length=100), nullable=False),
        sa.Column('pdf_url', sa.Text(), nullable=True),
        sa.Column('approved_by_owner', sa.Boolean(), server_default='False', nullable=True),
        sa.Column('owner_rating', sa.Integer(), nullable=True),
        sa.Column('owner_rating_comment', sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # 6. notification_logs Table
    op.create_table(
        'notification_logs',
        sa.Column('id', sa.String(length=100), nullable=False),
        sa.Column('timestamp', sa.Text(), nullable=False),
        sa.Column('channel', sa.String(length=100), nullable=False),
        sa.Column('recipient', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('type', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 7. system_settings Table
    op.create_table(
        'system_settings',
        sa.Column('id', sa.String(length=100), nullable=False),
        sa.Column('yandex_disk_token', sa.Text(), nullable=True),
        sa.Column('yandex_disk_connected', sa.Boolean(), server_default='False', nullable=True),
        sa.Column('reminder_days_before', sa.Integer(), server_default='3', nullable=True),
        sa.Column('logo_url', sa.Text(), nullable=True),
        sa.Column('custom_logo_enabled', sa.Boolean(), server_default='True', nullable=True),
        sa.Column('notificationchannels', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # 8. session Table (for express-session compatibility)
    op.create_table(
        'session',
        sa.Column('sid', sa.String(), nullable=False),
        sa.Column('sess', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('expire', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('sid')
    )
    op.create_index(op.f('ix_session_expire'), 'session', ['expire'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_session_expire'), table_name='session')
    op.drop_table('session')
    op.drop_table('system_settings')
    op.drop_table('notification_logs')
    op.drop_table('completed_checklists')
    op.drop_table('schedules')
    op.drop_table('checklist_templates')
    op.drop_table('building_objects')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
