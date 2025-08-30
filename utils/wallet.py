"""
Pearl Verse Wallet Utilities
Advanced wallet system with Web3-style addresses and cryptographic functions
"""

import hashlib
import secrets
import hmac
import base64
import json
from typing import Optional, Dict, Any, Tuple
from datetime import datetime
from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from Crypto.Util.Padding import pad, unpad
import binascii


class WalletGenerator:
    """
    Advanced wallet generation system for Pearl Verse
    Creates Web3-style wallet addresses with cryptographic security
    """
    
    @staticmethod
    def generate_private_key() -> str:
        """Generate a secure 256-bit private key"""
        return secrets.token_hex(32)
    
    @staticmethod
    def private_key_to_public_key(private_key: str) -> str:
        """
        Convert private key to public key using SHA-256 hashing
        In a real Web3 implementation, this would use ECDSA
        """
        private_key_bytes = bytes.fromhex(private_key)
        
        # Use HMAC-SHA256 for deterministic public key generation
        public_key = hmac.new(
            b'pearl_verse_public_key_salt',
            private_key_bytes,
            hashlib.sha256
        ).hexdigest()
        
        return public_key
    
    @staticmethod
    def public_key_to_address(public_key: str) -> str:
        """
        Convert public key to Pearl Verse wallet address
        Format: pearl:0x{40_hex_characters}
        """
        # Hash the public key
        public_key_bytes = bytes.fromhex(public_key)
        address_hash = hashlib.sha256(public_key_bytes).hexdigest()
        
        # Take first 40 characters (20 bytes) like Ethereum
        address_hex = address_hash[:40]
        
        # Add Pearl Verse prefix
        return f"pearl:0x{address_hex}"
    
    @staticmethod
    def generate_wallet() -> Dict[str, str]:
        """
        Generate a complete wallet with private key, public key, and address
        Returns: {private_key, public_key, address}
        """
        private_key = WalletGenerator.generate_private_key()
        public_key = WalletGenerator.private_key_to_public_key(private_key)
        address = WalletGenerator.public_key_to_address(public_key)
        
        return {
            'private_key': private_key,
            'public_key': public_key,
            'address': address,
            'created_at': datetime.utcnow().isoformat()
        }
    
    @staticmethod
    def validate_address(address: str) -> bool:
        """Validate Pearl Verse wallet address format"""
        if not address or not isinstance(address, str):
            return False
        
        # Check format: pearl:0x{40_hex_characters}
        if not address.startswith('pearl:0x'):
            return False
        
        hex_part = address[8:]  # Remove 'pearl:0x' prefix
        
        # Check length (40 hex characters = 20 bytes)
        if len(hex_part) != 40:
            return False
        
        # Check if all characters are valid hex
        try:
            int(hex_part, 16)
            return True
        except ValueError:
            return False
    
    @staticmethod
    def generate_checksum(address: str) -> str:
        """Generate checksum for address verification"""
        if not WalletGenerator.validate_address(address):
            raise ValueError("Invalid address format")
        
        address_bytes = address.encode('utf-8')
        checksum = hashlib.sha256(address_bytes).hexdigest()[:8]
        return checksum
    
    @staticmethod
    def verify_checksum(address: str, checksum: str) -> bool:
        """Verify address checksum"""
        try:
            calculated_checksum = WalletGenerator.generate_checksum(address)
            return calculated_checksum == checksum
        except ValueError:
            return False


