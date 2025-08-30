"""
Referral model for Pearl Verse
Tracks user referrals and bonus awards
"""

from . import db


class Referral(db.Model):
    """Referral tracking model for Pearl Verse"""
    __tablename__ = 'referrals'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    referrer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # User who referred
    referee_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)   # User who was referred
    referral_code_used = db.Column(db.String(20), nullable=False)
    bonus_awarded = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    
    # Relationships
    referrer = db.relationship('User', foreign_keys=[referrer_id], backref='referrals_made')
    referee = db.relationship('User', foreign_keys=[referee_id], backref='referred_by')
    
    # Ensure one referral record per referee (each user can only be referred once)
    __table_args__ = (db.UniqueConstraint('referee_id', name='unique_referee'),)
    
    def to_dict(self):
        """Convert referral object to dictionary"""
        return {
            'id': self.id,
            'referrer_id': self.referrer_id,
            'referee_id': self.referee_id,
            'referral_code_used': self.referral_code_used,
            'bonus_awarded': self.bonus_awarded,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'referrer_username': self.referrer.username if self.referrer else None,
            'referee_username': self.referee.username if self.referee else None
        }
