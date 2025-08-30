"""
Social media link model for Pearl Verse
Tracks user social media profiles and links
"""

from . import db


class SocialMediaLink(db.Model):
    """Social media links model for Pearl Verse user profiles"""
    __tablename__ = 'social_media_links'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    platform = db.Column(db.String(50), nullable=False)  # 'twitter', 'instagram', 'linkedin', etc.
    url = db.Column(db.String(500), nullable=False)  # The social media profile URL or handle
    display_name = db.Column(db.String(100))  # Optional display name for the link
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    updated_at = db.Column(db.TIMESTAMP, 
                          server_default=db.func.current_timestamp(),
                          onupdate=db.func.current_timestamp())
    
    # Relationships
    user = db.relationship('User', backref='social_media_links')
    
    # Ensure one link per platform per user (user can't have duplicate Twitter links, etc.)
    __table_args__ = (db.UniqueConstraint('user_id', 'platform', name='unique_user_platform'),)
    
    def to_dict(self):
        """Convert social media link object to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'platform': self.platform,
            'url': self.url,
            'display_name': self.display_name,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
