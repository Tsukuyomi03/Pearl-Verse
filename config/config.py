"""
Pearl Verse Database Configuration
This file contains all the database configuration settings for the Pearl Verse application.
"""

import os
from urllib.parse import quote_plus

class Config:
    """Base configuration class"""
    
    # Database Configuration
    DB_HOST = os.environ.get('DB_HOST', 'localhost')
    DB_PORT = os.environ.get('DB_PORT', 3306)
    DB_USER = os.environ.get('DB_USER', 'root')
    DB_PASSWORD = os.environ.get('DB_PASSWORD', 'Faith@030419')
    DB_NAME = os.environ.get('DB_NAME', 'pearl_verse')
    
    # SQLAlchemy Configuration
    @property
    def SQLALCHEMY_DATABASE_URI(self):
        """Construct the database URI"""
        password = quote_plus(self.DB_PASSWORD) if self.DB_PASSWORD else ''
        password_part = f":{password}" if password else ""
        
        return f"mysql+pymysql://{self.DB_USER}{password_part}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}?charset=utf8mb4"
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_recycle': 300,
        'pool_pre_ping': True,
        'pool_size': 10,
        'max_overflow': 20
    }
    
    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-this-in-production')
    DEBUG = os.environ.get('DEBUG', 'True').lower() == 'true'
    
    # Application Configuration
    APP_NAME = 'Pearl Verse'
    APP_VERSION = '1.0.0'

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    TESTING = False
    
    # MySQL Configuration - using existing pearl_verse database
    DB_HOST = 'localhost'
    DB_PORT = 3306
    DB_USER = 'root'
    # Inherit password from base Config (or env). Do NOT override with empty string.
    # If you want to hardcode for local dev, uncomment the next line and set it.
    # DB_PASSWORD = 'Faith@030419'
    DB_NAME = 'pearl_verse'

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    TESTING = False
    
    # Override for production - require environment variables only if actually in production
    @property
    def DB_PASSWORD(self):
        password = os.environ.get('DB_PASSWORD')
        if not password and os.environ.get('FLASK_ENV') == 'production':
            raise ValueError("DB_PASSWORD environment variable is required in production")
        return password or ''  # Default to empty string for XAMPP
    
    @property 
    def SECRET_KEY(self):
        secret = os.environ.get('SECRET_KEY')
        if not secret and os.environ.get('FLASK_ENV') == 'production':
            raise ValueError("SECRET_KEY environment variable is required in production")
        return secret or 'your-secret-key-change-this-in-production'

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DB_NAME = 'pearl_verse_test'
    SECRET_KEY = 'testing-secret-key'

# Configuration dictionary
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}

def get_config(config_name=None):
    """Get configuration based on environment"""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'default')
    
    return config.get(config_name, config['default'])
