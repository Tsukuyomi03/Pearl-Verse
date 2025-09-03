"""
Avatar Shop Item Model
Represents items available in the avatar customization shop
"""

from . import db
from datetime import datetime


class AvatarShopItem(db.Model):
    """Model for avatar shop items (banners, avatars, decorations)"""
    
    __tablename__ = 'avatar_shop_items'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    category_id = db.Column(db.Integer, nullable=False)  # 1=banner, 2=avatar, 3=decoration
    rarity_id = db.Column(db.Integer, nullable=False)    # 1=common, 2=rare, 3=epic, 4=legendary, 5=mythic
    file_path = db.Column(db.String(500), nullable=False)
    file_name = db.Column(db.String(255), nullable=False)
    file_extension = db.Column(db.String(10), nullable=False)
    price = db.Column(db.Integer, nullable=False)
    currency = db.Column(db.String(20), nullable=False, default='pearls')
    description = db.Column(db.Text, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f'<AvatarShopItem {self.name} ({self.get_category_name()})>'
    
    def get_category_name(self):
        """Get category name from category_id"""
        categories = {1: 'banner', 2: 'avatar', 3: 'decoration'}
        return categories.get(self.category_id, 'unknown')
    
    def get_rarity_name(self):
        """Get rarity name from rarity_id"""
        rarities = {1: 'common', 2: 'rare', 3: 'epic', 4: 'legendary', 5: 'mythic'}
        return rarities.get(self.rarity_id, 'common')
    
    def get_full_file_path(self):
        """Get the full file path for web serving using Flask url_for"""
        # Return path relative to static folder for use with url_for('static', filename=...)
        return f"images/avatar_shop/{self.get_category_name()}s/{self.file_name}"
    
    def get_full_url(self):
        """Get the full URL for direct use in templates/API responses"""
        try:
            from flask import url_for
            return url_for('static', filename=self.get_full_file_path())
        except RuntimeError:
            # Fallback when outside request context
            return f"/static/{self.get_full_file_path()}"
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'name': self.name,
            'category': self.get_category_name(),
            'category_id': self.category_id,
            'rarity': self.get_rarity_name(),
            'rarity_id': self.rarity_id,
            'price': self.price,
            'currency': self.currency,
            'description': self.description,
            'image': self.get_full_url(),
            'file_name': self.file_name,
            'file_extension': self.file_extension,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class UserAvatarItem(db.Model):
    """Model for tracking user's owned avatar items"""
    
    __tablename__ = 'user_avatar_items'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    avatar_item_id = db.Column(db.Integer, db.ForeignKey('avatar_shop_items.id'), nullable=False)
    is_equipped = db.Column(db.Boolean, nullable=False, default=False)
    purchased_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    purchased_price = db.Column(db.Integer, nullable=False)  # Store the price they paid
    
    # Relationships
    user = db.relationship('User', backref=db.backref('avatar_items', lazy=True))
    avatar_item = db.relationship('AvatarShopItem', backref=db.backref('owners', lazy=True))
    
    # Unique constraint to prevent duplicate ownership
    __table_args__ = (db.UniqueConstraint('user_id', 'avatar_item_id', name='unique_user_avatar_item'),)
    
    def __repr__(self):
        return f'<UserAvatarItem User:{self.user_id} Item:{self.avatar_item_id}>'
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'avatar_item_id': self.avatar_item_id,
            'is_equipped': self.is_equipped,
            'purchased_at': self.purchased_at.isoformat() if self.purchased_at else None,
            'purchased_price': self.purchased_price,
            'avatar_item': self.avatar_item.to_dict() if self.avatar_item else None
        }


class UserAvatarConfiguration(db.Model):
    """Model for storing user's current avatar configuration"""
    
    __tablename__ = 'user_avatar_configurations'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    banner_item_id = db.Column(db.Integer, db.ForeignKey('avatar_shop_items.id'), nullable=True)
    avatar_item_id = db.Column(db.Integer, db.ForeignKey('avatar_shop_items.id'), nullable=True)
    decoration_item_id = db.Column(db.Integer, db.ForeignKey('avatar_shop_items.id'), nullable=True)
    updated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', backref=db.backref('avatar_configuration', uselist=False))
    banner_item = db.relationship('AvatarShopItem', foreign_keys=[banner_item_id])
    avatar_item = db.relationship('AvatarShopItem', foreign_keys=[avatar_item_id])
    decoration_item = db.relationship('AvatarShopItem', foreign_keys=[decoration_item_id])
    
    def __repr__(self):
        return f'<UserAvatarConfiguration User:{self.user_id}>'
    
    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'banner_item': self.banner_item.to_dict() if self.banner_item else None,
            'avatar_item': self.avatar_item.to_dict() if self.avatar_item else None,
            'decoration_item': self.decoration_item.to_dict() if self.decoration_item else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
