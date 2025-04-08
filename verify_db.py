from app import app, db, User

def verify_database():
    with app.app_context():
        try:
            # Get all users from the database
            users = User.query.all()
            print("\nCurrent users in database:")
            print("-" * 50)
            for user in users:
                print(f"ID: {user.id}")
                print(f"Username: {user.username}")
                print(f"Email: {user.email}")
                print("-" * 50)
            
            print(f"\nTotal users in database: {len(users)}")
            
        except Exception as e:
            print(f"Error: {str(e)}")

if __name__ == '__main__':
    verify_database()
