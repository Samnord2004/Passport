from sqlalchemy import Column, String, Integer, Boolean, Text, ForeignKey, Numeric, DateTime
from sqlalchemy.dialects.postgresql import JSONB, JSON
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'

    id = Column(String(100), primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    fullname = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)
    phone = Column(String(100))
    company = Column(String(255))
    telegram_chat_id = Column(String(100))
    max_chat_id = Column(String(100))
    vk_user_id = Column(String(100))
    password_hash = Column(Text, nullable=False)
    has_biometrics = Column(Boolean, default=False)
    biometric_credential_id = Column(Text)
    biometric_public_key = Column(Text)
    biometric_device_name = Column(Text)
    key_skills = Column(Text)
    rating = Column(Numeric(3, 2), default=0.0)
    rating_count = Column(Integer, default=0)

    # Relationships
    objects = relationship("BuildingObject", back_populates="owner")
    schedules = relationship("Schedule", back_populates="responsible_user")


class BuildingObject(Base):
    __tablename__ = 'building_objects'

    id = Column(String(100), primary_key=True)
    name = Column(String(255), nullable=False)
    address = Column(Text, nullable=False)
    description = Column(Text)
    owner_id = Column(String(100), ForeignKey('users.id', ondelete='SET NULL'))
    yandex_disk_path = Column(Text, nullable=False)
    allowed_specialist_ids = Column(Text)  # Stored as custom comma-separated or JSON list of user IDs

    # Relationships
    owner = relationship("User", back_populates="objects")
    schedules = relationship("Schedule", back_populates="building_object", cascade="all, delete-orphan")


class ChecklistTemplate(Base):
    __tablename__ = 'checklist_templates'

    id = Column(String(100), primary_key=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    questions = Column(JSONB, nullable=False)  # JSONB array of questions & answer schemas

    # Relationships
    schedules = relationship("Schedule", back_populates="checklist_template")


class Schedule(Base):
    __tablename__ = 'schedules'

    id = Column(String(100), primary_key=True)
    object_id = Column(String(100), ForeignKey('building_objects.id', ondelete='CASCADE'))
    category = Column(String(255), nullable=False)
    title = Column(String(255), nullable=False)
    interval_days = Column(Integer, nullable=False, default=1)
    last_done_date = Column(String(50))
    responsible_user_id = Column(String(100), ForeignKey('users.id', ondelete='SET NULL'))
    notes = Column(Text)
    checklist_template_id = Column(String(100), ForeignKey('checklist_templates.id', ondelete='SET NULL'))
    commissioning_date = Column(Text)

    # Relationships
    building_object = relationship("BuildingObject", back_populates="schedules")
    responsible_user = relationship("User", back_populates="schedules")
    checklist_template = relationship("ChecklistTemplate", back_populates="schedules")


class CompletedChecklist(Base):
    __tablename__ = 'completed_checklists'

    id = Column(String(100), primary_key=True)
    object_id = Column(String(100), nullable=False)
    schedule_item_id = Column(String(100), nullable=False)
    checklist_template_id = Column(String(100), nullable=False)
    date_done = Column(Text, nullable=False)
    answers = Column(JSONB, nullable=False)  # JSONB array of submitted answers
    specialist_info = Column(JSONB, nullable=False)  # JSONB description of full state
    specialist_user_id = Column(String(100), nullable=False)
    pdf_url = Column(Text)
    approved_by_owner = Column(Boolean, default=False)
    owner_rating = Column(Integer)
    owner_rating_comment = Column(Text)


class NotificationLog(Base):
    __tablename__ = 'notification_logs'

    id = Column(String(100), primary_key=True)
    timestamp = Column(Text, nullable=False)
    channel = Column(String(100), nullable=False)
    recipient = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False)


class SystemSettings(Base):
    __tablename__ = 'system_settings'

    id = Column(String(100), primary_key=True)
    yandex_disk_token = Column(Text)
    yandex_disk_connected = Column(Boolean, default=False)
    reminder_days_before = Column(Integer, default=3)
    logo_url = Column(Text)
    custom_logo_enabled = Column(Boolean, default=True)
    notificationchannels = Column(JSONB, nullable=False)  # JSONB structure of channel preferences


class Session(Base):
    __tablename__ = 'session'

    sid = Column(String, primary_key=True, nullable=False)
    sess = Column(JSON, nullable=False)
    expire = Column(DateTime, nullable=False, index=True)
