"""
UserFavorite model for Pearl Verse
Handles user favorites of marketplace items
"""

from . import db
from datetime import datetime


class UserFavorite(db.Model):
    """Model to track user favorites of marketplace items"""
    __tablename__ = 'marketplace_favorites'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    marketplace_item_id = db.Column(db.Integer, db.ForeignKey('marketplace_items.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    
    # Create a composite unique constraint to prevent duplicate favorites
    __table_args__ = (db.UniqueConstraint('user_id', 'marketplace_item_id', name='unique_user_item_favorite'),)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('favorites', lazy='dynamic'))
    marketplace_item = db.relationship('MarketplaceItem', backref=db.backref('favorited_by', lazy='dynamic'))
    
    def to_dict(self):
        """Convert UserFavorite object to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'marketplace_item_id': self.marketplace_item_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'marketplace_item': self.marketplace_item.to_dict() if self.marketplace_item else None
        }
    
    def __repr__(self):
        return f'<UserFavorite user_id={self.user_id} item_id={self.marketplace_item_id}>'
