"""
Tests for the Electronic Medical Record System
"""
import unittest
import json
from datetime import datetime, timedelta
from app import app
from database import db
from models import Patient, Provider, Appointment, MedicalRecord, Prescription, Allergy

class EMRTestCase(unittest.TestCase):
    """Test cases for EMR system"""
    
    def setUp(self):
        """Set up test client and database"""
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.client = app.test_client()
        
        with app.app_context():
            db.create_all()
    
    def tearDown(self):
        """Clean up after tests"""
        with app.app_context():
            db.session.remove()
            db.drop_all()
    
    def test_create_patient(self):
        """Test creating a new patient"""
        patient_data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'date_of_birth': '1990-01-15',
            'gender': 'Male',
            'email': 'john.doe@example.com',
            'phone': '555-1234',
            'blood_type': 'A+'
        }
        
        response = self.client.post('/api/patients',
                                   data=json.dumps(patient_data),
                                   content_type='application/json')
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['first_name'], 'John')
        self.assertEqual(data['last_name'], 'Doe')
    
    def test_get_patients(self):
        """Test retrieving all patients"""
        response = self.client.get('/api/patients')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
    
    def test_create_provider(self):
        """Test creating a new provider"""
        provider_data = {
            'first_name': 'Dr. Jane',
            'last_name': 'Smith',
            'specialty': 'Cardiology',
            'license_number': 'MD-12345',
            'email': 'jane.smith@hospital.com',
            'phone': '555-5678'
        }
        
        response = self.client.post('/api/providers',
                                   data=json.dumps(provider_data),
                                   content_type='application/json')
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['specialty'], 'Cardiology')
    
    def test_get_providers(self):
        """Test retrieving all providers"""
        response = self.client.get('/api/providers')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIsInstance(data, list)
    
    def test_create_appointment(self):
        """Test creating an appointment"""
        # First create a patient and provider
        patient_data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'date_of_birth': '1990-01-15'
        }
        patient_response = self.client.post('/api/patients',
                                           data=json.dumps(patient_data),
                                           content_type='application/json')
        patient = json.loads(patient_response.data)
        
        provider_data = {
            'first_name': 'Dr. Jane',
            'last_name': 'Smith'
        }
        provider_response = self.client.post('/api/providers',
                                            data=json.dumps(provider_data),
                                            content_type='application/json')
        provider = json.loads(provider_response.data)
        
        # Create appointment
        appointment_date = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%dT%H:%M')
        appointment_data = {
            'patient_id': patient['id'],
            'provider_id': provider['id'],
            'appointment_date': appointment_date,
            'reason': 'Annual checkup'
        }
        
        response = self.client.post('/api/appointments',
                                   data=json.dumps(appointment_data),
                                   content_type='application/json')
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['reason'], 'Annual checkup')
    
    def test_create_medical_record(self):
        """Test creating a medical record"""
        # First create a patient and provider
        patient_data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'date_of_birth': '1990-01-15'
        }
        patient_response = self.client.post('/api/patients',
                                           data=json.dumps(patient_data),
                                           content_type='application/json')
        patient = json.loads(patient_response.data)
        
        provider_data = {
            'first_name': 'Dr. Jane',
            'last_name': 'Smith'
        }
        provider_response = self.client.post('/api/providers',
                                            data=json.dumps(provider_data),
                                            content_type='application/json')
        provider = json.loads(provider_response.data)
        
        # Create medical record
        record_data = {
            'patient_id': patient['id'],
            'provider_id': provider['id'],
            'visit_date': datetime.now().strftime('%Y-%m-%dT%H:%M'),
            'diagnosis': 'Common cold',
            'symptoms': 'Fever, cough',
            'treatment': 'Rest and fluids'
        }
        
        response = self.client.post('/api/medical-records',
                                   data=json.dumps(record_data),
                                   content_type='application/json')
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['diagnosis'], 'Common cold')
    
    def test_create_prescription(self):
        """Test creating a prescription"""
        # First create a patient and provider
        patient_data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'date_of_birth': '1990-01-15'
        }
        patient_response = self.client.post('/api/patients',
                                           data=json.dumps(patient_data),
                                           content_type='application/json')
        patient = json.loads(patient_response.data)
        
        provider_data = {
            'first_name': 'Dr. Jane',
            'last_name': 'Smith'
        }
        provider_response = self.client.post('/api/providers',
                                            data=json.dumps(provider_data),
                                            content_type='application/json')
        provider = json.loads(provider_response.data)
        
        # Create prescription
        prescription_data = {
            'patient_id': patient['id'],
            'provider_id': provider['id'],
            'medication_name': 'Amoxicillin',
            'dosage': '500mg',
            'frequency': 'Twice daily',
            'duration': '7 days'
        }
        
        response = self.client.post('/api/prescriptions',
                                   data=json.dumps(prescription_data),
                                   content_type='application/json')
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['medication_name'], 'Amoxicillin')
    
    def test_create_allergy(self):
        """Test creating an allergy record"""
        # First create a patient
        patient_data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'date_of_birth': '1990-01-15'
        }
        patient_response = self.client.post('/api/patients',
                                           data=json.dumps(patient_data),
                                           content_type='application/json')
        patient = json.loads(patient_response.data)
        
        # Create allergy
        allergy_data = {
            'patient_id': patient['id'],
            'allergen': 'Penicillin',
            'reaction': 'Rash',
            'severity': 'moderate'
        }
        
        response = self.client.post('/api/allergies',
                                   data=json.dumps(allergy_data),
                                   content_type='application/json')
        
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['allergen'], 'Penicillin')

if __name__ == '__main__':
    unittest.main()
