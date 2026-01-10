# 🏥 Medora-S - Electronic Medical Record System

A comprehensive Electronic Medical Record (EMR) system built with Python Flask, providing healthcare providers with tools to manage patients, appointments, medical records, prescriptions, and more.

## Features

### Core Functionality
- **Patient Management**: Register and manage patient information including demographics, contact details, and emergency contacts
- **Provider Management**: Maintain healthcare provider information with specialties and credentials
- **Appointment Scheduling**: Schedule and track patient appointments with providers
- **Medical Records**: Comprehensive medical history tracking with diagnoses, symptoms, and treatments
- **Prescription Management**: Track medications, dosages, and prescription status
- **Allergy Tracking**: Record and monitor patient allergies and reactions

### Technical Features
- RESTful API architecture
- SQLite database for data persistence
- Responsive web interface
- Real-time dashboard with statistics
- CRUD operations for all entities
- Data validation and error handling

## Installation

### Prerequisites
- Python 3.7 or higher
- pip (Python package manager)

### Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/Vyrth/medora-s.git
cd medora-s
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Run the application:
```bash
python app.py
```

4. Access the application:
Open your web browser and navigate to `http://localhost:5000`

## API Documentation

### Patient Endpoints

#### Get All Patients
```
GET /api/patients
```

#### Get Specific Patient
```
GET /api/patients/<id>
```

#### Create Patient
```
POST /api/patients
Content-Type: application/json

{
  "first_name": "John",
  "last_name": "Doe",
  "date_of_birth": "1990-01-15",
  "gender": "Male",
  "email": "john.doe@example.com",
  "phone": "555-1234",
  "address": "123 Main St",
  "blood_type": "A+",
  "emergency_contact": "Jane Doe",
  "emergency_phone": "555-5678"
}
```

#### Update Patient
```
PUT /api/patients/<id>
Content-Type: application/json
```

#### Delete Patient
```
DELETE /api/patients/<id>
```

### Provider Endpoints

#### Get All Providers
```
GET /api/providers
```

#### Create Provider
```
POST /api/providers
Content-Type: application/json

{
  "first_name": "Dr. Jane",
  "last_name": "Smith",
  "specialty": "Cardiology",
  "license_number": "MD-12345",
  "email": "jane.smith@hospital.com",
  "phone": "555-5678"
}
```

### Appointment Endpoints

#### Get All Appointments
```
GET /api/appointments
```

#### Get Patient Appointments
```
GET /api/patients/<patient_id>/appointments
```

#### Create Appointment
```
POST /api/appointments
Content-Type: application/json

{
  "patient_id": 1,
  "provider_id": 1,
  "appointment_date": "2024-12-25T10:00",
  "reason": "Annual checkup",
  "status": "scheduled"
}
```

### Medical Record Endpoints

#### Get All Medical Records
```
GET /api/medical-records
```

#### Get Patient Medical Records
```
GET /api/patients/<patient_id>/medical-records
```

#### Create Medical Record
```
POST /api/medical-records
Content-Type: application/json

{
  "patient_id": 1,
  "provider_id": 1,
  "visit_date": "2024-12-20T14:30",
  "diagnosis": "Common cold",
  "symptoms": "Fever, cough, sore throat",
  "treatment": "Rest, fluids, over-the-counter medication",
  "notes": "Patient advised to return if symptoms worsen"
}
```

### Prescription Endpoints

#### Get All Prescriptions
```
GET /api/prescriptions
```

#### Get Patient Prescriptions
```
GET /api/patients/<patient_id>/prescriptions
```

#### Create Prescription
```
POST /api/prescriptions
Content-Type: application/json

{
  "patient_id": 1,
  "provider_id": 1,
  "medication_name": "Amoxicillin",
  "dosage": "500mg",
  "frequency": "Twice daily",
  "duration": "7 days",
  "instructions": "Take with food",
  "status": "active"
}
```

### Allergy Endpoints

#### Get All Allergies
```
GET /api/allergies
```

#### Get Patient Allergies
```
GET /api/patients/<patient_id>/allergies
```

#### Create Allergy
```
POST /api/allergies
Content-Type: application/json

{
  "patient_id": 1,
  "allergen": "Penicillin",
  "reaction": "Rash and itching",
  "severity": "moderate"
}
```

## Testing

Run the test suite:
```bash
python -m pytest test_emr.py
```

Or using unittest:
```bash
python test_emr.py
```

## Database Schema

The system uses the following main tables:
- **patients**: Patient demographic and contact information
- **providers**: Healthcare provider information
- **appointments**: Scheduled patient-provider appointments
- **medical_records**: Patient medical history and visit records
- **prescriptions**: Medication prescriptions
- **allergies**: Patient allergy information

## Project Structure

```
medora-s/
├── app.py                 # Main application file
├── models.py              # Database models
├── routes.py              # API routes
├── requirements.txt       # Python dependencies
├── test_emr.py           # Test suite
├── templates/
│   └── index.html        # Web interface
└── README.md             # This file
```

## Security Considerations

**⚠️ IMPORTANT**: This is a demonstration system. For production use:
- **Disable Debug Mode**: Set `debug=False` in `app.py`
- **Use HTTPS**: All communications must be encrypted
- **Implement Authentication**: Add user authentication and authorization
- **Use Production WSGI Server**: Deploy with Gunicorn, uWSGI, or similar
- **Encrypt Sensitive Data**: Encrypt patient data at rest and in transit
- **Implement Audit Logging**: Track all data access and modifications
- **Follow HIPAA Compliance**: Ensure all healthcare data regulations are met
- **Use Environment Variables**: Store secrets and configuration securely
- **Implement Rate Limiting**: Prevent API abuse
- **Add Input Sanitization**: Validate and sanitize all user inputs
- **Regular Security Audits**: Conduct periodic security assessments
- **Use Strong Secret Key**: Replace the default secret key with a secure random value

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is provided as-is for educational and demonstration purposes.

## Support

For issues and questions, please open an issue on the GitHub repository.
