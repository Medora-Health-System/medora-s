"""
Electronic Medical Record System - Main Application
"""
from flask import Flask, jsonify, request, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///emr.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'dev-secret-key-change-in-production'

CORS(app)
db = SQLAlchemy(app)

# Import models and routes after db initialization
from models import Patient, Provider, Appointment, MedicalRecord, Prescription, Allergy
from routes import register_routes

# Register all routes
register_routes(app, db)

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

def init_db():
    """Initialize the database"""
    with app.app_context():
        db.create_all()
        print("Database initialized successfully!")

if __name__ == '__main__':
    # Create database tables
    init_db()
    
    # Run the application
    app.run(debug=True, host='0.0.0.0', port=5000)
