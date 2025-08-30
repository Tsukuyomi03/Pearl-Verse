"""
Post reaction model for Pearl Verse
Tracks user reactions to posts (like, love, wow, etc.)
"""

from . import db


class PostReaction(db.Model):
    """Post reaction tracking model for Pearl Verse (like Facebook reactions)"""
    __tablename__ = 'post_reactions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=False)
    # Reaction types: like, love, haha, wow, sad, angry
    reaction = db.Column(db.String(20), nullable=False)
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    updated_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp(), onupdate=db.func.current_timestamp())

    # Relationships
    user = db.relationship('User', backref='post_reactions')
    post = db.relationship('Post', backref='post_reactions')

    # Ensure one reaction per user per post
    __table_args__ = (db.UniqueConstraint('user_id', 'post_id', name='unique_user_post_reaction'),)

    def to_dict(self):
        """Convert post reaction object to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'post_id': self.post_id,
            'reaction': self.reaction,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'username': self.user.username if self.user else None
        }
