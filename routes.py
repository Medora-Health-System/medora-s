"""
API Routes for the Electronic Medical Record System
"""
from flask import jsonify, request
from datetime import datetime, timezone

def register_routes(app, db):
    """Register all API routes"""
    
    # Import models here to avoid circular imports
    from models import Patient, Provider, Appointment, MedicalRecord, Prescription, Allergy
    
    # ==================== Patient Routes ====================
    
    @app.route('/api/patients', methods=['GET'])
    def get_patients():
        """Get all patients"""
        patients = Patient.query.all()
        return jsonify([patient.to_dict() for patient in patients])
    
    @app.route('/api/patients/<int:patient_id>', methods=['GET'])
    def get_patient(patient_id):
        """Get a specific patient"""
        patient = Patient.query.get_or_404(patient_id)
        return jsonify(patient.to_dict())
    
    @app.route('/api/patients', methods=['POST'])
    def create_patient():
        """Create a new patient"""
        data = request.json
        
        try:
            # Parse date of birth
            dob = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
            
            patient = Patient(
                first_name=data['first_name'],
                last_name=data['last_name'],
                date_of_birth=dob,
                gender=data.get('gender'),
                email=data.get('email'),
                phone=data.get('phone'),
                address=data.get('address'),
                blood_type=data.get('blood_type'),
                emergency_contact=data.get('emergency_contact'),
                emergency_phone=data.get('emergency_phone')
            )
            
            db.session.add(patient)
            db.session.commit()
            
            return jsonify(patient.to_dict()), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
    
    @app.route('/api/patients/<int:patient_id>', methods=['PUT'])
    def update_patient(patient_id):
        """Update a patient"""
        patient = Patient.query.get_or_404(patient_id)
        data = request.json
        
        try:
            if 'first_name' in data:
                patient.first_name = data['first_name']
            if 'last_name' in data:
                patient.last_name = data['last_name']
            if 'date_of_birth' in data:
                patient.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
            if 'gender' in data:
                patient.gender = data['gender']
            if 'email' in data:
                patient.email = data['email']
            if 'phone' in data:
                patient.phone = data['phone']
            if 'address' in data:
                patient.address = data['address']
            if 'blood_type' in data:
                patient.blood_type = data['blood_type']
            if 'emergency_contact' in data:
                patient.emergency_contact = data['emergency_contact']
            if 'emergency_phone' in data:
                patient.emergency_phone = data['emergency_phone']
            
            patient.updated_at = datetime.now(timezone.utc)
            db.session.commit()
            
            return jsonify(patient.to_dict())
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
    
    @app.route('/api/patients/<int:patient_id>', methods=['DELETE'])
    def delete_patient(patient_id):
        """Delete a patient"""
        patient = Patient.query.get_or_404(patient_id)
        
        try:
            db.session.delete(patient)
            db.session.commit()
            return jsonify({'message': 'Patient deleted successfully'}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
    
    # ==================== Provider Routes ====================
    
    @app.route('/api/providers', methods=['GET'])
    def get_providers():
        """Get all providers"""
        providers = Provider.query.all()
        return jsonify([provider.to_dict() for provider in providers])
    
    @app.route('/api/providers/<int:provider_id>', methods=['GET'])
    def get_provider(provider_id):
        """Get a specific provider"""
        provider = Provider.query.get_or_404(provider_id)
        return jsonify(provider.to_dict())
    
    @app.route('/api/providers', methods=['POST'])
    def create_provider():
        """Create a new provider"""
        data = request.json
        
        try:
            provider = Provider(
                first_name=data['first_name'],
                last_name=data['last_name'],
                specialty=data.get('specialty'),
                license_number=data.get('license_number'),
                email=data.get('email'),
                phone=data.get('phone')
            )
            
            db.session.add(provider)
            db.session.commit()
            
            return jsonify(provider.to_dict()), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
    
    @app.route('/api/providers/<int:provider_id>', methods=['PUT'])
    def update_provider(provider_id):
        """Update a provider"""
        provider = Provider.query.get_or_404(provider_id)
        data = request.json
        
        try:
            if 'first_name' in data:
                provider.first_name = data['first_name']
            if 'last_name' in data:
                provider.last_name = data['last_name']
            if 'specialty' in data:
                provider.specialty = data['specialty']
            if 'license_number' in data:
                provider.license_number = data['license_number']
            if 'email' in data:
                provider.email = data['email']
            if 'phone' in data:
                provider.phone = data['phone']
            
            db.session.commit()
            
            return jsonify(provider.to_dict())
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
    
    @app.route('/api/providers/<int:provider_id>', methods=['DELETE'])
    def delete_provider(provider_id):
        """Delete a provider"""
        provider = Provider.query.get_or_404(provider_id)
        
        try:
            db.session.delete(provider)
            db.session.commit()
            return jsonify({'message': 'Provider deleted successfully'}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
    
    # ==================== Appointment Routes ====================
    
    @app.route('/api/appointments', methods=['GET'])
    def get_appointments():
        """Get all appointments"""
        appointments = Appointment.query.all()
        return jsonify([appointment.to_dict() for appointment in appointments])
    
    @app.route('/api/appointments/<int:appointment_id>', methods=['GET'])
    def get_appointment(appointment_id):
        """Get a specific appointment"""
        appointment = Appointment.query.get_or_404(appointment_id)
        return jsonify(appointment.to_dict())
    
    @app.route('/api/patients/<int:patient_id>/appointments', methods=['GET'])
    def get_patient_appointments(patient_id):
        """Get all appointments for a patient"""
        appointments = Appointment.query.filter_by(patient_id=patient_id).all()
        return jsonify([appointment.to_dict() for appointment in appointments])
    
    @app.route('/api/appointments', methods=['POST'])
    def create_appointment():
        """Create a new appointment"""
        data = request.json
        
        try:
            appointment_date = datetime.strptime(data['appointment_date'], '%Y-%m-%dT%H:%M')
            
            appointment = Appointment(
                patient_id=data['patient_id'],
                provider_id=data['provider_id'],
                appointment_date=appointment_date,
                reason=data.get('reason'),
                status=data.get('status', 'scheduled'),
                notes=data.get('notes')
            )
            
            db.session.add(appointment)
            db.session.commit()
            
            return jsonify(appointment.to_dict()), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
    
    @app.route('/api/appointments/<int:appointment_id>', methods=['PUT'])
    def update_appointment(appointment_id):
        """Update an appointment"""
        appointment = Appointment.query.get_or_404(appointment_id)
        data = request.json
        
        try:
            if 'appointment_date' in data:
                appointment.appointment_date = datetime.strptime(data['appointment_date'], '%Y-%m-%dT%H:%M')
            if 'reason' in data:
                appointment.reason = data['reason']
            if 'status' in data:
                appointment.status = data['status']
            if 'notes' in data:
                appointment.notes = data['notes']
            
            db.session.commit()
            
            return jsonify(appointment.to_dict())
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
    
    @app.route('/api/appointments/<int:appointment_id>', methods=['DELETE'])
    def delete_appointment(appointment_id):
        """Delete an appointment"""
        appointment = Appointment.query.get_or_404(appointment_id)
        
        try:
            db.session.delete(appointment)
            db.session.commit()
            return jsonify({'message': 'Appointment deleted successfully'}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
    
    # ==================== Medical Record Routes ====================
    
    @app.route('/api/medical-records', methods=['GET'])
    def get_medical_records():
        """Get all medical records"""
        records = MedicalRecord.query.all()
        return jsonify([record.to_dict() for record in records])
    
    @app.route('/api/medical-records/<int:record_id>', methods=['GET'])
    def get_medical_record(record_id):
        """Get a specific medical record"""
        record = MedicalRecord.query.get_or_404(record_id)
        return jsonify(record.to_dict())
    
    @app.route('/api/patients/<int:patient_id>/medical-records', methods=['GET'])
    def get_patient_medical_records(patient_id):
        """Get all medical records for a patient"""
        records = MedicalRecord.query.filter_by(patient_id=patient_id).all()
        return jsonify([record.to_dict() for record in records])
    
    @app.route('/api/medical-records', methods=['POST'])
    def create_medical_record():
        """Create a new medical record"""
        data = request.json
        
        try:
            visit_date = datetime.strptime(data['visit_date'], '%Y-%m-%dT%H:%M') if 'visit_date' in data else datetime.now(timezone.utc)
            
            record = MedicalRecord(
                patient_id=data['patient_id'],
                provider_id=data['provider_id'],
                visit_date=visit_date,
                diagnosis=data['diagnosis'],
                symptoms=data.get('symptoms'),
                treatment=data.get('treatment'),
                notes=data.get('notes')
            )
            
            db.session.add(record)
            db.session.commit()
            
            return jsonify(record.to_dict()), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
    
    @app.route('/api/medical-records/<int:record_id>', methods=['PUT'])
    def update_medical_record(record_id):
        """Update a medical record"""
        record = MedicalRecord.query.get_or_404(record_id)
        data = request.json
        
        try:
            if 'visit_date' in data:
                record.visit_date = datetime.strptime(data['visit_date'], '%Y-%m-%dT%H:%M')
            if 'diagnosis' in data:
                record.diagnosis = data['diagnosis']
            if 'symptoms' in data:
                record.symptoms = data['symptoms']
            if 'treatment' in data:
                record.treatment = data['treatment']
            if 'notes' in data:
                record.notes = data['notes']
            
            db.session.commit()
            
            return jsonify(record.to_dict())
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
    
    @app.route('/api/medical-records/<int:record_id>', methods=['DELETE'])
    def delete_medical_record(record_id):
        """Delete a medical record"""
        record = MedicalRecord.query.get_or_404(record_id)
        
        try:
            db.session.delete(record)
            db.session.commit()
            return jsonify({'message': 'Medical record deleted successfully'}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
    
    # ==================== Prescription Routes ====================
    
    @app.route('/api/prescriptions', methods=['GET'])
    def get_prescriptions():
        """Get all prescriptions"""
        prescriptions = Prescription.query.all()
        return jsonify([prescription.to_dict() for prescription in prescriptions])
    
    @app.route('/api/prescriptions/<int:prescription_id>', methods=['GET'])
    def get_prescription(prescription_id):
        """Get a specific prescription"""
        prescription = Prescription.query.get_or_404(prescription_id)
        return jsonify(prescription.to_dict())
    
    @app.route('/api/patients/<int:patient_id>/prescriptions', methods=['GET'])
    def get_patient_prescriptions(patient_id):
        """Get all prescriptions for a patient"""
        prescriptions = Prescription.query.filter_by(patient_id=patient_id).all()
        return jsonify([prescription.to_dict() for prescription in prescriptions])
    
    @app.route('/api/prescriptions', methods=['POST'])
    def create_prescription():
        """Create a new prescription"""
        data = request.json
        
        try:
            prescription = Prescription(
                patient_id=data['patient_id'],
                provider_id=data['provider_id'],
                medication_name=data['medication_name'],
                dosage=data['dosage'],
                frequency=data.get('frequency'),
                duration=data.get('duration'),
                instructions=data.get('instructions'),
                status=data.get('status', 'active')
            )
            
            db.session.add(prescription)
            db.session.commit()
            
            return jsonify(prescription.to_dict()), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
    
    @app.route('/api/prescriptions/<int:prescription_id>', methods=['PUT'])
    def update_prescription(prescription_id):
        """Update a prescription"""
        prescription = Prescription.query.get_or_404(prescription_id)
        data = request.json
        
        try:
            if 'medication_name' in data:
                prescription.medication_name = data['medication_name']
            if 'dosage' in data:
                prescription.dosage = data['dosage']
            if 'frequency' in data:
                prescription.frequency = data['frequency']
            if 'duration' in data:
                prescription.duration = data['duration']
            if 'instructions' in data:
                prescription.instructions = data['instructions']
            if 'status' in data:
                prescription.status = data['status']
            
            db.session.commit()
            
            return jsonify(prescription.to_dict())
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
    
    @app.route('/api/prescriptions/<int:prescription_id>', methods=['DELETE'])
    def delete_prescription(prescription_id):
        """Delete a prescription"""
        prescription = Prescription.query.get_or_404(prescription_id)
        
        try:
            db.session.delete(prescription)
            db.session.commit()
            return jsonify({'message': 'Prescription deleted successfully'}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
    
    # ==================== Allergy Routes ====================
    
    @app.route('/api/allergies', methods=['GET'])
    def get_allergies():
        """Get all allergies"""
        allergies = Allergy.query.all()
        return jsonify([allergy.to_dict() for allergy in allergies])
    
    @app.route('/api/allergies/<int:allergy_id>', methods=['GET'])
    def get_allergy(allergy_id):
        """Get a specific allergy"""
        allergy = Allergy.query.get_or_404(allergy_id)
        return jsonify(allergy.to_dict())
    
    @app.route('/api/patients/<int:patient_id>/allergies', methods=['GET'])
    def get_patient_allergies(patient_id):
        """Get all allergies for a patient"""
        allergies = Allergy.query.filter_by(patient_id=patient_id).all()
        return jsonify([allergy.to_dict() for allergy in allergies])
    
    @app.route('/api/allergies', methods=['POST'])
    def create_allergy():
        """Create a new allergy"""
        data = request.json
        
        try:
            allergy = Allergy(
                patient_id=data['patient_id'],
                allergen=data['allergen'],
                reaction=data.get('reaction'),
                severity=data.get('severity')
            )
            
            db.session.add(allergy)
            db.session.commit()
            
            return jsonify(allergy.to_dict()), 201
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
    
    @app.route('/api/allergies/<int:allergy_id>', methods=['PUT'])
    def update_allergy(allergy_id):
        """Update an allergy"""
        allergy = Allergy.query.get_or_404(allergy_id)
        data = request.json
        
        try:
            if 'allergen' in data:
                allergy.allergen = data['allergen']
            if 'reaction' in data:
                allergy.reaction = data['reaction']
            if 'severity' in data:
                allergy.severity = data['severity']
            
            db.session.commit()
            
            return jsonify(allergy.to_dict())
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
    
    @app.route('/api/allergies/<int:allergy_id>', methods=['DELETE'])
    def delete_allergy(allergy_id):
        """Delete an allergy"""
        allergy = Allergy.query.get_or_404(allergy_id)
        
        try:
            db.session.delete(allergy)
            db.session.commit()
            return jsonify({'message': 'Allergy deleted successfully'}), 200
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 400
