"""
PostImage model for Pearl Verse
Handles multiple image attachments per post
"""

from . import db


class PostImage(db.Model):
    """PostImage model for storing multiple images per post"""
    __tablename__ = 'post_images'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id', ondelete='CASCADE'), nullable=False)
    image_url = db.Column(db.String(255), nullable=False)  # Path to the uploaded image
    image_order = db.Column(db.Integer, default=0)  # Order of images in the post
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    
    # Relationships
    post = db.relationship('Post', backref='images')
    
    def to_dict(self):
        """Convert post image object to dictionary"""
        return {
            'id': self.id,
            'post_id': self.post_id,
            'image_url': self.image_url,
            'image_order': self.image_order,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
