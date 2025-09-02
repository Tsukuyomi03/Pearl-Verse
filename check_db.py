#!/usr/bin/env python3
"""
Script to check the current database table structure
"""

from app import app, db
from models import User
import sqlalchemy

def check_table_structure():
    with app.app_context():
        try:
            inspector = sqlalchemy.inspect(db.engine)
            
            # Check if users table exists
            if 'users' in inspector.get_table_names():
                print("Users table exists!")
                columns = inspector.get_columns('users')
                print("\nCurrent columns in users table:")
                for col in columns:
                    print(f"  - {col['name']}: {col['type']}")
                
                # Check specifically for birth fields
                column_names = [col['name'] for col in columns]
                birth_fields = ['birth_month', 'birth_day', 'birth_year']
                missing_fields = [field for field in birth_fields if field not in column_names]
                
                if missing_fields:
                    print(f"\nMissing birth fields: {missing_fields}")
                    print("These fields need to be added to the database.")
                else:
                    print("\nAll birth fields are present in the database.")
                    
            else:
                print("Users table does not exist!")
                
        except Exception as e:
            print(f"Error checking database: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    check_table_structure()
