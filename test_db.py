import psycopg2
from dotenv import load_dotenv
import os

load_dotenv()

# Get database credentials from environment variables
DB_USER = os.getenv('DB_USER')
DB_PASSWORD = os.getenv('DB_PASSWORD')
DB_HOST = os.getenv('DB_HOST')
DB_PORT = os.getenv('DB_PORT')
DB_NAME = os.getenv('DB_NAME')

def test_connection():
    try:
        # Try to connect
        conn = psycopg2.connect(
            dbname='postgres',  # First connect to default database
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Check if our database exists
        cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME,))
        exists = cursor.fetchone()
        
        if not exists:
            # Create database if it doesn't exist
            print(f"Creating database {DB_NAME}")
            cursor.execute(f'CREATE DATABASE {DB_NAME}')
            print(f"Database {DB_NAME} created successfully")
        else:
            print(f"Database {DB_NAME} already exists")
        
        # Close connection to postgres database
        conn.close()
        
        # Connect to our database
        conn = psycopg2.connect(
            dbname=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            host=DB_HOST,
            port=DB_PORT
        )
        print("Successfully connected to the database!")
        conn.close()
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == '__main__':
    print("Testing database connection...")
    print(f"Using credentials: {DB_USER}@{DB_HOST}:{DB_PORT}")
    test_connection()
