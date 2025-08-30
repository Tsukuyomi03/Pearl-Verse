"""
Transaction model for Pearl Verse
Tracks pearl transfers and financial activities
"""

from . import db


class Transaction(db.Model):
    """Transaction tracking model for Pearl Verse"""
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    transaction_type = db.Column(db.String(50), nullable=False)  # 'daily_claim', 'referral_bonus', 'transfer_sent', 'transfer_received', etc.
    amount = db.Column(db.Integer, nullable=False)  # Can be negative for spending
    description = db.Column(db.String(255))
    related_user_id = db.Column(db.Integer, db.ForeignKey('users.id'))  # For transfers, referrals, etc.
    reference_id = db.Column(db.String(100))  # Reference to related record (claim_id, referral_id, etc.)
    created_at = db.Column(db.DateTime, default=db.func.current_timestamp(), nullable=False)
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='transactions')
    related_user = db.relationship('User', foreign_keys=[related_user_id])
    
    def to_dict(self):
        """Convert transaction object to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'transaction_type': self.transaction_type,
            'amount': self.amount,
            'description': self.description,
            'related_user_id': self.related_user_id,
            'reference_id': self.reference_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'related_username': self.related_user.username if self.related_user else None
        }