class WalletSecurity:
    """
    Wallet security utilities for encryption and key management
    """
    
    @staticmethod
    def encrypt_private_key(private_key: str, password: str) -> Dict[str, str]:
        """
        Encrypt private key with user password
        Returns encrypted data with salt and IV
        """
        # Generate salt and IV
        salt = get_random_bytes(16)
        iv = get_random_bytes(16)
        
        # Derive key from password and salt
        key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
        
        # Encrypt private key
        cipher = AES.new(key, AES.MODE_CBC, iv)
        padded_data = pad(private_key.encode(), AES.block_size)
        encrypted_data = cipher.encrypt(padded_data)
        
        return {
            'encrypted_private_key': base64.b64encode(encrypted_data).decode(),
            'salt': base64.b64encode(salt).decode(),
            'iv': base64.b64encode(iv).decode()
        }
    
    @staticmethod
    def decrypt_private_key(encrypted_data: Dict[str, str], password: str) -> Optional[str]:
        """
        Decrypt private key with user password
        Returns decrypted private key or None if decryption fails
        """
        try:
            # Decode encrypted components
            encrypted_private_key = base64.b64decode(encrypted_data['encrypted_private_key'])
            salt = base64.b64decode(encrypted_data['salt'])
            iv = base64.b64decode(encrypted_data['iv'])
            
            # Derive key from password and salt
            key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
            
            # Decrypt private key
            cipher = AES.new(key, AES.MODE_CBC, iv)
            padded_data = cipher.decrypt(encrypted_private_key)
            private_key = unpad(padded_data, AES.block_size).decode()
            
            return private_key
            
        except Exception as e:
            print(f"Decryption error: {e}")
            return None
    
    @staticmethod
    def generate_wallet_backup_phrase(private_key: str) -> str:
        """
        Generate a backup phrase for wallet recovery
        Uses BIP39-like word generation
        """
        # Simple word list (in production, use official BIP39 word list)
        word_list = [
            'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract',
            'absurd', 'abuse', 'access', 'accident', 'account', 'accuse', 'achieve', 'acid',
            'acoustic', 'acquire', 'across', 'action', 'actor', 'actress', 'actual', 'adapt',
            'add', 'addict', 'address', 'adjust', 'admit', 'adult', 'advance', 'advice',
            'aerobic', 'affair', 'afford', 'afraid', 'again', 'agent', 'agree', 'ahead',
            'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert',
            'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already',
            'also', 'alter', 'always', 'amateur', 'amazing', 'among', 'amount', 'amused',
            'analyst', 'anchor', 'ancient', 'anger', 'angle', 'angry', 'animal', 'ankle',
            'announce', 'annual', 'another', 'answer', 'antenna', 'antique', 'anxiety', 'any',
            'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arcade', 'arch',
            'arctic', 'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army',
            'around', 'arrange', 'arrest', 'arrive', 'arrow', 'art', 'artist', 'artwork',
            'ask', 'aspect', 'assault', 'asset', 'assist', 'assume', 'asthma', 'athlete',
            'atom', 'attack', 'attend', 'attitude', 'attract', 'auction', 'audit', 'august',
            'aunt', 'author', 'auto', 'autumn', 'average', 'avocado', 'avoid', 'awake',
            'aware', 'away', 'awesome', 'awful', 'awkward', 'axis', 'baby', 'bachelor'
        ]
        
        # Generate entropy from private key
        entropy = hashlib.sha256(private_key.encode()).digest()
        
        # Convert entropy to word indices
        words = []
        for i in range(0, len(entropy), 2):
            index = int.from_bytes(entropy[i:i+2], 'big') % len(word_list)
            words.append(word_list[index])
        
        return ' '.join(words[:12])  # Return 12 words


