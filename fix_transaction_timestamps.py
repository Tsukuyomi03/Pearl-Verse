#!/usr/bin/env python3
"""
Migration script to fix null created_at timestamps in transaction records
"""

from app import app
from models import db, Transaction
from datetime import datetime
import sys

def fix_transaction_timestamps():
    """Fix any transactions with null created_at timestamps"""
    with app.app_context():
        try:
            # Find transactions with null created_at
            null_transactions = Transaction.query.filter(Transaction.created_at.is_(None)).all()
            
            if not null_transactions:
                print("✓ No transactions with null timestamps found.")
                return True
            
            print(f"Found {len(null_transactions)} transactions with null created_at timestamps.")
            
            # Set a default timestamp for these transactions
            default_timestamp = datetime.now()
            
            for transaction in null_transactions:
                print(f"Fixing transaction ID {transaction.id} (type: {transaction.transaction_type})")
                transaction.created_at = default_timestamp
            
            # Commit the changes
            db.session.commit()
            
            print(f"✓ Successfully fixed {len(null_transactions)} transaction timestamps.")
            return True
            
        except Exception as e:
            print(f"✗ Error fixing transaction timestamps: {e}")
            db.session.rollback()
            return False

if __name__ == "__main__":
    print("Starting transaction timestamp fix...")
    success = fix_transaction_timestamps()
    
    if success:
        print("✓ Transaction timestamp fix completed successfully!")
        sys.exit(0)
    else:
        print("✗ Transaction timestamp fix failed!")
        sys.exit(1)
