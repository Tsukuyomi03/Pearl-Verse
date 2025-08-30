"""
Follow model for Pearl Verse
Tracks user follow relationships
"""

from . import db


class Follow(db.Model):
    """Follow relationship model for Pearl Verse"""
    __tablename__ = 'follows'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    follower_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)  # User who follows
    following_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False) # User being followed
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    
    # Relationships
    follower = db.relationship('User', foreign_keys=[follower_id], backref='following_relationships')
    following = db.relationship('User', foreign_keys=[following_id], backref='follower_relationships')
    
    # Prevent self-follows and duplicate follows
    __table_args__ = (
        db.UniqueConstraint('follower_id', 'following_id', name='unique_follow'),
        db.CheckConstraint('follower_id != following_id', name='no_self_follow')
    )
    
    def to_dict(self):
        """Convert follow object to dictionary"""
        return {
            'id': self.id,
            'follower_id': self.follower_id,
            'following_id': self.following_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'follower_username': self.follower.username if self.follower else None,
            'following_username': self.following.username if self.following else None
        }
