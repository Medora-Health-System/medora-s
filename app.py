"""
Electronic Medical Record System - Main Application
"""
from flask import Flask, render_template
from flask_cors import CORS
from database import db

# Initialize Flask app and extensions
app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///emr.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'dev-secret-key-change-in-production'

CORS(app)
db.init_app(app)

# Import models and routes after db and app initialization
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
    # Note: Debug mode is enabled for development only
    # In production, set debug=False and use a proper WSGI server
    app.run(debug=True, host='0.0.0.0', port=5000)
