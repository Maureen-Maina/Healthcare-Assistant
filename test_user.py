from app import app, db, User
from werkzeug.security import generate_password_hash

def test_create_user():
    with app.app_context():
        try:
            # First, check if test user exists and delete it
            existing_user = User.query.filter_by(username='test_user').first()
            if existing_user:
                print("Removing existing test user...")
                db.session.delete(existing_user)
                db.session.commit()

            # Create a test user
            test_user = User(
                username='test_user',
                email='test@example.com',
            )
            test_user.set_password('test123')  # This will hash the password

            # Add to database
            db.session.add(test_user)
            db.session.commit()
            print("Test user created successfully!")

            # Verify we can retrieve the user
            user = User.query.filter_by(username='test_user').first()
            if user:
                print(f"Retrieved user: {user.username} ({user.email})")
                print("Password verification test:", user.check_password('test123'))
            else:
                print("Failed to retrieve user!")

        except Exception as e:
            print(f"Error: {str(e)}")
            db.session.rollback()

if __name__ == '__main__':
    test_create_user()
