"""
Database models for the Electronic Medical Record System
"""
from database import db
from datetime import datetime

class Patient(db.Model):
    """Patient model"""
    __tablename__ = 'patients'
    
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=False)
    gender = db.Column(db.String(20))
    email = db.Column(db.String(120), unique=True)
    phone = db.Column(db.String(20))
    address = db.Column(db.String(200))
    blood_type = db.Column(db.String(5))
    emergency_contact = db.Column(db.String(100))
    emergency_phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    appointments = db.relationship('Appointment', backref='patient', lazy=True, cascade='all, delete-orphan')
    medical_records = db.relationship('MedicalRecord', backref='patient', lazy=True, cascade='all, delete-orphan')
    prescriptions = db.relationship('Prescription', backref='patient', lazy=True, cascade='all, delete-orphan')
    allergies = db.relationship('Allergy', backref='patient', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert patient to dictionary"""
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'gender': self.gender,
            'email': self.email,
            'phone': self.phone,
            'address': self.address,
            'blood_type': self.blood_type,
            'emergency_contact': self.emergency_contact,
            'emergency_phone': self.emergency_phone,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Provider(db.Model):
    """Healthcare provider/doctor model"""
    __tablename__ = 'providers'
    
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    specialty = db.Column(db.String(100))
    license_number = db.Column(db.String(50), unique=True)
    email = db.Column(db.String(120), unique=True)
    phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    appointments = db.relationship('Appointment', backref='provider', lazy=True)
    medical_records = db.relationship('MedicalRecord', backref='provider', lazy=True)
    prescriptions = db.relationship('Prescription', backref='provider', lazy=True)
    
    def to_dict(self):
        """Convert provider to dictionary"""
        return {
            'id': self.id,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'specialty': self.specialty,
            'license_number': self.license_number,
            'email': self.email,
            'phone': self.phone,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Appointment(db.Model):
    """Appointment model"""
    __tablename__ = 'appointments'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    appointment_date = db.Column(db.DateTime, nullable=False)
    reason = db.Column(db.String(500))
    status = db.Column(db.String(20), default='scheduled')  # scheduled, completed, cancelled
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert appointment to dictionary"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'appointment_date': self.appointment_date.isoformat() if self.appointment_date else None,
            'reason': self.reason,
            'status': self.status,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class MedicalRecord(db.Model):
    """Medical record model"""
    __tablename__ = 'medical_records'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    visit_date = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    diagnosis = db.Column(db.Text, nullable=False)
    symptoms = db.Column(db.Text)
    treatment = db.Column(db.Text)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert medical record to dictionary"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'visit_date': self.visit_date.isoformat() if self.visit_date else None,
            'diagnosis': self.diagnosis,
            'symptoms': self.symptoms,
            'treatment': self.treatment,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Prescription(db.Model):
    """Prescription model"""
    __tablename__ = 'prescriptions'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    provider_id = db.Column(db.Integer, db.ForeignKey('providers.id'), nullable=False)
    medication_name = db.Column(db.String(200), nullable=False)
    dosage = db.Column(db.String(100), nullable=False)
    frequency = db.Column(db.String(100))
    duration = db.Column(db.String(100))
    instructions = db.Column(db.Text)
    prescribed_date = db.Column(db.DateTime, default=datetime.utcnow)
    status = db.Column(db.String(20), default='active')  # active, completed, discontinued
    
    def to_dict(self):
        """Convert prescription to dictionary"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'provider_id': self.provider_id,
            'medication_name': self.medication_name,
            'dosage': self.dosage,
            'frequency': self.frequency,
            'duration': self.duration,
            'instructions': self.instructions,
            'prescribed_date': self.prescribed_date.isoformat() if self.prescribed_date else None,
            'status': self.status
        }

class Allergy(db.Model):
    """Patient allergy model"""
    __tablename__ = 'allergies'
    
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('patients.id'), nullable=False)
    allergen = db.Column(db.String(200), nullable=False)
    reaction = db.Column(db.String(500))
    severity = db.Column(db.String(20))  # mild, moderate, severe
    recorded_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert allergy to dictionary"""
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'allergen': self.allergen,
            'reaction': self.reaction,
            'severity': self.severity,
            'recorded_date': self.recorded_date.isoformat() if self.recorded_date else None
        }
