"""
Pearl Verse Referral System
Advanced referral tracking with rewards, monitoring, and analytics
"""

import hashlib
import secrets
import json
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum


class ReferralStatus(Enum):
    """Referral status enumeration"""
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    EXPIRED = "expired"
    FRAUD = "fraud"


class RewardTier(Enum):
    """Reward tier enumeration"""
    BRONZE = "bronze"
    SILVER = "silver" 
    GOLD = "gold"
    PLATINUM = "platinum"
    DIAMOND = "diamond"


@dataclass
class ReferralReward:
    """Referral reward data structure"""
    tier: RewardTier
    base_reward: int
    bonus_multiplier: float
    requirements: Dict[str, Any]


class ReferralCodeGenerator:
    """
    Advanced referral code generator with collision detection
    """
    
    # Character sets for different code types
    ALPHABET_NUMBERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    ALPHABET_ONLY = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    NUMBERS_ONLY = '0123456789'
    
    # Excluded characters to avoid confusion
    EXCLUDED_CHARS = {'0', 'O', '1', 'I', '5', 'S'}
    
    @staticmethod
    def generate_readable_code(
        length: int = 8, 
        use_numbers: bool = True,
        add_checksum: bool = True
    ) -> str:
        """Generate a human-readable referral code"""
        
        # Choose character set
        if use_numbers:
            charset = ''.join(c for c in ReferralCodeGenerator.ALPHABET_NUMBERS 
                            if c not in ReferralCodeGenerator.EXCLUDED_CHARS)
        else:
            charset = ''.join(c for c in ReferralCodeGenerator.ALPHABET_ONLY 
                            if c not in ReferralCodeGenerator.EXCLUDED_CHARS)
        
        # Generate base code
        base_code = ''.join(secrets.choice(charset) for _ in range(length))
        
        if add_checksum:
            # Add checksum for validation
            checksum_value = sum(charset.index(c) for c in base_code) % len(charset)
            checksum_char = charset[checksum_value]
            return base_code + checksum_char
        
        return base_code
    
    @staticmethod
    def generate_premium_code(user_id: int, timestamp: datetime = None) -> str:
        """Generate a premium referral code with user ID integration"""
        if timestamp is None:
            timestamp = datetime.utcnow()
        
        # Create seed from user ID and timestamp
        seed_data = f"{user_id}:{timestamp.isoformat()}:pearl_verse_premium"
        seed_hash = hashlib.sha256(seed_data.encode()).hexdigest()
        
        # Use first 16 hex characters
        hex_part = seed_hash[:16]
        
        # Convert to base36 for shorter, readable code
        base36_chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'
        code_value = int(hex_part, 16)
        
        # Convert to base36
        code = ""
        while code_value > 0:
            code = base36_chars[code_value % 36] + code
            code_value //= 36
        
        # Ensure minimum length and add prefix
        code = code.zfill(8)
        return f"PV{code}"
    
    @staticmethod
    def validate_code_checksum(code: str) -> bool:
        """Validate referral code checksum"""
        if not code or len(code) < 2:
            return False
        
        charset = ''.join(c for c in ReferralCodeGenerator.ALPHABET_NUMBERS 
                         if c not in ReferralCodeGenerator.EXCLUDED_CHARS)
        
        try:
            base_code = code[:-1]
            checksum_char = code[-1]
            
            # Calculate expected checksum
            checksum_value = sum(charset.index(c) for c in base_code) % len(charset)
            expected_checksum = charset[checksum_value]
            
            return checksum_char == expected_checksum
        except (ValueError, IndexError):
            return False


