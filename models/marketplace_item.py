from . import db
from datetime import datetime

class MarketplaceItem(db.Model):
    __tablename__ = 'marketplace_items'
    
    id = db.Column(db.Integer, primary_key=True)
    card_name = db.Column(db.String(100), nullable=False)
    card_series = db.Column(db.String(50), nullable=False)
    card_description = db.Column(db.Text, nullable=True)
    card_price = db.Column(db.Integer, nullable=False)  # Price in pearls
    image_path = db.Column(db.String(200), nullable=True)
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Additional fields that could be useful for a card marketplace
    rarity = db.Column(db.String(20), nullable=True)  # e.g., common, rare, epic, legendary, mythic
    category = db.Column(db.String(30), nullable=True)  # e.g., fantasy, sci-fi, nature, classic
    rating = db.Column(db.Float, default=4.5, nullable=True)  # Average rating
    is_popular = db.Column(db.Boolean, default=False)
    is_new = db.Column(db.Boolean, default=False)
    original_price = db.Column(db.Integer, nullable=True)  # For showing discounts
    
    def __init__(self, card_name, card_series, card_description, card_price, image_path=None, **kwargs):
        self.card_name = card_name
        self.card_series = card_series
        self.card_description = card_description
        self.card_price = card_price
        self.image_path = image_path
        
        # Set optional fields
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
    
    def to_dict(self):
        """Convert the model instance to a dictionary for JSON serialization"""
        return {
            'id': self.id,
            'card_name': self.card_name,
            'card_series': self.card_series,
            'card_description': self.card_description,
            'card_price': self.card_price,
            'image_path': self.image_path,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'rarity': self.rarity,
            'category': self.category,
            'rating': self.rating,
            'is_popular': self.is_popular,
            'is_new': self.is_new,
            'original_price': self.original_price
        }
    
    def __repr__(self):
        return f'<MarketplaceItem {self.card_name} - {self.card_series}>'
