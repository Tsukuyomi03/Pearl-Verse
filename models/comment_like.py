"""
Comment like model for Pearl Verse
Tracks likes on comments
"""

from . import db


class CommentLike(db.Model):
    """Comment like tracking model for Pearl Verse"""
    __tablename__ = 'comment_likes'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    comment_id = db.Column(db.Integer, db.ForeignKey('comments.id'), nullable=False)
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    
    # Relationships
    user = db.relationship('User', backref='comment_likes')
    comment = db.relationship('Comment', backref='comment_likes')
    
    # Ensure one like per user per comment
    __table_args__ = (db.UniqueConstraint('user_id', 'comment_id', name='unique_user_comment_like'),)
    
    def to_dict(self):
        """Convert comment like object to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'comment_id': self.comment_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'username': self.user.username if self.user else None
        }
