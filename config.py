import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Database configuration
    DB_USER = 'postgres'
    DB_PASSWORD = 'POSTGRES'  # Updated to match your pgAdmin password
    DB_HOST = 'localhost'
    DB_PORT = '5432'
    DB_NAME = 'healthcare_assistant'
    
    # SQLAlchemy configuration
    SQLALCHEMY_DATABASE_URI = f'postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Security
    SECRET_KEY = 'dev-secret-key-123'  # Fixed secret key for development
    
    # Google Maps API Key - Replace with your properly configured API key
    MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')  # Get from environment variable