class TransactionSigner:
    """
    Transaction signing utilities for Pearl Verse
    """
    
    @staticmethod
    def create_transaction_hash(transaction_data: Dict[str, Any]) -> str:
        """Create hash for transaction verification"""
        # Convert transaction data to deterministic string
        transaction_str = json.dumps(transaction_data, sort_keys=True)
        transaction_hash = hashlib.sha256(transaction_str.encode()).hexdigest()
        return transaction_hash
    
    @staticmethod
    def sign_transaction(transaction_data: Dict[str, Any], private_key: str) -> str:
        """Sign transaction with private key"""
        transaction_hash = TransactionSigner.create_transaction_hash(transaction_data)
        
        # Create signature using HMAC
        private_key_bytes = bytes.fromhex(private_key)
        signature = hmac.new(
            private_key_bytes,
            transaction_hash.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    @staticmethod
    def verify_transaction_signature(
        transaction_data: Dict[str, Any], 
        signature: str, 
        public_key: str
    ) -> bool:
        """Verify transaction signature"""
        try:
            transaction_hash = TransactionSigner.create_transaction_hash(transaction_data)
            
            # Recreate signature with public key
            public_key_bytes = bytes.fromhex(public_key)
            expected_signature = hmac.new(
                public_key_bytes,
                transaction_hash.encode(),
                hashlib.sha256
            ).hexdigest()
            
            return signature == expected_signature
        except Exception:
            return False


class WalletValidator:
    """
    Wallet validation utilities
    """
    
    @staticmethod
    def validate_transaction_amount(amount: int, max_amount: int = 1000000) -> Tuple[bool, str]:
        """Validate transaction amount"""
        if not isinstance(amount, int):
            return False, "Amount must be an integer"
        
        if amount <= 0:
            return False, "Amount must be greater than 0"
        
        if amount > max_amount:
            return False, f"Amount cannot exceed {max_amount} pearls"
        
        return True, "Valid amount"
    
    @staticmethod
    def validate_wallet_balance(current_balance: int, transaction_amount: int) -> Tuple[bool, str]:
        """Validate if wallet has sufficient balance"""
        if current_balance < transaction_amount:
            return False, "Insufficient balance"
        
        return True, "Sufficient balance"
    
    @staticmethod
    def detect_suspicious_activity(
        transaction_history: list, 
        new_transaction_amount: int
    ) -> Tuple[bool, str]:
        """Detect potentially suspicious transaction patterns"""
        if not transaction_history:
            return False, "No suspicious activity"
        
        # Check for rapid successive large transactions
        recent_transactions = transaction_history[-10:]  # Last 10 transactions
        large_transactions = [t for t in recent_transactions if t.get('amount', 0) > 10000]
        
        if len(large_transactions) >= 5:
            return True, "Multiple large transactions detected"
        
        # Check for unusual transaction amount
        if new_transaction_amount > 50000:
            return True, "Unusually large transaction amount"
        
        return False, "No suspicious activity"


# Utility functions for easy integration
def generate_unique_wallet_address() -> str:
    """Generate a unique Pearl Verse wallet address"""
    wallet_data = WalletGenerator.generate_wallet()
    return wallet_data['address']

def validate_wallet_address(address: str) -> bool:
    """Validate wallet address format"""
    return WalletGenerator.validate_address(address)

def create_wallet_for_user(user_id: int) -> Dict[str, str]:
    """Create complete wallet data for a new user"""
    wallet_data = WalletGenerator.generate_wallet()
    
    # Add user-specific metadata
    wallet_data['user_id'] = user_id
    wallet_data['checksum'] = WalletGenerator.generate_checksum(wallet_data['address'])
    
    return wallet_data

def generate_secure_referral_code(length: int = 8) -> str:
    """Generate a secure referral code"""
    # Use a mix of uppercase letters and numbers for readability
    alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    referral_code = ''.join(secrets.choice(alphabet) for _ in range(length))
    
    # Add checksum character for validation
    checksum = sum(ord(c) for c in referral_code) % len(alphabet)
    referral_code += alphabet[checksum]
    
    return referral_code

def validate_referral_code_format(referral_code: str) -> bool:
    """Validate referral code format and checksum"""
    if not referral_code or len(referral_code) != 9:
        return False
    
    # Check if all characters are valid
    valid_chars = set('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
    if not all(c in valid_chars for c in referral_code):
        return False
    
    # Validate checksum
    code_part = referral_code[:-1]
    checksum_char = referral_code[-1]
    
    alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    expected_checksum = sum(ord(c) for c in code_part) % len(alphabet)
    expected_checksum_char = alphabet[expected_checksum]
    
    return checksum_char == expected_checksum_char
