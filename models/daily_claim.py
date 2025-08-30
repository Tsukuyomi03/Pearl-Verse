"""
DailyClaim model for Pearl Verse
Tracks user's daily login rewards and streak counters
"""

from . import db


class DailyClaim(db.Model):
    """Daily claim model for Pearl Verse"""
    __tablename__ = 'daily_claims'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    claim_date = db.Column(db.Date, nullable=False)
    day_number = db.Column(db.Integer, nullable=False)  # 1-7 for the 7-day cycle
    pearl_amount = db.Column(db.Integer, nullable=False)
    streak_count = db.Column(db.Integer, default=1)
    claimed_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    
    # Ensure one claim per user per date
    __table_args__ = (db.UniqueConstraint('user_id', 'claim_date', name='unique_user_claim_date'),)
    
    def to_dict(self):
        """Convert daily claim object to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'claim_date': self.claim_date.isoformat() if self.claim_date else None,
            'day_number': self.day_number,
            'pearl_amount': self.pearl_amount,
            'streak_count': self.streak_count,
            'claimed_at': self.claimed_at.isoformat() if self.claimed_at else None
        }
