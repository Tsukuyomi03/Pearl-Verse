"""
Post model for Pearl Verse
Tracks user posts and social media content
"""

from . import db


class Post(db.Model):
    """Post model for Pearl Verse social features"""
    __tablename__ = 'posts'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)  # Caption/content of the post
    image_url = db.Column(db.String(255))  # Optional photos/image attachment
    feeling = db.Column(db.String(100))  # Optional feeling/mood
    location = db.Column(db.String(255))  # Optional location
    likes_count = db.Column(db.Integer, default=0)
    comments_count = db.Column(db.Integer, default=0)
    created_at = db.Column(db.TIMESTAMP, server_default=db.func.current_timestamp())
    updated_at = db.Column(db.TIMESTAMP, 
                          server_default=db.func.current_timestamp(),
                          onupdate=db.func.current_timestamp())
    
    # Relationships
    author = db.relationship('User', backref='posts')
    
    def to_dict(self):
        """Convert post object to dictionary"""
        # Get images for this post, ordered by image_order
        images = []
        try:
            # Try to access the images relationship
            if hasattr(self, 'images') and self.images is not None:
                images = [img.to_dict() for img in sorted(self.images, key=lambda x: x.image_order)]
            else:
                # Fallback: query PostImage directly if relationship not loaded
                from . import db
                from .post_image import PostImage
                post_images = PostImage.query.filter_by(post_id=self.id).order_by(PostImage.image_order).all()
                images = [img.to_dict() for img in post_images]
        except Exception as e:
            # If there's any issue, return empty images list
            print(f"Error loading images for post {self.id}: {e}")
            images = []
        
        return {
            'id': self.id,
            'user_id': self.user_id,
            'content': self.content,
            'image_url': self.image_url,  # Keep for backward compatibility
            'images': images,  # New multiple images support
            'feeling': self.feeling,
            'location': self.location,
            'likes_count': self.likes_count,
            'comments_count': self.comments_count,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'author_username': self.author.username if self.author else None,
            'author_name': f"{self.author.first_name} {self.author.last_name}" if self.author else None
        }
