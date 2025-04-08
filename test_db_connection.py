from app import app, db, User
from sqlalchemy import text

def test_database():
    with app.app_context():
        try:
            # Test database connection
            db.session.execute(text('SELECT 1'))
            print("Database connection successful!")

            # Create a test user
            test_user = User(
                username='testuser123',
                email='test123@example.com'
            )
            test_user.set_password('password123')
            
            # Add and commit
            db.session.add(test_user)
            db.session.commit()
            print(f"Test user created successfully!")

            # Verify user exists
            user = User.query.filter_by(username='testuser123').first()
            if user:
                print(f"User found in database: {user.username}")
                print(f"Password verification test:", user.check_password('password123'))
            else:
                print("Failed to retrieve user!")

        except Exception as e:
            print(f"Error: {str(e)}")
            db.session.rollback()

if __name__ == '__main__':
    test_database()
