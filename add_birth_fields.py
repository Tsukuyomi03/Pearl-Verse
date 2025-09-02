#!/usr/bin/env python3
"""
Script to add missing birth fields to the users table
"""

from app import app, db
import sqlalchemy

def add_birth_fields():
    with app.app_context():
        try:
            # Add the missing columns using raw SQL
            with db.engine.connect() as connection:
                trans = connection.begin()
                try:
                    print("Adding birth_month column...")
                    connection.execute(sqlalchemy.text("ALTER TABLE users ADD COLUMN birth_month INTEGER"))
                    
                    print("Adding birth_day column...")
                    connection.execute(sqlalchemy.text("ALTER TABLE users ADD COLUMN birth_day INTEGER"))
                    
                    print("Adding birth_year column...")
                    connection.execute(sqlalchemy.text("ALTER TABLE users ADD COLUMN birth_year INTEGER"))
                    
                    trans.commit()
                    print("\nSuccessfully added all birth fields to users table!")
                    
                except Exception as e:
                    trans.rollback()
                    print(f"Error adding columns: {e}")
                    raise
                    
            # Verify the columns were added
            inspector = sqlalchemy.inspect(db.engine)
            columns = inspector.get_columns('users')
            column_names = [col['name'] for col in columns]
            
            birth_fields = ['birth_month', 'birth_day', 'birth_year']
            missing_fields = [field for field in birth_fields if field not in column_names]
            
            if missing_fields:
                print(f"Warning: Still missing fields: {missing_fields}")
            else:
                print("✓ All birth fields are now present in the database!")
                
        except Exception as e:
            print(f"Error updating database: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    add_birth_fields()
