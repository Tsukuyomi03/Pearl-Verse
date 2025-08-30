"""
User model for Pearl Verse
Handles user accounts, authentication, and profile information
"""

from . import db


class User(db.Model):
    """User model for Pearl Verse"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username = db.Column(db.String(50), nullable=False, unique=True)
    email = db.Column(db.String(100), nullable=False, unique=True)
    password = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    date_of_birth = db.Column(db.Date, nullable=True)
    referral_code = db.Column(db.String(20), unique=True)
    wallet_address = db.Column(db.String(255))
    pearl = db.Column(db.Integer, default=0)
    level = db.Column(db.Integer, default=1)
    exp = db.Column(db.Integer, default=0)
    bio = db.Column(db.Text)
    location = db.Column(db.String(100))
    website = db.Column(db.String(255))
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    updated_at = db.Column(db.TIMESTAMP, 
                          server_default=db.func.current_timestamp(),
                          onupdate=db.func.current_timestamp())
    
    # Relationship to daily claims
    daily_claims = db.relationship('DailyClaim', backref='user', lazy=True)
    
    def to_dict(self):
        """Convert user object to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'referral_code': self.referral_code,
            'wallet_address': self.wallet_address,
            'pearl': self.pearl,
            'level': self.level,
            'exp': self.exp,
            'bio': getattr(self, 'bio', None),
            'location': getattr(self, 'location', None),
            'website': getattr(self, 'website', None),
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
