"""
Comment model for Pearl Verse
Tracks comments on posts
"""

from . import db


class Comment(db.Model):
    """Comment model for Pearl Verse post comments"""
    __tablename__ = 'comments'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    likes_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    updated_at = db.Column(db.TIMESTAMP, 
                          server_default=db.func.current_timestamp(),
                          onupdate=db.func.current_timestamp())
    
    # Relationships
    author = db.relationship('User', backref='comments')
    post = db.relationship('Post', backref='comments')
    
    def to_dict(self):
        """Convert comment object to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'post_id': self.post_id,
            'content': self.content,
            'likes_count': self.likes_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'author_username': self.author.username if self.author else None,
            'author_name': f"{self.author.first_name} {self.author.last_name}" if self.author else None
        }
