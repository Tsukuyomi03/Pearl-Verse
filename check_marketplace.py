#!/usr/bin/env python3
from app import app
from models import db, MarketplaceItem
from datetime import datetime

def check_marketplace_items():
    """Check existing marketplace items"""
    with app.app_context():
        items = MarketplaceItem.query.all()
        print(f"Total marketplace items: {len(items)}")
        
        if items:
            print("\nExisting items:")
            for item in items[:10]:  # Show first 10 items
                print(f"- {item.card_name}: {item.card_price} pearls ({item.category or 'no category'}, {item.rarity or 'no rarity'})")
        else:
            print("No marketplace items found.")
        
        return len(items)

def create_sample_marketplace_items():
    """Create sample marketplace items"""
    with app.app_context():
        try:
            # Sample marketplace items
            sample_items = [
                {
                    'card_name': 'Dragon Fire Collection',
                    'card_series': 'Mythic Beasts',
                    'card_description': 'A rare collection featuring powerful fire-breathing dragons from ancient realms.',
                    'card_price': 2500,
                    'category': 'fantasy',
                    'rarity': 'mythic',
                    'rating': 4.9,
                    'is_popular': True,
                    'is_new': True,
                    'original_price': 3000
                },
                {
                    'card_name': 'Ocean Depths Premium Set',
                    'card_series': 'Nature Elements',
                    'card_description': 'Dive deep into the mysteries of the ocean with this stunning water-themed collection.',
                    'card_price': 1800,
                    'category': 'nature',
                    'rarity': 'legendary',
                    'rating': 4.7,
                    'is_popular': True,
                    'is_new': True,
                    'original_price': 2200
                },
                {
                    'card_name': 'Cyber Nexus Cards',
                    'card_series': 'Future Tech',
                    'card_description': 'Experience the future with these high-tech cybernetic card designs.',
                    'card_price': 1200,
                    'category': 'sci-fi',
                    'rarity': 'epic',
                    'rating': 4.5,
                    'is_popular': False,
                    'is_new': True
                },
                {
                    'card_name': 'Ancient Ruins Explorer',
                    'card_series': 'Lost Civilizations',
                    'card_description': 'Uncover the secrets of ancient civilizations with this archaeological collection.',
                    'card_price': 950,
                    'category': 'classic',
                    'rarity': 'rare',
                    'rating': 4.3,
                    'is_popular': False,
                    'is_new': False
                },
                {
                    'card_name': 'Stellar Constellation Pack',
                    'card_series': 'Cosmic Wonders',
                    'card_description': 'Navigate the stars with this beautiful constellation-themed card set.',
                    'card_price': 1500,
                    'category': 'sci-fi',
                    'rarity': 'epic',
                    'rating': 4.6,
                    'is_popular': True,
                    'is_new': False,
                    'original_price': 1800
                },
                {
                    'card_name': 'Forest Guardian Spirit',
                    'card_series': 'Nature Elements',
                    'card_description': 'Commune with nature through these mystical forest spirit cards.',
                    'card_price': 700,
                    'category': 'nature',
                    'rarity': 'rare',
                    'rating': 4.2,
                    'is_popular': False,
                    'is_new': False
                },
                {
                    'card_name': 'Royal Court Collection',
                    'card_series': 'Medieval Kingdoms',
                    'card_description': 'Step into the royal courts with this elegant medieval-themed collection.',
                    'card_price': 1100,
                    'category': 'classic',
                    'rarity': 'epic',
                    'rating': 4.4,
                    'is_popular': False,
                    'is_new': False
                },
                {
                    'card_name': 'Neon City Nights',
                    'card_series': 'Urban Legends',
                    'card_description': 'Experience the vibrant energy of neon-lit cityscapes.',
                    'card_price': 600,
                    'category': 'sci-fi',
                    'rarity': 'common',
                    'rating': 4.1,
                    'is_popular': False,
                    'is_new': False
                },
                {
                    'card_name': 'Phoenix Rising Deluxe',
                    'card_series': 'Mythic Beasts',
                    'card_description': 'Witness the rebirth of the magnificent phoenix in this premium set.',
                    'card_price': 2200,
                    'category': 'fantasy',
                    'rarity': 'legendary',
                    'rating': 4.8,
                    'is_popular': True,
                    'is_new': False,
                    'original_price': 2600
                },
                {
                    'card_name': 'Desert Mirage Bundle',
                    'card_series': 'Ancient Sands',
                    'card_description': 'Journey through mysterious desert landscapes and hidden oases.',
                    'card_price': 800,
                    'category': 'classic',
                    'rarity': 'rare',
                    'rating': 4.0,
                    'is_popular': False,
                    'is_new': False
                },
                {
                    'card_name': 'Crystal Cave Treasures',
                    'card_series': 'Gemstone Realms',
                    'card_description': 'Discover sparkling treasures hidden within crystal caves.',
                    'card_price': 1350,
                    'category': 'fantasy',
                    'rarity': 'epic',
                    'rating': 4.5,
                    'is_popular': True,
                    'is_new': True
                },
                {
                    'card_name': 'Samurai Honor Code',
                    'card_series': 'Warrior Legends',
                    'card_description': 'Honor the way of the samurai with this traditional Japanese collection.',
                    'card_price': 1000,
                    'category': 'classic',
                    'rarity': 'rare',
                    'rating': 4.3,
                    'is_popular': False,
                    'is_new': False
                }
            ]
            
            created_count = 0
            for item_data in sample_items:
                # Check if item already exists
                existing = MarketplaceItem.query.filter_by(
                    card_name=item_data['card_name']
                ).first()
                
                if not existing:
                    new_item = MarketplaceItem(**item_data)
                    db.session.add(new_item)
                    created_count += 1
                    print(f"Created: {item_data['card_name']}")
                else:
                    print(f"Already exists: {item_data['card_name']}")
            
            db.session.commit()
            print(f"\nSuccessfully created {created_count} new marketplace items!")
            return created_count
            
        except Exception as e:
            db.session.rollback()
            print(f"Error creating sample items: {e}")
            return 0

if __name__ == "__main__":
    print("Checking marketplace items...")
    item_count = check_marketplace_items()
    
    if item_count == 0:
        print("\nCreating sample marketplace items...")
        create_sample_marketplace_items()
        print("\nRechecking after creation...")
        check_marketplace_items()
    else:
        print(f"\nFound {item_count} items. No need to create samples.")