class ReferralRewardManager:
    """
    Manages referral rewards and tier progression
    """
    
    # Define reward tiers and their requirements
    REWARD_TIERS = {
        RewardTier.BRONZE: ReferralReward(
            tier=RewardTier.BRONZE,
            base_reward=1000,
            bonus_multiplier=1.0,
            requirements={'min_referrals': 0, 'min_referee_activity': 1}
        ),
        RewardTier.SILVER: ReferralReward(
            tier=RewardTier.SILVER,
            base_reward=1500,
            bonus_multiplier=1.2,
            requirements={'min_referrals': 5, 'min_referee_activity': 3}
        ),
        RewardTier.GOLD: ReferralReward(
            tier=RewardTier.GOLD,
            base_reward=2000,
            bonus_multiplier=1.5,
            requirements={'min_referrals': 15, 'min_referee_activity': 7}
        ),
        RewardTier.PLATINUM: ReferralReward(
            tier=RewardTier.PLATINUM,
            base_reward=3000,
            bonus_multiplier=2.0,
            requirements={'min_referrals': 50, 'min_referee_activity': 15}
        ),
        RewardTier.DIAMOND: ReferralReward(
            tier=RewardTier.DIAMOND,
            base_reward=5000,
            bonus_multiplier=3.0,
            requirements={'min_referrals': 100, 'min_referee_activity': 30}
        )
    }
    
    @staticmethod
    def calculate_reward(
        referral_count: int, 
        referee_activity_score: int,
        special_bonuses: List[str] = None
    ) -> Tuple[int, RewardTier]:
        """Calculate referral reward based on tier and bonuses"""
        
        # Determine tier based on referral count and activity
        current_tier = RewardTier.BRONZE
        
        for tier, reward in reversed(list(ReferralRewardManager.REWARD_TIERS.items())):
            if (referral_count >= reward.requirements['min_referrals'] and 
                referee_activity_score >= reward.requirements['min_referee_activity']):
                current_tier = tier
                break
        
        # Get base reward
        tier_reward = ReferralRewardManager.REWARD_TIERS[current_tier]
        base_amount = tier_reward.base_reward
        
        # Apply tier multiplier
        reward_amount = int(base_amount * tier_reward.bonus_multiplier)
        
        # Apply special bonuses
        if special_bonuses:
            for bonus in special_bonuses:
                if bonus == 'first_referral':
                    reward_amount = int(reward_amount * 1.5)  # 50% bonus for first referral
                elif bonus == 'weekend_bonus':
                    reward_amount = int(reward_amount * 1.2)  # 20% weekend bonus
                elif bonus == 'streak_bonus':
                    reward_amount = int(reward_amount * 1.3)  # 30% streak bonus
        
        return reward_amount, current_tier
    
    @staticmethod
    def get_next_tier_requirements(current_referrals: int, current_activity: int) -> Dict[str, Any]:
        """Get requirements for next tier advancement"""
        current_tier = RewardTier.BRONZE
        
        # Find current tier
        for tier, reward in reversed(list(ReferralRewardManager.REWARD_TIERS.items())):
            if (current_referrals >= reward.requirements['min_referrals'] and 
                current_activity >= reward.requirements['min_referee_activity']):
                current_tier = tier
                break
        
        # Find next tier
        tier_list = list(ReferralRewardManager.REWARD_TIERS.keys())
        current_index = tier_list.index(current_tier)
        
        if current_index < len(tier_list) - 1:
            next_tier = tier_list[current_index + 1]
            next_requirements = ReferralRewardManager.REWARD_TIERS[next_tier].requirements
            
            return {
                'current_tier': current_tier.value,
                'next_tier': next_tier.value,
                'referrals_needed': max(0, next_requirements['min_referrals'] - current_referrals),
                'activity_needed': max(0, next_requirements['min_referee_activity'] - current_activity),
                'next_reward': ReferralRewardManager.REWARD_TIERS[next_tier].base_reward
            }
        
        return {
            'current_tier': current_tier.value,
            'next_tier': None,
            'referrals_needed': 0,
            'activity_needed': 0,
            'next_reward': None,
            'max_tier_reached': True
        }


