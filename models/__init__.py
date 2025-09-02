"""
Pearl Verse Models Package
Contains all database model classes for the Pearl Verse application
"""

from flask_sqlalchemy import SQLAlchemy

# Initialize SQLAlchemy (will be configured in app.py)
db = SQLAlchemy()

# Import all model classes
from .user import User
from .daily_claim import DailyClaim
from .referral import Referral
from .transaction import Transaction
from .transfer import Transfer
from .follow import Follow
from .social_media_link import SocialMediaLink
from .battle_pass_claim import BattlePassClaim

# Export all models for easy importing
__all__ = [
    'db',
    'User',
    'DailyClaim', 
    'Referral',
    'Transaction',
    'Transfer',
    'Follow',
    'SocialMediaLink',
    'BattlePassClaim',
]
