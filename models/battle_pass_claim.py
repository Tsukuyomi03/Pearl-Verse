from datetime import datetime
import json
from . import db

class BattlePassClaim(db.Model):
    __tablename__ = 'battle_pass_claims'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    level = db.Column(db.Integer, nullable=False)
    reward_type = db.Column(db.String(50), nullable=False)
    reward_data = db.Column(db.JSON, nullable=True)
    pearls_awarded = db.Column(db.Integer, default=0)
    claimed_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    
    # Unique constraint on user_id and level combination
    __table_args__ = (
        db.UniqueConstraint('user_id', 'level', name='unique_user_level_claim'),
    )
    
    def __init__(self, user_id, level, reward_type, reward_data=None, pearls_awarded=0):
        self.user_id = user_id
        self.level = level
        self.reward_type = reward_type
        self.reward_data = reward_data
        self.pearls_awarded = pearls_awarded
    
    def to_dict(self):
        """Convert the claim record to a dictionary for JSON serialization"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'level': self.level,
            'reward_type': self.reward_type,
            'reward_data': self.reward_data,
            'pearls_awarded': self.pearls_awarded,
            'claimed_at': self.claimed_at.isoformat() if self.claimed_at else None
        }
    
    @staticmethod
    def get_user_claimed_levels(user_id):
        """Get all claimed levels for a specific user"""
        claims = BattlePassClaim.query.filter_by(user_id=user_id).all()
        return [claim.level for claim in claims]
    
    @staticmethod
    def is_level_claimed(user_id, level):
        """Check if a specific level has been claimed by a user"""
        claim = BattlePassClaim.query.filter_by(user_id=user_id, level=level).first()
        return claim is not None
    
    @staticmethod
    def get_user_total_pearl_rewards(user_id):
        """Get total pearls earned from battle pass claims"""
        total = db.session.query(db.func.sum(BattlePassClaim.pearls_awarded)).filter_by(user_id=user_id).scalar()
        return total or 0
    
    def __repr__(self):
        return f'<BattlePassClaim {self.user_id}-{self.level}: {self.reward_type}>'