class ReferralTracker:
    """
    Advanced referral tracking and analytics
    """
    
    @staticmethod
    def calculate_activity_score(user_actions: Dict[str, Any]) -> int:
        """Calculate user activity score for referral rewards"""
        score = 0
        
        # Daily login score
        score += user_actions.get('daily_logins', 0) * 10
        
        # Pearl transactions
        score += min(user_actions.get('pearl_transactions', 0) * 5, 100)
        
        # Social interactions
        score += user_actions.get('posts_created', 0) * 15
        score += user_actions.get('comments_made', 0) * 5
        score += user_actions.get('likes_given', 0) * 2
        
        # Account age bonus (days since registration)
        account_age_days = user_actions.get('account_age_days', 0)
        if account_age_days > 30:
            score += 50  # 1 month bonus
        if account_age_days > 90:
            score += 100  # 3 month bonus
        
        return score
    
    @staticmethod
    def detect_referral_fraud(referral_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Detect potential referral fraud patterns"""
        fraud_indicators = []
        is_suspicious = False
        
        # Check for rapid referral creation
        referral_times = referral_data.get('referral_timestamps', [])
        if len(referral_times) > 1:
            rapid_referrals = 0
            for i in range(1, len(referral_times)):
                time_diff = referral_times[i] - referral_times[i-1]
                if time_diff < timedelta(minutes=5):
                    rapid_referrals += 1
            
            if rapid_referrals > 3:
                fraud_indicators.append("Multiple referrals created within minutes")
                is_suspicious = True
        
        # Check for similar IP addresses
        referee_ips = referral_data.get('referee_ip_addresses', [])
        if len(set(referee_ips)) < len(referee_ips) * 0.7:  # 70% unique IPs threshold
            fraud_indicators.append("Referrals from similar IP addresses")
            is_suspicious = True
        
        # Check for inactive referees
        referee_activities = referral_data.get('referee_activity_scores', [])
        inactive_count = sum(1 for score in referee_activities if score < 10)
        if len(referee_activities) > 0 and inactive_count / len(referee_activities) > 0.8:
            fraud_indicators.append("High percentage of inactive referees")
            is_suspicious = True
        
        # Check for suspicious patterns in usernames
        referee_usernames = referral_data.get('referee_usernames', [])
        similar_usernames = 0
        for i, username1 in enumerate(referee_usernames):
            for username2 in referee_usernames[i+1:]:
                if username1[:3] == username2[:3] or username1[-3:] == username2[-3:]:
                    similar_usernames += 1
        
        if similar_usernames > len(referee_usernames) * 0.3:
            fraud_indicators.append("Similar username patterns detected")
            is_suspicious = True
        
        return is_suspicious, fraud_indicators
    
    @staticmethod
    def generate_referral_analytics(referral_history: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate comprehensive referral analytics"""
        if not referral_history:
            return {
                'total_referrals': 0,
                'success_rate': 0,
                'average_activity_score': 0,
                'monthly_breakdown': {},
                'top_months': [],
                'referral_trends': []
            }
        
        # Basic statistics
        total_referrals = len(referral_history)
        active_referrals = sum(1 for ref in referral_history 
                              if ref.get('status') == ReferralStatus.ACTIVE.value)
        success_rate = (active_referrals / total_referrals) * 100 if total_referrals > 0 else 0
        
        # Activity scores
        activity_scores = [ref.get('activity_score', 0) for ref in referral_history]
        average_activity_score = sum(activity_scores) / len(activity_scores) if activity_scores else 0
        
        # Monthly breakdown
        monthly_breakdown = {}
        for referral in referral_history:
            created_at = referral.get('created_at')
            if created_at:
                try:
                    # Handle both string and datetime objects
                    if isinstance(created_at, str):
                        date_obj = datetime.fromisoformat(created_at.replace('Z', '+00:00'))
                    else:
                        date_obj = created_at
                    
                    month_key = date_obj.strftime('%Y-%m')
                    monthly_breakdown[month_key] = monthly_breakdown.get(month_key, 0) + 1
                except (ValueError, AttributeError):
                    pass
        
        # Top months
        top_months = sorted(monthly_breakdown.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Referral trends (last 6 months)
        current_date = datetime.utcnow()
        referral_trends = []
        for i in range(6):
            month_date = current_date - timedelta(days=30 * i)
            month_key = month_date.strftime('%Y-%m')
            count = monthly_breakdown.get(month_key, 0)
            referral_trends.append({
                'month': month_key,
                'count': count,
                'month_name': month_date.strftime('%B %Y')
            })
        
        referral_trends.reverse()  # Show chronologically
        
        return {
            'total_referrals': total_referrals,
            'active_referrals': active_referrals,
            'success_rate': round(success_rate, 2),
            'average_activity_score': round(average_activity_score, 2),
            'monthly_breakdown': monthly_breakdown,
            'top_months': top_months,
            'referral_trends': referral_trends
        }


class ReferralNotificationManager:
    """
    Manages referral-related notifications and communications
    """
    
    @staticmethod
    def generate_referral_success_message(
        referrer_name: str, 
        referee_name: str, 
        reward_amount: int
    ) -> Dict[str, str]:
        """Generate success messages for both referrer and referee"""
        
        referrer_message = {
            'title': 'Referral Bonus Earned! 🎉',
            'message': f"Congratulations! {referee_name} has joined Pearl Verse using your referral code. You've earned {reward_amount} pearls!",
            'type': 'success'
        }
        
        referee_message = {
            'title': 'Welcome Bonus! 💎',
            'message': f"Welcome to Pearl Verse! Thanks to {referrer_name}'s referral, you've received {reward_amount} bonus pearls to start your journey!",
            'type': 'welcome'
        }
        
        return {
            'referrer': referrer_message,
            'referee': referee_message
        }
    
    @staticmethod
    def generate_tier_upgrade_message(
        old_tier: RewardTier, 
        new_tier: RewardTier, 
        new_reward_amount: int
    ) -> Dict[str, str]:
        """Generate tier upgrade notification"""
        
        return {
            'title': f'Tier Upgrade: {new_tier.value.title()}! ⭐',
            'message': f"Amazing! You've been upgraded from {old_tier.value.title()} to {new_tier.value.title()} tier. Your referral rewards are now {new_reward_amount} pearls per successful referral!",
            'type': 'tier_upgrade'
        }
    
    @staticmethod
    def generate_milestone_message(milestone: int, total_pearls_earned: int) -> Dict[str, str]:
        """Generate milestone achievement message"""
        
        milestones = {
            5: "Referral Rookie",
            10: "Referral Champion", 
            25: "Referral Master",
            50: "Referral Legend",
            100: "Referral God"
        }
        
        title = milestones.get(milestone, "Referral Achievement")
        
        return {
            'title': f'{title} Unlocked! 🏆',
            'message': f"Incredible! You've successfully referred {milestone} users to Pearl Verse and earned a total of {total_pearls_earned} pearls from referrals!",
            'type': 'milestone'
        }


# Utility functions for easy integration
def create_referral_code_for_user(
    user_id: int, 
    username: str, 
    premium: bool = False
) -> str:
    """Create a referral code for a user"""
    if premium:
        return ReferralCodeGenerator.generate_premium_code(user_id)
    else:
        # Generate readable code with username hint
        base_code = ReferralCodeGenerator.generate_readable_code(6, add_checksum=False)
        # Add first 2 letters of username if possible
        username_prefix = ''.join(c.upper() for c in username[:2] if c.isalpha())
        if username_prefix:
            return f"{username_prefix}{base_code}"
        return ReferralCodeGenerator.generate_readable_code(8, add_checksum=True)

def validate_referral_code(referral_code: str) -> bool:
    """Validate referral code format"""
    if not referral_code:
        return False
    
    # Check premium code format
    if referral_code.startswith('PV'):
        return len(referral_code) == 10 and referral_code[2:].isalnum()
    
    # Check standard code format
    return ReferralCodeGenerator.validate_code_checksum(referral_code)

def calculate_referral_rewards(
    referrer_referral_count: int,
    referrer_activity_score: int, 
    is_first_referral: bool = False,
    is_weekend: bool = False
) -> Tuple[int, int]:  # Returns (referrer_reward, referee_reward)
    """Calculate rewards for both referrer and referee"""
    
    special_bonuses = []
    if is_first_referral:
        special_bonuses.append('first_referral')
    if is_weekend:
        special_bonuses.append('weekend_bonus')
    
    referrer_reward, tier = ReferralRewardManager.calculate_reward(
        referrer_referral_count,
        referrer_activity_score,
        special_bonuses
    )
    
    # Referee always gets base reward (1000 pearls)
    referee_reward = 1000
    if is_first_referral:
        referee_reward = int(referee_reward * 1.2)  # 20% bonus for referee too
    
    return referrer_reward, referee_reward

def get_referral_leaderboard(referral_data: List[Dict[str, Any]], limit: int = 10) -> List[Dict[str, Any]]:
    """Generate referral leaderboard"""
    
    # Sort by referral count and activity score
    sorted_data = sorted(
        referral_data,
        key=lambda x: (x.get('referral_count', 0), x.get('total_pearls_earned', 0)),
        reverse=True
    )
    
    leaderboard = []
    for i, user_data in enumerate(sorted_data[:limit]):
        leaderboard.append({
            'rank': i + 1,
            'username': user_data.get('username', 'Anonymous'),
            'referral_count': user_data.get('referral_count', 0),
            'total_pearls_earned': user_data.get('total_pearls_earned', 0),
            'tier': user_data.get('tier', RewardTier.BRONZE.value),
            'success_rate': user_data.get('success_rate', 0)
        })
    
    return leaderboard
