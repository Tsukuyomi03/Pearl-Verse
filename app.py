from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from config import get_config
from models import db, User, DailyClaim, Referral, Transaction, Transfer, Follow, SocialMediaLink, BattlePassClaim, AvatarShopItem, UserAvatarItem, UserAvatarConfiguration, MarketplaceItem, UserFavorite
import os
import re
import string
import secrets
import uuid
from PIL import Image

# Import our advanced wallet and referral systems
try:
    from utils.wallet import (
        generate_unique_wallet_address,
        validate_wallet_address,
        create_wallet_for_user,
        WalletGenerator,
        WalletValidator,
        TransactionSigner
    )
    from utils.referral import (
        create_referral_code_for_user,
        validate_referral_code,
        calculate_referral_rewards,
        ReferralRewardManager,
        ReferralTracker,
        ReferralNotificationManager
    )
except ImportError:
    def generate_unique_wallet_address():
        return f'pearl:0x{secrets.token_hex(20)}'
    def validate_wallet_address(address):
        return address.startswith('pearl:0x') and len(address) == 50
    def create_wallet_for_user(user_id):
        return {'address': generate_unique_wallet_address(), 'user_id': user_id}
    def create_referral_code_for_user(user_id, username, premium=False):
        return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))

# Initialize Flask app
app = Flask(__name__)

# Load configuration
config_name = os.environ.get('FLASK_ENV', 'development')
config_class = get_config(config_name)
config_instance = config_class()
app.config.from_object(config_instance)

# Set the database URI explicitly since it's a property
app.config['SQLALCHEMY_DATABASE_URI'] = config_instance.SQLALCHEMY_DATABASE_URI

# Session configuration for better persistence
app.config['SESSION_COOKIE_HTTPONLY'] = False  # Allow JavaScript access for debugging
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False  # Not using HTTPS in development
app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 hours

# Initialize SQLAlchemy with app
db.init_app(app)

# Add datetime import
from datetime import datetime, date, timedelta

# Upload configuration
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

# Make sure upload directory exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Utility Functions
def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_username(username):
    """Validate username format"""
    if len(username) < 3 or len(username) > 20:
        return False
    # Allow alphanumeric and underscores only
    pattern = r'^[a-zA-Z0-9_]+$'
    return re.match(pattern, username) is not None

def validate_password(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one number"
    return True, "Password is strong"

# Image upload utility functions
def allowed_file(filename):
    """Check if file has allowed extension"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def process_image(file):
    """Process and resize image if necessary"""
    try:
        # Open image with PIL
        image = Image.open(file.stream)
        
        # Convert RGBA to RGB if necessary
        if image.mode == 'RGBA':
            background = Image.new('RGB', image.size, (255, 255, 255))
            background.paste(image, mask=image.split()[-1])
            image = background
        
        # Resize if too large (max 1200x1200)
        max_size = (1200, 1200)
        if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
        
        return image
    except Exception as e:
        return None

def save_uploaded_file(file, user_id):
    """Save uploaded file and return the URL path"""
    try:
        if not allowed_file(file.filename):
            return None, "Invalid file type"
        
        processed_image = process_image(file)
        if processed_image is None:
            return None, "Error processing image"
        
        file_extension = file.filename.rsplit('.', 1)[1].lower()
        unique_filename = f"{user_id}_{uuid.uuid4().hex[:8]}.{file_extension}"
        file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
        
        processed_image.save(file_path, format='JPEG' if file_extension in ['jpg', 'jpeg'] else file_extension.upper(), quality=85)
        
        url_path = f"/uploads/{unique_filename}"
        return url_path, None
        
    except Exception as e:
        return None, "Error saving file"
    
def generate_referral_code():
    """Generate a unique referral code"""
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))

def generate_wallet_address():
    """Generate a unique wallet address"""
    return f'pearl:0x{secrets.token_hex(20)}'

def validate_referral_code(referral_code):
    """Validate and return user with given referral code"""
    return User.query.filter_by(referral_code=referral_code.upper()).first()

# Level calculation functions
def calculate_exp_for_level(level):
    """Calculate cumulative EXP needed to reach a specific level"""
    if level <= 1:
        return 0
    
    # Calculate cumulative EXP thresholds
    # Level 1: 0 EXP (starting point)
    # Level 2: 1000 EXP total needed
    # Level 3: 2500 EXP total needed (1000 + 1500)
    # Level 4: 4500 EXP total needed (1000 + 1500 + 2000)
    total_exp = 0
    for i in range(1, level):
        total_exp += 1000 + (i - 1) * 500  # Level 1->2 needs 1000, 2->3 needs 1500, etc.
    return total_exp

def calculate_level_from_exp(total_exp):
    """Calculate what level a user should be based on their total EXP"""
    if total_exp < 1000:
        return 1
    
    # Start from level 2 and work up
    level = 2
    while True:
        exp_needed = calculate_exp_for_level(level + 1)
        if total_exp < exp_needed:
            return level
        level += 1
        # Safety check to prevent infinite loop
        if level > 1000:
            return 1000

def check_level_up_and_reset_exp(user):
    """Check if user should level up - FIXED to maintain total cumulative EXP"""
    original_level = user.level
    total_exp = user.exp  # This is now always total cumulative EXP
    
    # Calculate what level the user should be based on cumulative EXP
    new_level = calculate_level_from_exp(total_exp)
    level_ups = 0
    
    if new_level > original_level:
        # User leveled up (possibly multiple times)!
        level_ups = new_level - original_level
        user.level = new_level
        
        # IMPORTANT: Keep total cumulative EXP intact - don't reset it
        # user.exp remains the same (total cumulative EXP)
        
        if level_ups == 1:
            print(f"User {user.id} leveled up from {original_level} to {new_level}! Total EXP: {total_exp}")
        else:
            print(f"User {user.id} jumped {level_ups} levels from {original_level} to {new_level}! Total EXP: {total_exp}")
    elif new_level < original_level:
        # Handle case where level needs to be corrected downward (data inconsistency)
        print(f"User {user.id} level corrected from {original_level} to {new_level} based on EXP: {total_exp}")
        user.level = new_level
    
    return level_ups, original_level, new_level





@app.route('/')
def index():
    """Main landing page"""
    # If user is already logged in, redirect to dashboard
    if session.get('logged_in'):
        return redirect('/pearl_dashboard')
    
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Login route"""
    # If user is already logged in, redirect to dashboard
    if request.method == 'GET' and session.get('logged_in'):
        return redirect('/pearl_dashboard')
    
    if request.method == 'POST':
        try:
            # Get form data
            username = request.form.get('username', '').strip()
            password = request.form.get('password', '')
            
            # Basic validation
            if not username:
                return jsonify({
                    'success': False,
                    'message': 'Username or email is required'
                }), 400
            
            if not password:
                return jsonify({
                    'success': False,
                    'message': 'Password is required'
                }), 400
            
            # Find user by email or username
            user = None
            
            # Check if login identifier is an email
            if '@' in username:
                user = User.query.filter_by(email=username.lower()).first()
            else:
                user = User.query.filter_by(username=username.lower()).first()
            
            if not user:
                return jsonify({
                    'success': False,
                    'message': 'Invalid username/email or password'
                }), 401
            
            # Check password
            if not check_password_hash(user.password, password):
                return jsonify({
                    'success': False,
                    'message': 'Invalid username/email or password'
                }), 401
            
            # Login successful - create session
            session['user_id'] = user.id
            session['username'] = user.username
            session['logged_in'] = True
            
            # Return success response
            return jsonify({
                'success': True, 
                'message': f'Welcome back, {user.first_name}!',
                'redirect': '/pearl_dashboard'
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'message': 'An error occurred during login. Please try again.'
            }), 500
    
    return render_template('login.html')

@app.route('/register', methods=['GET'])
def register():
    """Register route - only GET for displaying the form"""
    # If user is already logged in, redirect to dashboard
    if session.get('logged_in'):
        return redirect('/pearl_dashboard')
    
    return render_template('register.html')

@app.route('/dashboard')
def dashboard():
    """Dashboard route - redirect to Pearl Dashboard"""
    return redirect(url_for('pearl_dashboard'))

@app.route('/pearl_dashboard')
def pearl_dashboard():
    """Pearl Verse Dashboard - main user dashboard"""
    # Check if user is logged in
    if not session.get('logged_in'):
        return redirect('/login')
    
    return render_template('pearl_dashboard.html')

@app.route('/pearl_settings')
def pearl_settings():
    """Pearl Verse Settings - user settings page"""
    return render_template('pearl_settings.html')

@app.route('/settings')
def settings():
    """Settings page - redirect to Pearl Settings"""
    return redirect(url_for('pearl_settings'))

@app.route('/pearl_avatar_shop')
def pearl_avatar_shop():
    """Pearl Verse Avatar Shop - avatar customization page"""
    # Check if user is logged in
    if not session.get('logged_in'):
        return redirect('/login')
    
    return render_template('pearl_avatar_shop.html')

@app.route('/avatar_shop')
def avatar_shop():
    """Avatar shop page - redirect to Pearl Avatar Shop"""
    return redirect(url_for('pearl_avatar_shop'))

@app.route('/market')
def market():
    """Pearl Verse Market - redirect to Pearl Market"""
    return redirect(url_for('pearl_market'))

@app.route('/pearl_market')
def pearl_market():
    """Pearl Verse Market - trading and marketplace for card sets"""
    # Check if user is logged in
    if not session.get('logged_in'):
        return redirect('/login')
    
    import time
    cache_buster = str(int(time.time()))
    return render_template('pearl_market.html', cache_buster=cache_buster)

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    """Serve uploaded files"""
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/login', methods=['POST'])
def api_login():
    """API endpoint for user login - Simple for debugging"""
    try:
        # Get JSON data from request
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        # Extract and validate required fields
        login_identifier = data.get('loginIdentifier', '').strip()
        password = data.get('password', '')
        
        # Basic validation
        if not login_identifier:
            return jsonify({
                'success': False,
                'message': 'Email or username is required'
            }), 400
        
        if not password:
            return jsonify({
                'success': False,
                'message': 'Password is required'
            }), 400
        
        # Find user by email or username
        user = None
        
        # Check if login identifier is an email
        if '@' in login_identifier:
            user = User.query.filter_by(email=login_identifier.lower()).first()
        else:
            user = User.query.filter_by(username=login_identifier.lower()).first()
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'Invalid email/username or password'
            }), 401
        
        if not check_password_hash(user.password, password):
            return jsonify({
                'success': False,
                'message': 'Invalid email/username or password'
            }), 401
        
        session['user_id'] = user.id
        session['username'] = user.username
        session['logged_in'] = True
        
        return jsonify({
            'success': True,
            'message': f'Welcome back, {user.first_name}!',
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'pearl': user.pearl,
                'level': user.level,
                'exp': user.exp,
                'referral_code': user.referral_code,
                'wallet_address': user.wallet_address
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'An error occurred during login. Please try again.'
        }), 500

@app.route('/api/session-debug', methods=['GET'])
def api_session_debug():
    """Debug endpoint to check session status"""
    try:
        session_data = {
            'logged_in': session.get('logged_in', False),
            'user_id': session.get('user_id'),
            'username': session.get('username'),
            'session_keys': list(session.keys()),
            'session_id': request.cookies.get('session', 'No session cookie')
        }
        
        return jsonify({
            'success': True,
            'session': session_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/current-user', methods=['GET'])
def api_current_user():
    """API endpoint to get current user data"""
    try:
        if not session.get('logged_in'):
            return jsonify({'success': False, 'message': 'Not logged in'}), 401
        
        user_id = session.get('user_id')
        
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
    
        user_data = {
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'pearl': user.pearl,
                'level': user.level,
                'exp': user.exp,
                'referral_code': user.referral_code,
                'wallet_address': user.wallet_address,
                'bio': getattr(user, 'bio', None),
                'location': getattr(user, 'location', None),
                'website': getattr(user, 'website', None),
                'date_of_birth': user.date_of_birth.isoformat() if user.date_of_birth else None,
                'birth_month': user.birth_month,
                'birth_day': user.birth_day,
                'birth_year': user.birth_year,
                'created_at': user.created_at.isoformat() if user.created_at else None
            }
        }
        return jsonify(user_data), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching user data.'
        }), 500


@app.route('/api/logout', methods=['POST'])
def api_logout():
    try:
        session.clear()
        return jsonify({
            'success': True,
            'message': 'Logged out successfully',
            'debug': {
                'session_cleared': True,
                'timestamp': datetime.now().isoformat()
            }
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'An error occurred during logout',
            'debug': {
                'error': str(e)
            }
        }), 500

@app.route('/api/register', methods=['POST'])
def api_register():
    """API endpoint for user registration"""
    try:
        # Get JSON data from request
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        # Extract and validate required fields
        required_fields = ['firstName', 'lastName', 'username', 'email', 'password']
        for field in required_fields:
            field_value = data.get(field)
            if not field_value or (isinstance(field_value, str) and not field_value.strip()):
                return jsonify({
                    'success': False, 
                    'message': f'{field.replace("_", " ").title()} is required'
                }), 400
        
        # Clean the data
        first_name = (data.get('firstName') or '').strip().upper()  # Convert to uppercase
        last_name = (data.get('lastName') or '').strip().upper()   # Convert to uppercase
        username = (data.get('username') or '').strip().lower()
        email = (data.get('email') or '').strip().lower()
        password = data.get('password') or ''
        
        # Handle date of birth - support both combined and separate fields
        date_of_birth_str = (data.get('dateOfBirth') or '').strip()
        birth_year = data.get('birthYear')
        birth_month = data.get('birthMonth') 
        birth_day = data.get('birthDay')
        
        # If separate fields are provided, combine them
        if not date_of_birth_str and birth_year and birth_month and birth_day:
            try:
                # Validate the separate fields
                year = int(birth_year)
                month = int(birth_month)
                day = int(birth_day)
                
                # Basic range validation
                if not (1900 <= year <= datetime.now().year):
                    return jsonify({
                        'success': False,
                        'message': 'Please enter a valid birth year'
                    }), 400
                
                if not (1 <= month <= 12):
                    return jsonify({
                        'success': False,
                        'message': 'Please enter a valid birth month'
                    }), 400
                
                if not (1 <= day <= 31):
                    return jsonify({
                        'success': False,
                        'message': 'Please enter a valid birth day'
                    }), 400
                
                # Format as YYYY-MM-DD
                date_of_birth_str = f"{year}-{month:02d}-{day:02d}"
                
            except (ValueError, TypeError):
                return jsonify({
                    'success': False,
                    'message': 'Please enter valid numeric values for birth date'
                }), 400
        
        # Validate that we have a date of birth in some form
        if not date_of_birth_str:
            return jsonify({
                'success': False,
                'message': 'Date of birth is required'
            }), 400
        
        # Validate email format
        if not validate_email(email):
            return jsonify({
                'success': False,
                'message': 'Please enter a valid email address'
            }), 400
        
        # Validate username format
        if not validate_username(username):
            return jsonify({
                'success': False,
                'message': 'Username must be 3-20 characters and contain only letters, numbers, and underscores'
            }), 400
        
        # Validate password strength
        password_valid, password_message = validate_password(password)
        if not password_valid:
            return jsonify({
                'success': False,
                'message': password_message
            }), 400
        
        # Validate and parse date of birth
        try:
            date_of_birth = datetime.strptime(date_of_birth_str, '%Y-%m-%d').date()
            
            # Additional validation to ensure the date is actually valid
            # (datetime.strptime might accept some invalid dates)
            if (date_of_birth.year != int(date_of_birth_str.split('-')[0]) or 
                date_of_birth.month != int(date_of_birth_str.split('-')[1]) or 
                date_of_birth.day != int(date_of_birth_str.split('-')[2])):
                raise ValueError("Invalid date components")
            
            # Check if user is at least 13 years old
            today = date.today()
            age = today.year - date_of_birth.year - ((today.month, today.day) < (date_of_birth.month, date_of_birth.day))
            if age < 13:
                return jsonify({
                    'success': False,
                    'message': 'You must be at least 13 years old to register'
                }), 400
                
            # Check if date is not in the future
            if date_of_birth > today:
                return jsonify({
                    'success': False,
                    'message': 'Birth date cannot be in the future'
                }), 400
                
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Please enter a valid date of birth (YYYY-MM-DD format)'
            }), 400
        
        # Check if username already exists
        existing_username = User.query.filter_by(username=username).first()
        if existing_username:
            return jsonify({
                'success': False,
                'message': 'Username is already taken. Please choose another one.'
            }), 400
        
        # Check if email already exists
        existing_email = User.query.filter_by(email=email).first()
        if existing_email:
            return jsonify({
                'success': False,
                'message': 'An account with this email already exists. Please use a different email or login.'
            }), 400
        
        # Hash the password
        hashed_password = generate_password_hash(password)
        
        # Generate unique referral code and wallet address
        referral_code = generate_referral_code()
        wallet_address = generate_wallet_address()
        
        # Check for referral code
        referrer = None
        referral_bonus_awarded = False
        used_referral_code = (data.get('referralCode') or '').strip()
        
        if used_referral_code:
            referrer = validate_referral_code(used_referral_code)
            if not referrer:
                return jsonify({
                    'success': False,
                    'message': 'Invalid referral code. Please check and try again.'
                }), 400
        
        # Create new user with starting bonus
        starting_pearls = 1000  # Base starting bonus
        new_user = User(
            username=username,
            email=email,
            password=hashed_password,
            first_name=first_name,
            last_name=last_name,
            date_of_birth=date_of_birth,
            birth_year=int(birth_year) if birth_year else None,
            birth_month=int(birth_month) if birth_month else None,
            birth_day=int(birth_day) if birth_day else None,
            referral_code=referral_code,
            wallet_address=wallet_address,
            pearl=starting_pearls,
            level=1,
            exp=0
        )
        
        # Add user to database
        db.session.add(new_user)
        db.session.flush()  # Get the user ID without committing
        
        # Award referral bonuses if referral code was used
        if referrer:
            try:
                # Award 1000 pearls to both users, but 500 EXP only to referrer
                referrer.pearl += 1000
                referrer.exp += 500  # Only referrer gets EXP bonus
                new_user.pearl += 1000
                # new_user does NOT get EXP bonus
                referral_bonus_awarded = True
                
                # Check for level ups after EXP bonus (only referrer might level up)
                referrer_level_ups, referrer_old_level, referrer_new_level = check_level_up_and_reset_exp(referrer)
                # No need to check level up for new user since they don't get EXP
                
                # Create referral record
                referral_record = Referral(
                    referrer_id=referrer.id,
                    referee_id=new_user.id,
                    referral_code_used=used_referral_code.upper(),
                    bonus_awarded=True
                )
                db.session.add(referral_record)
                
                # Create transaction records for both users
                referrer_transaction = Transaction(
                    user_id=referrer.id,
                    transaction_type='referral_bonus',
                    amount=1000,
                    description=f'Referral bonus for referring {new_user.username} (+1000 pearls, +500 EXP)',
                    related_user_id=new_user.id,
                    reference_id=f'REF-{int(datetime.now().timestamp())}-{referrer.id}'
                )
                
                referee_transaction = Transaction(
                    user_id=new_user.id,
                    transaction_type='referral_bonus',
                    amount=1000,
                    description=f'Referral bonus for using {referrer.username} referral code (+1000 pearls)',
                    related_user_id=referrer.id,
                    reference_id=f'REF-{int(datetime.now().timestamp())}-{new_user.id}'
                )
                
                db.session.add(referrer_transaction)
                db.session.add(referee_transaction)
                
            except Exception as e:
                print(f"Error awarding referral bonus: {e}")
        
        # Commit all changes
        db.session.commit()
        
        # Prepare success message
        success_message = 'Account created successfully! Welcome to Pearl Verse!'
        if referral_bonus_awarded:
            success_message += f' You earned 1000 bonus pearls and your referrer earned 1000 pearls + 500 EXP!'
        
        # Return success response (don't include sensitive data)
        return jsonify({
            'success': True,
            'message': success_message,
            'user': {
                'id': new_user.id,
                'username': new_user.username,
                'first_name': new_user.first_name,
                'last_name': new_user.last_name,
                'email': new_user.email,
                'referral_code': new_user.referral_code,
                'wallet_address': new_user.wallet_address,
                'pearl': new_user.pearl,
                'level': new_user.level,
                'referral_bonus': referral_bonus_awarded
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Registration error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'An error occurred during registration. Please try again.',
            'error_details': str(e) if app.config.get('DEBUG') else None
        }), 500

@app.route('/api/preview-card')
def preview_card():
    """API endpoint for rare card preview"""
    card_data = {
        'name': 'Shadow Valkyrie',
        'rarity': 'Legendary',
        'image': '/static/images/shadow-valkyrie.jpg',
        'description': 'A mysterious warrior from the shadow realm, wielding ancient magic.',
        'stats': {
            'attack': 95,
            'defense': 87,
            'magic': 92
        }
    }
    return jsonify(card_data)

@app.route('/api/debug/session', methods=['GET'])
def debug_session():
    """Debug endpoint to check session status"""
    return jsonify({
        'session_data': dict(session),
        'logged_in': session.get('logged_in', False),
        'user_id': session.get('user_id'),
        'username': session.get('username'),
        'session_id': request.cookies.get('session'),
        'cookies': dict(request.cookies)
    })

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        db.session.execute(db.text('SELECT 1'))
        db_status = 'healthy'
    except Exception as e:
        db_status = f'error: {str(e)}'
    
    return jsonify({
        'status': 'healthy' if db_status == 'healthy' else 'unhealthy',
        'database': db_status,
        'config': config_name,
        'app_name': app.config['APP_NAME'],
        'version': app.config['APP_VERSION']
    })

@app.route('/api/users', methods=['GET'])
def get_users():
    """Get all users"""
    try:
        users = User.query.all()
        return jsonify({
            'users': [user.to_dict() for user in users],
            'count': len(users)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/users', methods=['POST'])
def create_user():
    """Create a new user"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'first_name', 'last_name']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing required field: {field}'}), 400
        
        # Create new user
        user = User(
            username=data['username'],
            email=data['email'],
            password=data['password'],  # In production, hash this password!
            first_name=data['first_name'],
            last_name=data['last_name'],
            referral_code=data.get('referral_code'),
            wallet_address=data.get('wallet_address'),
            pearl=data.get('pearl', 0),
            level=data.get('level', 1),
            exp=data.get('exp', 0)
        )
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'message': 'User created successfully',
            'user': user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user(user_id):
    """Get a specific user"""
    try:
        user = db.session.get(User, user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(user.to_dict())
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Daily Claim API Routes
@app.route('/api/daily-claim/status', methods=['GET'])
def get_daily_claim_status():
    """Get the current daily claim status for the logged-in user"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to view your daily claim status'
            }), 401
        
        user_id = session['user_id']
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        today = date.today()
        
        # Get the user's recent claims (last 7 days)
        claims = DailyClaim.query.filter(
            DailyClaim.user_id == user_id,
            DailyClaim.claim_date >= (today - timedelta(days=7))
        ).order_by(DailyClaim.claim_date.desc()).all()
        
        # Check if user has already claimed today
        today_claim = DailyClaim.query.filter(
            DailyClaim.user_id == user_id,
            DailyClaim.claim_date == today
        ).first()
        
        # Calculate current streak
        current_streak = 1
        if claims:
            # Get the most recent claim
            latest_claim = claims[0]
            
            # If the latest claim was today, use that streak
            if latest_claim.claim_date == today:
                current_streak = latest_claim.streak_count
            # If the latest claim was yesterday, continue the streak
            elif latest_claim.claim_date == today - timedelta(days=1):
                current_streak = latest_claim.streak_count + 1
            else:
                # Streak broken, start from 1
                current_streak = 1
        
        # Ensure streak doesn't exceed 7 (reset cycle)
        if current_streak > 7:
            current_streak = 1
        
        # Define reward amounts for each day (1-7)
        reward_amounts = {
            1: 500,
            2: 750,
            3: 1000,
            4: 1500,
            5: 2000,
            6: 3000,
            7: 5000
        }
        
        # Define EXP reward amounts for each day (1-7)
        exp_amounts = {
            1: 100,
            2: 100,
            3: 100,
            4: 100,
            5: 100,
            6: 100,
            7: 500  # Bonus EXP on day 7
        }
        
        # Create 7-day status array based on current streak position
        claim_status = []
        for day in range(1, 8):
            # Determine if this day has been claimed in the current cycle
            day_claimed = False
            
            # If current streak is greater than or equal to this day, it's claimed
            if not today_claim:  # Haven't claimed today yet
                day_claimed = day < current_streak
            else:  # Already claimed today
                day_claimed = day <= current_streak
            
            # Determine if this is the current day to claim
            is_current_day = False
            can_claim = False
            
            if not today_claim:  # Haven't claimed today yet
                is_current_day = day == current_streak
                can_claim = day == current_streak
            else:  # Already claimed today
                is_current_day = day == current_streak
                can_claim = False
            
            claim_status.append({
                'day': day,
                'date': today.isoformat(),  # Use today's date for reference
                'claimed': day_claimed,
                'reward': reward_amounts[day],
                'exp_reward': exp_amounts[day],
                'is_today': is_current_day,
                'can_claim': can_claim
            })
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'current_pearl_balance': user.pearl,
            'current_streak': current_streak,
            'claimed_today': bool(today_claim),
            'next_reward': reward_amounts[current_streak] if current_streak <= 7 else reward_amounts[1],
            'claim_status': claim_status,
            'recent_claims': [claim.to_dict() for claim in claims[:7]]
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching claim status'
        }), 500

@app.route('/api/daily-claim/claim', methods=['POST'])
def claim_daily_reward():
    """Claim the daily reward for the logged-in user with improved atomic transaction handling"""
    # Start a new transaction to ensure atomicity
    db.session.begin()
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to claim your daily reward'
            }), 401
        
        user_id = session['user_id']
        # Use SELECT FOR UPDATE to lock the user record and prevent race conditions
        user = User.query.filter_by(id=user_id).with_for_update().first()
        
        if not user:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        today = date.today()
        
        # Double-check if user has already claimed today (with lock to prevent race conditions)
        existing_claim = DailyClaim.query.filter(
            DailyClaim.user_id == user_id,
            DailyClaim.claim_date == today
        ).with_for_update().first()
        
        if existing_claim:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': 'You have already claimed your daily reward today. Come back tomorrow!',
                'already_claimed': True
            }), 400
        
        # Get the most recent claim to calculate streak
        latest_claim = DailyClaim.query.filter(
            DailyClaim.user_id == user_id
        ).order_by(DailyClaim.claim_date.desc()).first()
        
        current_streak = 1
        if latest_claim:
            # If the latest claim was yesterday, continue the streak
            if latest_claim.claim_date == today - timedelta(days=1):
                current_streak = latest_claim.streak_count + 1
            else:
                # Streak broken, start from 1
                current_streak = 1
        
        # Ensure streak doesn't exceed 7 (reset cycle)
        if current_streak > 7:
            current_streak = 1
        
        # Define reward amounts for each day (1-7)
        reward_amounts = {
            1: 500,
            2: 750,
            3: 1000,
            4: 1500,
            5: 2000,
            6: 3000,
            7: 5000
        }
        
        # Define EXP reward amounts for each day (1-7)
        exp_amounts = {
            1: 100,
            2: 100,
            3: 100,
            4: 100,
            5: 100,
            6: 100,
            7: 500  # Bonus EXP on day 7
        }
        
        pearl_reward = reward_amounts[current_streak]
        exp_reward = exp_amounts[current_streak]
        
        # Store original balance for verification
        original_balance = user.pearl
        
        # Create the daily claim record
        new_claim = DailyClaim(
            user_id=user_id,
            claim_date=today,
            day_number=current_streak,
            pearl_amount=pearl_reward,
            exp_amount=exp_reward,
            streak_count=current_streak
        )
        
        # Store original EXP for verification
        original_exp = user.exp
        
        # Add pearls and EXP to user's account
        user.pearl += pearl_reward
        user.exp += exp_reward
        expected_balance = original_balance + pearl_reward
        expected_exp = original_exp + exp_reward
        
        # Verify balance and EXP updates
        if user.pearl != expected_balance:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': 'Balance synchronization error. Please try again.'
            }), 500
            
        if user.exp != expected_exp:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': 'EXP synchronization error. Please try again.'
            }), 500
        
        # Check for level ups after adding EXP
        level_ups, original_level, new_level = check_level_up_and_reset_exp(user)
        
        # Create transaction record for the daily claim
        claim_transaction = Transaction(
            user_id=user_id,
            transaction_type='daily_claim',
            amount=pearl_reward,
            description=f'Daily claim reward - Day {current_streak} ({pearl_reward} pearls, {exp_reward} EXP)',
            reference_id=f'CLAIM-{today.strftime("%Y%m%d")}-{user_id}',
            created_at=datetime.now()
        )
        
        # Add both the claim record and transaction to the session
        db.session.add(new_claim)
        db.session.add(claim_transaction)
        
        # Flush to get the claim ID and validate constraints
        db.session.flush()
        
        # Final commit - balance, claim record, and transaction are updated atomically
        db.session.commit()
        
        # Log successful transaction
        print(f"Daily claim successful: User {user_id} claimed {pearl_reward} pearls and {exp_reward} EXP, new balance: {user.pearl}, new EXP: {user.exp}")
        
        # Check if this completes a 7-day cycle
        cycle_completed = current_streak == 7
        bonus_message = ""
        if cycle_completed:
            bonus_message = " Congratulations! You've completed a 7-day cycle and earned bonus EXP!"
        
        # Add level up message if applicable
        level_up_message = ""
        if level_ups > 0:
            if level_ups == 1:
                level_up_message = f" Level up! You reached level {new_level}!"
            else:
                level_up_message = f" Multiple level ups! You reached level {new_level}!"
        
        return jsonify({
            'success': True,
            'message': f'Daily reward claimed! You earned {pearl_reward} pearls and {exp_reward} EXP.{bonus_message}{level_up_message}',
            'claimed_amount': pearl_reward,
            'exp_claimed_amount': exp_reward,
            'original_balance': original_balance,
            'original_exp': original_exp,
            'new_pearl_balance': user.pearl,
            'new_exp_balance': user.exp,
            'current_streak': current_streak,
            'cycle_completed': cycle_completed,
            'next_reward': reward_amounts[1] if cycle_completed else reward_amounts[current_streak + 1] if current_streak < 7 else reward_amounts[1],
            'next_exp_reward': exp_amounts[1] if cycle_completed else exp_amounts[current_streak + 1] if current_streak < 7 else exp_amounts[1],
            'level_up_info': {
                'level_ups': level_ups,
                'original_level': original_level,
                'new_level': new_level,
                'leveled_up': level_ups > 0
            },
            'claim_details': new_claim.to_dict()
        }), 200
        
    except Exception as e:
        # Always rollback on any error to maintain data consistency
        db.session.rollback()
        print(f"Daily claim error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'An error occurred while claiming your reward. Please try again.',
            'error_details': str(e) if app.config['DEBUG'] else None
        }), 500

@app.route('/api/daily-claim/history', methods=['GET'])
def get_claim_history():
    """Get the claim history for the logged-in user"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to view your claim history'
            }), 401
        
        user_id = session['user_id']
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 30, type=int)
        
        # Limit per_page to reasonable values
        per_page = min(max(per_page, 1), 100)
        
        # Get paginated claim history
        claims_query = DailyClaim.query.filter(
            DailyClaim.user_id == user_id
        ).order_by(DailyClaim.claim_date.desc())
        
        claims_pagination = claims_query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Calculate total pearls earned from daily claims
        total_pearls = db.session.query(
            db.func.sum(DailyClaim.pearl_amount)
        ).filter(DailyClaim.user_id == user_id).scalar() or 0
        
        return jsonify({
            'success': True,
            'claims': [claim.to_dict() for claim in claims_pagination.items],
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': claims_pagination.total,
                'pages': claims_pagination.pages,
                'has_prev': claims_pagination.has_prev,
                'has_next': claims_pagination.has_next
            },
            'statistics': {
                'total_claims': claims_pagination.total,
                'total_pearls_earned': total_pearls
            }
        }), 200
        
    except Exception as e:
        print(f"Claim history error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching your claim history'
        }), 500

# Transaction History API Routes
@app.route('/api/transactions', methods=['GET'])
def get_transaction_history():
    """Get transaction history for the logged-in user"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to view your transaction history'
            }), 401
        
        user_id = session['user_id']
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        transaction_type = request.args.get('type')  # Optional filter by type
        
        # Limit per_page to reasonable values
        per_page = min(max(per_page, 1), 100)
        
        # Build query for transactions
        query = Transaction.query.filter(Transaction.user_id == user_id)
        
        # Apply transaction type filter if provided
        if transaction_type and transaction_type in ['send', 'receive', 'bought', 'referral', 'daily_claim', 'battle_pass']:
            if transaction_type == 'send':
                query = query.filter(Transaction.transaction_type == 'transfer_sent')
            elif transaction_type == 'receive':
                query = query.filter(Transaction.transaction_type == 'transfer_received')
            elif transaction_type == 'bought':
                query = query.filter(Transaction.transaction_type.like('%bought%'))
            elif transaction_type == 'referral':
                query = query.filter(Transaction.transaction_type == 'referral_bonus')
            elif transaction_type == 'daily_claim':
                query = query.filter(Transaction.transaction_type == 'daily_claim')
            elif transaction_type == 'battle_pass':
                query = query.filter(Transaction.transaction_type == 'battle_pass_reward')
        
        # Order by most recent first
        query = query.order_by(Transaction.created_at.desc())
        
        # Get paginated results
        transactions_pagination = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Format transactions for frontend
        formatted_transactions = []
        for transaction in transactions_pagination.items:
            # Determine display type and status
            display_type = transaction.transaction_type
            status = 'Completed'  # All transactions in DB are completed
            
            # Map internal types to display types
            if transaction.transaction_type == 'transfer_sent':
                display_type = 'Sent'
            elif transaction.transaction_type == 'transfer_received':
                display_type = 'Received'
            elif transaction.transaction_type == 'daily_claim':
                display_type = 'Daily Reward'
            elif transaction.transaction_type == 'referral_bonus':
                display_type = 'Referral Bonus'
            elif 'bought' in transaction.transaction_type.lower():
                display_type = 'Purchase'
            
            # Format amount with proper sign
            formatted_amount = transaction.amount
            if transaction.amount > 0:
                amount_display = f"+{transaction.amount}"
                amount_class = "text-success"
            else:
                amount_display = str(transaction.amount)
                amount_class = "text-danger"
            
            # Determine from/to field
            from_to = 'System'
            if transaction.transaction_type in ['transfer_sent', 'transfer_received']:
                from_to = transaction.related_user.username if transaction.related_user else 'Unknown'
            elif transaction.transaction_type == 'daily_claim':
                from_to = 'Daily Login'
            elif transaction.transaction_type == 'referral_bonus':
                from_to = 'Referral System'
            elif 'bought' in transaction.transaction_type.lower():
                from_to = 'Shop'
            
            # Ensure proper date formatting with null checks
            transaction_date = transaction.created_at if transaction.created_at else datetime.now()
            
            formatted_transactions.append({
                'id': transaction.id,
                'date': transaction_date.strftime('%Y-%m-%d'),
                'datetime': transaction_date.isoformat(),
                'type': display_type,
                'amount': formatted_amount,
                'amount_display': amount_display,
                'amount_class': amount_class,
                'from_to': from_to,
                'status': status,
                'description': transaction.description or '',
                'reference_id': transaction.reference_id or ''
            })
        
        return jsonify({
            'success': True,
            'transactions': formatted_transactions,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': transactions_pagination.total,
                'pages': transactions_pagination.pages,
                'has_prev': transactions_pagination.has_prev,
                'has_next': transactions_pagination.has_next
            }
        }), 200
        
    except Exception as e:
        print(f"Transaction history error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching transaction history'
        }), 500



# Transaction History API Routes (Frontend Compatible)
@app.route('/api/transaction-history', methods=['GET'])
def get_transaction_history_frontend():
    """Get transaction history formatted for the frontend transaction table"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to view your transaction history'
            }), 401
        
        user_id = session['user_id']
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Limit per_page to reasonable values
        per_page = min(max(per_page, 1), 100)
        
        # Get transactions for the user
        transactions_query = Transaction.query.filter(
            Transaction.user_id == user_id
        ).order_by(Transaction.created_at.desc())
        
        transactions_pagination = transactions_query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Format transactions for the frontend
        formatted_transactions = []
        for transaction in transactions_pagination.items:
            # Map database transaction types to frontend expected format
            transaction_type = transaction.transaction_type
            if transaction.transaction_type == 'transfer_sent':
                transaction_type = 'send'
            elif transaction.transaction_type == 'transfer_received':
                transaction_type = 'receive'
            elif transaction.transaction_type == 'daily_claim':
                transaction_type = 'daily_claim'
            elif transaction.transaction_type == 'referral_bonus':
                transaction_type = 'referral_bonus'
            
            # Determine from/to field - use wallet address for transfers, meaningful names for others
            from_to = 'System'
            if transaction.transaction_type in ['transfer_sent', 'transfer_received']:
                if transaction.related_user:
                    # Use wallet address for transfers to show the actual address
                    from_to = transaction.related_user.wallet_address if transaction.related_user.wallet_address else transaction.related_user.username
                else:
                    from_to = 'Unknown User'
            elif transaction.transaction_type == 'daily_claim':
                from_to = 'Daily Login Reward'
            elif transaction.transaction_type == 'referral_bonus':
                if transaction.related_user:
                    from_to = f'Referral: {transaction.related_user.username}'
                else:
                    from_to = 'Referral System'
            elif 'bought' in transaction.transaction_type.lower():
                from_to = 'Shop Purchase'
            
            formatted_transactions.append({
                'id': transaction.id,
                'transaction_date': transaction.created_at.isoformat() if transaction.created_at else datetime.now().isoformat(),
                'transaction_type': transaction_type,
                'pearl_amount': transaction.amount,
                'description': transaction.description or '',
                'related_user_id': transaction.related_user_id,
                'reference_id': transaction.reference_id or '',
                'from_to': from_to
            })
        
        return jsonify({
            'success': True,
            'transactions': formatted_transactions,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': transactions_pagination.total,
                'pages': transactions_pagination.pages,
                'has_prev': transactions_pagination.has_prev,
                'has_next': transactions_pagination.has_next
            }
        }), 200
        
    except Exception as e:
        print(f"Transaction history error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching transaction history'
        }), 500

# Profile Statistics API Routes
@app.route('/api/profile/stats', methods=['GET'])
def get_profile_statistics():
    """Get comprehensive profile statistics for the logged-in user"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to view your profile statistics'
            }), 401
        
        user_id = session['user_id']
        # Updated to use db.session.get instead of Query.get() to address SQLAlchemy warnings
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Count followers (users who follow this user)
        followers_count = Follow.query.filter_by(following_id=user_id).count()
        
        # Count following (users this user follows)
        following_count = Follow.query.filter_by(follower_id=user_id).count()
        
        # Get recent followers for display
        recent_followers = Follow.query.filter_by(
            following_id=user_id
        ).order_by(Follow.created_at.desc()).limit(5).all()
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'followers_count': followers_count,
            'following_count': following_count,
            'profile_info': {
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'bio': user.bio,
                'level': user.level,
                'exp': user.exp,
                'created_at': user.created_at.isoformat() if user.created_at else None
            },
            'recent_followers': [{
                'follower_username': follow.follower.username if follow.follower else 'Unknown',
                'follower_name': f"{follow.follower.first_name} {follow.follower.last_name}" if follow.follower else 'Unknown',
                'followed_at': follow.created_at.isoformat() if follow.created_at else None
            } for follow in recent_followers],
        }), 200
        
    except Exception as e:
        print(f"Profile stats error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching profile statistics'
        }), 500

# Profile Update API Routes
@app.route('/api/profile/personal-info', methods=['POST'])
def update_personal_info():
    """Update personal information for the logged-in user"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to update your personal information'
            }), 401
        
        user_id = session['user_id']
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Get JSON data from request
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Extract and validate fields
        first_name = data.get('first_name', '').strip().upper()  # Convert to uppercase
        last_name = data.get('last_name', '').strip().upper()   # Convert to uppercase
        email = data.get('email', '').strip().lower()
        
        # Birthday fields
        birth_month = data.get('birth_month')
        birth_day = data.get('birth_day')
        birth_year = data.get('birth_year')
        location = data.get('location', '').strip() if data.get('location') else None
        
        # Validate required fields
        if not first_name:
            return jsonify({
                'success': False,
                'message': 'First name is required'
            }), 400
        
        if not last_name:
            return jsonify({
                'success': False,
                'message': 'Last name is required'
            }), 400
        
        if not email:
            return jsonify({
                'success': False,
                'message': 'Email is required'
            }), 400
        
        # Validate email format
        if not validate_email(email):
            return jsonify({
                'success': False,
                'message': 'Please enter a valid email address'
            }), 400
        
        # Check if email is already used by another user
        if email != user.email:
            existing_email = User.query.filter_by(email=email).first()
            if existing_email:
                return jsonify({
                    'success': False,
                    'message': 'This email address is already in use by another account'
                }), 400
        
        # Validate birthday fields if provided
        if birth_month is not None or birth_day is not None or birth_year is not None:
            # Convert to integers if they're strings
            try:
                if birth_month is not None:
                    birth_month = int(birth_month)
                if birth_day is not None:
                    birth_day = int(birth_day)
                if birth_year is not None:
                    birth_year = int(birth_year)
            except (ValueError, TypeError):
                return jsonify({
                    'success': False,
                    'message': 'Invalid birthday values. Please enter valid numbers.'
                }), 400
            
            # Validate ranges
            if birth_month is not None and (birth_month < 1 or birth_month > 12):
                return jsonify({
                    'success': False,
                    'message': 'Month must be between 1 and 12'
                }), 400
            
            if birth_day is not None and (birth_day < 1 or birth_day > 31):
                return jsonify({
                    'success': False,
                    'message': 'Day must be between 1 and 31'
                }), 400
            
            if birth_year is not None:
                current_year = date.today().year
                if birth_year < 1900 or birth_year > current_year:
                    return jsonify({
                        'success': False,
                        'message': f'Year must be between 1900 and {current_year}'
                    }), 400
                
                # Calculate age if we have all components
                if birth_month is not None and birth_day is not None:
                    try:
                        birth_date = date(birth_year, birth_month, birth_day)
                        today = date.today()
                        age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
                        
                        if age < 13:
                            return jsonify({
                                'success': False,
                                'message': 'You must be at least 13 years old'
                            }), 400
                        
                        if age > 120:
                            return jsonify({
                                'success': False,
                                'message': 'Please enter a valid birth year'
                            }), 400
                            
                    except ValueError:
                        return jsonify({
                            'success': False,
                            'message': 'Invalid date combination. Please check your birthday.'
                        }), 400
        
        # Update user information
        user.first_name = first_name
        user.last_name = last_name
        user.email = email
        
        # Update birthday fields if provided
        if birth_month is not None:
            user.birth_month = birth_month
        if birth_day is not None:
            user.birth_day = birth_day
        if birth_year is not None:
            user.birth_year = birth_year
        
        # Update location if provided
        if location is not None:
            user.location = location
        
        # Commit changes
        db.session.commit()
        
        # Update session data
        session['username'] = user.username  # Keep username in session
        
        print(f"Personal info updated for user {user_id}: {first_name} {last_name} ({email})")
        
        return jsonify({
            'success': True,
            'message': 'Personal information updated successfully!',
            'user': {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Personal info update error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while updating your personal information'
        }), 500

@app.route('/api/auth/change-password', methods=['POST'])
def change_password():
    """Change password for the logged-in user"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to change your password'
            }), 401
        
        user_id = session['user_id']
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Get JSON data from request
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Extract password fields
        current_password = data.get('current_password', '').strip()
        new_password = data.get('new_password', '').strip()
        
        # Validate required fields
        if not current_password:
            return jsonify({
                'success': False,
                'message': 'Current password is required'
            }), 400
        
        if not new_password:
            return jsonify({
                'success': False,
                'message': 'New password is required'
            }), 400
        
        # Verify current password
        if not check_password_hash(user.password, current_password):
            return jsonify({
                'success': False,
                'message': 'Current password is incorrect'
            }), 400
        
        # Validate new password strength
        password_valid, password_message = validate_password(new_password)
        if not password_valid:
            return jsonify({
                'success': False,
                'message': password_message
            }), 400
        
        # Check if new password is different from current password
        if check_password_hash(user.password, new_password):
            return jsonify({
                'success': False,
                'message': 'New password must be different from your current password'
            }), 400
        
        # Hash the new password
        hashed_new_password = generate_password_hash(new_password)
        
        # Update user's password
        user.password = hashed_new_password
        
        # Commit changes
        db.session.commit()
        
        print(f"Password changed successfully for user {user_id} ({user.username})")
        
        return jsonify({
            'success': True,
            'message': 'Password changed successfully! Please log in again with your new password.'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Password change error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while changing your password. Please try again.'
        }), 500

@app.route('/api/profile/update-bio', methods=['POST'])
def update_bio():
    """Update the bio for the logged-in user"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to update your bio'
            }), 401
        
        user_id = session['user_id']
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Get JSON data from request
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Extract bio from request data
        bio = data.get('bio', '').strip()
        
        # Validate bio length - limit to 60 words
        if bio:
            word_count = len(bio.split())
            if word_count > 60:
                return jsonify({
                    'success': False,
                    'message': f'Bio must be 60 words or less. Current word count: {word_count}'
                }), 400
        
        # Update user's bio
        user.bio = bio if bio else None  # Set to None if empty string
        db.session.commit()
        
        print(f"Bio updated for user {user_id}: {bio[:50]}..." if bio else f"Bio cleared for user {user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Bio updated successfully!',
            'bio': bio
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Bio update error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while updating your bio'
        }), 500

# Wallet Statistics API Routes
@app.route('/api/wallet/stats', methods=['GET'])
def get_wallet_statistics():
    """Get comprehensive wallet statistics for the logged-in user"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to view your wallet statistics'
            }), 401
        
        user_id = session['user_id']
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Calculate pearls earned from daily claims
        total_from_claims = db.session.query(
            db.func.sum(DailyClaim.pearl_amount)
        ).filter(DailyClaim.user_id == user_id).scalar() or 0
        
        # Count referrals made by this user
        referrals_made = Referral.query.filter_by(referrer_id=user_id).count()
        
        # Calculate referral bonuses earned (1000 per referral)
        referral_bonuses = referrals_made * 1000
        
        # Calculate total pearls earned (base + claims + referrals)
        # Starting bonus (1000) + daily claims + referral bonuses
        total_earned = 1000 + total_from_claims + referral_bonuses
        
        # Calculate pearls spent (current balance vs total earned)
        current_balance = user.pearl
        pearls_spent = max(0, total_earned - current_balance)
        
        # Get recent referrals for display
        recent_referrals = Referral.query.filter_by(
            referrer_id=user_id
        ).order_by(Referral.created_at.desc()).limit(5).all()
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'current_balance': current_balance,
            'pearls_earned': total_earned,
            'pearls_spent': pearls_spent,
            'referral_count': referrals_made,
            'breakdown': {
                'starting_bonus': 1000,
                'daily_claims_total': total_from_claims,
                'referral_bonuses': referral_bonuses,
                'total_earned': total_earned
            },
            'recent_referrals': [{
                'referee_username': ref.referee.username if ref.referee else 'Unknown',
                'created_at': ref.created_at.isoformat() if ref.created_at else None,
                'bonus_amount': 1000
            } for ref in recent_referrals]
        }), 200
        
    except Exception as e:
        print(f"Wallet stats error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching wallet statistics'
        }), 500

# Wallet Send API Route
@app.route('/api/wallet/send', methods=['POST'])
def send_pearls():
    """Send pearls to another user"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to send pearls'
            }), 401
        
        sender_id = session['user_id']
        sender = db.session.get(User, sender_id)
        
        if not sender:
            return jsonify({
                'success': False,
                'message': 'Sender not found'
            }), 404
        
        # Get JSON data from request
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Accept both 'recipient' and 'recipient_address' for compatibility
        recipient_identifier = data.get('recipient_address', data.get('recipient', '')).strip()
        amount = data.get('amount', 0)
        message = data.get('message', '').strip()
        
        # Validate required fields
        if not recipient_identifier:
            return jsonify({
                'success': False,
                'message': 'Recipient is required'
            }), 400
        
        if not amount or amount <= 0:
            return jsonify({
                'success': False,
                'message': 'Amount must be greater than 0'
            }), 400
        
        # Check if sender has enough pearls
        if sender.pearl < amount:
            return jsonify({
                'success': False,
                'message': 'Insufficient pearls'
            }), 400
        
        # Find recipient by wallet address
        recipient = None
        if recipient_identifier.startswith('pearl:'):
            # Search by wallet address
            recipient = User.query.filter_by(wallet_address=recipient_identifier).first()
        else:
            # Fallback: try to find by username or email for backward compatibility
            if '@' in recipient_identifier:
                # Search by email
                recipient = User.query.filter_by(email=recipient_identifier).first()
            else:
                # Search by username
                recipient = User.query.filter_by(username=recipient_identifier).first()
        
        if not recipient:
            return jsonify({
                'success': False,
                'message': 'Recipient wallet address not found'
            }), 404
        
        # Prevent sending to yourself
        if recipient.id == sender_id:
            return jsonify({
                'success': False,
                'message': 'Cannot send pearls to yourself'
            }), 400
        
        # Perform the transaction
        try:
            # Deduct from sender
            sender.pearl -= amount
            
            # Add to recipient
            recipient.pearl += amount
            
            # Create transaction records for both sender and recipient
            sender_transaction = Transaction(
                user_id=sender_id,
                transaction_type='transfer_sent',
                amount=-amount,  # Negative for sending
                description=f"Sent {amount} pearls to {recipient.username}",
                related_user_id=recipient.id
            )
            
            recipient_transaction = Transaction(
                user_id=recipient.id,
                transaction_type='transfer_received',
                amount=amount,  # Positive for receiving
                description=f"Received {amount} pearls from {sender.username}",
                related_user_id=sender_id
            )
            
            db.session.add(sender_transaction)
            db.session.add(recipient_transaction)
            
            db.session.commit()
            
            return jsonify({
                'success': True,
                'message': f'Successfully sent {amount} pearls to {recipient.username}',
                'transaction_id': sender_transaction.id,
                'new_balance': sender.pearl
            }), 200
            
        except Exception as e:
            db.session.rollback()
            print(f"Transaction error: {str(e)}")
            return jsonify({
                'success': False,
                'message': 'Transaction failed. Please try again.'
            }), 500
        
    except Exception as e:
        print(f"Send pearls error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while sending pearls'
        }), 500

# Social Media Links API Routes
@app.route('/api/social-links', methods=['POST'])
def save_social_links():
    """Save social media links for the logged-in user"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to save your social media links'
            }), 401
        
        user_id = session['user_id']
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Get JSON data from request
        data = request.get_json()
        print(f"DEBUG: Received social links data: {data}")
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Define supported platforms and their validation patterns
        platform_patterns = {
            'twitter': r'^https?://(www\.)?(twitter\.com|x\.com)/.+$',
            'instagram': r'^https?://(www\.)?instagram\.com/.+$',
            'linkedin': r'^https?://(www\.)?linkedin\.com/.+$',
            'github': r'^https?://(www\.)?github\.com/.+$',
            'youtube': r'^https?://(www\.)?(youtube\.com|youtu\.be)/.+$',
            'tiktok': r'^https?://(www\.)?tiktok\.com/.+$',
            'discord': r'^(https?://)?(discord\.gg/[A-Za-z0-9]+|.+#\d{4}|@?[A-Za-z0-9_.]+)$',  # Discord server invite, old username#1234, or new username
            'twitch': r'^https?://(www\.)?twitch\.tv/.+$',
            'snapchat': r'^.+$',  # Snapchat username
            'whatsapp': r'^\+?[1-9]\d{1,14}$',  # WhatsApp phone number
            'telegram': r'^.+$',  # Telegram username
            'reddit': r'^https?://(www\.)?reddit\.com/.+$',
            'pinterest': r'^https?://(www\.)?pinterest\.com/.+$',
            'steam': r'^https?://steamcommunity\.com/.+$',
            'facebook': r'^https?://(www\.)?facebook\.com/.+$'  # Facebook URL pattern
        }
        
        saved_links = []
        errors = []
        
        # Process each platform - handle both enabled status and link values
        for platform in platform_patterns.keys():
            link_value = data.get(f'{platform}Link', '').strip()
            is_enabled = data.get(f'{platform}Enabled', False)
            
            print(f"DEBUG: Processing platform '{platform}' - link_value: '{link_value}', is_enabled: {is_enabled}")
            
            try:
                # Check if link already exists for this user and platform
                existing_link = SocialMediaLink.query.filter_by(
                    user_id=user_id,
                    platform=platform
                ).first()
                
                print(f"DEBUG: Existing link for {platform}: {existing_link.url if existing_link else 'None'} (active: {existing_link.is_active if existing_link else 'N/A'})")
                
                if link_value:
                    print(f"DEBUG: Platform {platform} has link value, validating...")
                    # Validate the URL format for the platform
                    pattern = platform_patterns[platform]
                    
                    # Special handling for platforms that don't use URLs
                    if platform in ['discord', 'snapchat', 'telegram']:
                        # For Discord, validate server invite link or username format
                        if platform == 'discord' and not re.match(platform_patterns['discord'], link_value):
                            errors.append(f'{platform.title()}: Please enter a valid Discord server invite link (e.g., https://discord.gg/yourserver) or username (e.g., username#1234)')
                            continue
                    elif platform == 'whatsapp':
                        # For WhatsApp, validate phone number format
                        if not re.match(platform_patterns['whatsapp'], link_value):
                            errors.append(f'{platform.title()}: Please enter a valid phone number')
                            continue
                    else:
                        # For URL-based platforms, validate URL format
                        if not re.match(pattern, link_value, re.IGNORECASE):
                            errors.append(f'{platform.title()}: Please enter a valid {platform} URL')
                            continue
                    
                    if existing_link:
                        print(f"DEBUG: Updating existing link for {platform} - setting is_active to {is_enabled}")
                        # Update existing link
                        existing_link.url = link_value
                        existing_link.is_active = is_enabled
                        existing_link.updated_at = datetime.now()
                        
                        # Handle display name for website
                        if platform == 'website':
                            website_name = data.get(f'{platform}Name', '').strip()
                            existing_link.display_name = website_name if website_name else link_value
                        
                        saved_links.append({
                            'platform': platform,
                            'url': link_value,
                            'is_active': is_enabled,
                            'action': 'updated'
                        })
                    else:
                        print(f"DEBUG: Creating new link for {platform} - setting is_active to {is_enabled}")
                        # Create new link
                        new_link = SocialMediaLink(
                            user_id=user_id,
                            platform=platform,
                            url=link_value,
                            is_active=is_enabled
                        )
                        
                        # Handle display name for website
                        if platform == 'website':
                            website_name = data.get(f'{platform}Name', '').strip()
                            new_link.display_name = website_name if website_name else link_value
                        
                        db.session.add(new_link)
                        saved_links.append({
                            'platform': platform,
                            'url': link_value,
                            'is_active': is_enabled,
                            'action': 'created'
                        })
                        
                elif existing_link:
                    print(f"DEBUG: No link value for {platform} but existing link found - updating is_active to {is_enabled}")
                    # No link value but existing link exists - update only the enabled status
                    existing_link.is_active = is_enabled
                    existing_link.updated_at = datetime.now()
                    saved_links.append({
                        'platform': platform,
                        'url': existing_link.url,
                        'is_active': is_enabled,
                        'action': 'status_updated'
                    })
                else:
                    print(f"DEBUG: No link value and no existing link for {platform} - skipping")
                
            except Exception as e:
                errors.append(f'{platform.title()}: Database error - {str(e)}')
        
        # Return errors if any validation failed
        if errors:
            return jsonify({
                'success': False,
                'message': 'Some social media links have validation errors',
                'errors': errors
            }), 400
        
        # Commit all changes if no errors
        try:
            db.session.commit()
            
            print(f"Social media links saved for user {user_id}: {len(saved_links)} links")
            
            return jsonify({
                'success': True,
                'message': f'Successfully saved {len(saved_links)} social media links!',
                'saved_links': saved_links
            }), 200
            
        except Exception as e:
            db.session.rollback()
            print(f"Database error saving social links: {str(e)}")
            return jsonify({
                'success': False,
                'message': 'Database error occurred while saving your links. Please try again.'
            }), 500
        
    except Exception as e:
        db.session.rollback()
        print(f"Social links save error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while saving your social media links'
        }), 500

@app.route('/api/social-links', methods=['GET'])
def get_social_links():
    """Get all social media links for the logged-in user"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to view your social media links'
            }), 401
        
        user_id = session['user_id']
        
        # Get all social media links for the user (both active and inactive)
        links = SocialMediaLink.query.filter_by(
            user_id=user_id
        ).order_by(SocialMediaLink.created_at.desc()).all()
        
        # Format links for frontend
        formatted_links = []
        for link in links:
            # Create platform-specific display information
            platform_info = {
                'twitter': {'icon': 'fab fa-twitter', 'color': '#1da1f2', 'name': 'Twitter'},
                'facebook': {'icon': 'fab fa-facebook-f', 'color': '#1877f2', 'name': 'Facebook'},
                'instagram': {'icon': 'fab fa-instagram', 'color': '#e1306c', 'name': 'Instagram'},
                'linkedin': {'icon': 'fab fa-linkedin', 'color': '#0077b5', 'name': 'LinkedIn'},
                'github': {'icon': 'fab fa-github', 'color': '#6cc644', 'name': 'GitHub'},
                'youtube': {'icon': 'fab fa-youtube', 'color': '#ff0000', 'name': 'YouTube'},
                'tiktok': {'icon': 'fab fa-tiktok', 'color': '#ff0050', 'name': 'TikTok'},
                'discord': {'icon': 'fab fa-discord', 'color': '#7289da', 'name': 'Discord'},
                'twitch': {'icon': 'fab fa-twitch', 'color': '#9146ff', 'name': 'Twitch'},
                'snapchat': {'icon': 'fab fa-snapchat-ghost', 'color': '#fffc00', 'name': 'Snapchat'},
                'whatsapp': {'icon': 'fab fa-whatsapp', 'color': '#25d366', 'name': 'WhatsApp'},
                'telegram': {'icon': 'fab fa-telegram-plane', 'color': '#0088cc', 'name': 'Telegram'},
                'reddit': {'icon': 'fab fa-reddit-alien', 'color': '#ff4500', 'name': 'Reddit'},
                'pinterest': {'icon': 'fab fa-pinterest-p', 'color': '#bd081c', 'name': 'Pinterest'},
                'website': {'icon': 'fas fa-globe', 'color': '#5c85d6', 'name': 'Website'}
            }
            
            platform_details = platform_info.get(link.platform, {
                'icon': 'fas fa-link',
                'color': '#666666',
                'name': link.platform.title()
            })
            
            formatted_links.append({
                'id': link.id,
                'platform': link.platform,
                'url': link.url,
                'display_name': link.display_name or link.url,
                'is_active': link.is_active,
                'created_at': link.created_at.isoformat() if link.created_at else None,
                'updated_at': link.updated_at.isoformat() if link.updated_at else None,
                'platform_info': platform_details
            })
        
        return jsonify({
            'success': True,
            'links': formatted_links,
            'total_links': len(formatted_links)
        }), 200
        
    except Exception as e:
        print(f"Social links save error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while saving your social media links'
        }), 500

@app.route('/api/social-links/single', methods=['POST'])
def add_single_social_link():
    """Add or update a single social media link"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to add social media links'
            }), 401
        
        user_id = session['user_id']
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Get JSON data from request
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        platform = data.get('platform', '').strip().lower()
        url = data.get('url', '').strip()
        
        # Validate required fields
        if not platform:
            return jsonify({
                'success': False,
                'message': 'Platform is required'
            }), 400
        
        if not url:
            return jsonify({
                'success': False,
                'message': 'URL is required'
            }), 400
        
        # Define supported platforms and their validation patterns
        platform_patterns = {
            'twitter': r'^https?://(www\.)?(twitter\.com|x\.com)/.+$',
            'instagram': r'^https?://(www\.)?instagram\.com/.+$',
            'linkedin': r'^https?://(www\.)?linkedin\.com/.+$',
            'github': r'^https?://(www\.)?github\.com/.+$',
            'youtube': r'^https?://(www\.)?(youtube\.com|youtu\.be)/.+$',
            'tiktok': r'^https?://(www\.)?tiktok\.com/.+$',
            'discord': r'^(https?://)?(discord\.gg/[A-Za-z0-9]+|.+#\d{4}|@?[A-Za-z0-9_.]+)$',  # Discord server invite, old username#1234, or new username
            'twitch': r'^https?://(www\.)?twitch\.tv/.+$',
            'facebook': r'^https?://(www\.)?facebook\.com/.+$'  # Facebook URL pattern
        }
        
        # Validate platform is supported
        if platform not in platform_patterns:
            return jsonify({
                'success': False,
                'message': f'Unsupported platform: {platform}'
            }), 400
        
        # Validate URL format
        pattern = platform_patterns[platform]
        if platform == 'discord':
            if not re.match(pattern, url):
                return jsonify({
                    'success': False,
                    'message': 'Please enter a valid Discord server invite link (e.g., https://discord.gg/yourserver) or username (e.g., username#1234)'
                }), 400
        else:
            if not re.match(pattern, url, re.IGNORECASE):
                return jsonify({
                    'success': False,
                    'message': f'Please enter a valid {platform.title()} URL'
                }), 400
        
        # Check if link already exists for this user and platform
        existing_link = SocialMediaLink.query.filter_by(
            user_id=user_id,
            platform=platform
        ).first()
        
        if existing_link:
            # Update existing link
            existing_link.url = url
            existing_link.is_active = True
            existing_link.updated_at = datetime.now()
            action_taken = 'updated'
        else:
            # Create new link
            new_link = SocialMediaLink(
                user_id=user_id,
                platform=platform,
                url=url,
                is_active=True
            )
            db.session.add(new_link)
            action_taken = 'added'
        
        # Commit changes
        db.session.commit()
        
        print(f"Social media link {action_taken}: {platform} for user {user_id}")
        
        return jsonify({
            'success': True,
            'message': f'{platform.title()} link {action_taken} successfully!',
            'action': action_taken,
            'platform': platform,
            'url': url
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Add single social link error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while saving the social media link'
        }), 500

@app.route('/api/social-links/toggle', methods=['POST'])
def toggle_social_link():
    """Toggle a social media platform's active status (1=active, 0=inactive)"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to toggle your social media links'
            }), 401
        
        user_id = session['user_id']
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Get JSON data from request
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        platform = data.get('platform', '').strip().lower()
        is_active = data.get('is_active', True)  # Default to active if not specified
        
        # Convert is_active to boolean if it comes as 1/0
        if isinstance(is_active, (int, str)):
            is_active = bool(int(is_active)) if str(is_active).isdigit() else bool(is_active)
        
        print(f"DEBUG: Toggle request - platform: '{platform}', is_active: {is_active}")
        
        # Validate required fields
        if not platform:
            return jsonify({
                'success': False,
                'message': 'Platform is required'
            }), 400
        
        # Define supported platforms
        supported_platforms = [
            'twitter', 'instagram', 'linkedin', 'github', 'youtube', 'tiktok',
            'discord', 'twitch', 'snapchat', 'whatsapp', 'telegram', 'reddit',
            'pinterest', 'steam', 'website'
        ]
        
        # Validate platform is supported
        if platform not in supported_platforms:
            return jsonify({
                'success': False,
                'message': f'Unsupported platform: {platform}'
            }), 400
        
        # Find existing link for this user and platform
        existing_link = SocialMediaLink.query.filter_by(
            user_id=user_id,
            platform=platform
        ).first()
        
        if existing_link:
            # Update existing link's active status
            print(f"DEBUG: Found existing {platform} link - updating is_active from {existing_link.is_active} to {is_active}")
            existing_link.is_active = is_active
            existing_link.updated_at = datetime.now()
            
            db.session.commit()
            
            action_message = f"{platform.title()} {'activated' if is_active else 'deactivated'}"
            print(f"DEBUG: Successfully updated {platform} is_active to {is_active}")
            
            return jsonify({
                'success': True,
                'message': f'{action_message} successfully!',
                'platform': platform,
                'is_active': is_active,
                'action': 'toggled'
            }), 200
        else:
            # No existing link found
            return jsonify({
                'success': False,
                'message': f'No {platform.title()} link found to toggle. Please add a link first.'
            }), 404
        
    except Exception as e:
        db.session.rollback()
        print(f"Toggle social link error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while toggling the social media link'
        }), 500

@app.route('/api/social-links/<int:link_id>', methods=['DELETE'])
def delete_social_link(link_id):
    """Delete a specific social media link"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to delete your social media links'
            }), 401
        
        user_id = session['user_id']
        
        # Find the link and ensure it belongs to the logged-in user
        link = SocialMediaLink.query.filter_by(
            id=link_id,
            user_id=user_id
        ).first()
        
        if not link:
            return jsonify({
                'success': False,
                'message': 'Social media link not found or you do not have permission to delete it'
            }), 404
        
        # Store platform name for response
        platform_name = link.platform.title()
        
        # Delete the link
        db.session.delete(link)
        db.session.commit()
        
        print(f"Social media link deleted: {platform_name} for user {user_id}")
        
        return jsonify({
            'success': True,
            'message': f'{platform_name} link deleted successfully!'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Delete social link error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while deleting the social media link'
        }), 500

# Avatar Shop API Routes
@app.route('/api/avatar-shop/items', methods=['GET'])
def get_avatar_shop_items():
    """Get avatar shop items with filtering and pagination"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to view avatar shop items'
            }), 401
        
        user_id = session['user_id']
        
        # Get query parameters
        category = request.args.get('category', 'all').lower()
        rarity = request.args.get('rarity', 'all').lower()
        owned_filter = request.args.get('owned', 'all').lower()
        search_term = request.args.get('search', '').strip().lower()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)
        
        # Limit per_page to reasonable values
        per_page = min(max(per_page, 1), 50)
        
        # Build base query
        query = AvatarShopItem.query.filter(AvatarShopItem.is_active == True)
        
        # Apply category filter
        if category != 'all':
            category_map = {'banner': 1, 'avatar': 2, 'decoration': 3}
            category_id = category_map.get(category)
            if category_id:
                query = query.filter(AvatarShopItem.category_id == category_id)
        
        # Apply rarity filter
        if rarity != 'all':
            rarity_map = {'common': 1, 'rare': 2, 'epic': 3, 'legendary': 4, 'mythic': 5}
            rarity_id = rarity_map.get(rarity)
            if rarity_id:
                query = query.filter(AvatarShopItem.rarity_id == rarity_id)
        
        # Apply search filter
        if search_term:
            query = query.filter(
                db.or_(
                    AvatarShopItem.name.ilike(f'%{search_term}%'),
                    AvatarShopItem.description.ilike(f'%{search_term}%')
                )
            )
        
        # Get user's owned items for filtering
        user_items = UserAvatarItem.query.filter_by(user_id=user_id).all()
        owned_items = {item.avatar_item_id for item in user_items}
        
        # Get user's current avatar configuration for selection status
        from models.avatar_shop_item import UserAvatarConfiguration
        user_config = UserAvatarConfiguration.query.filter_by(user_id=user_id).first()
        selected_items = set()
        if user_config:
            if user_config.banner_item_id:
                selected_items.add(user_config.banner_item_id)
            if user_config.avatar_item_id:
                selected_items.add(user_config.avatar_item_id)
            if user_config.decoration_item_id:
                selected_items.add(user_config.decoration_item_id)
        
        # Apply owned filter if specified
        if owned_filter == 'owned':
            if owned_items:
                query = query.filter(AvatarShopItem.id.in_(owned_items))
            else:
                # User doesn't own any items, return empty result
                query = query.filter(AvatarShopItem.id.in_([]))
        elif owned_filter == 'unowned':
            if owned_items:
                query = query.filter(~AvatarShopItem.id.in_(owned_items))
        
        # Get all items first to sort by ownership status
        all_items = query.all()
        
        # Split items into owned and unowned, then sort each group
        owned_shop_items = [item for item in all_items if item.id in owned_items]
        unowned_shop_items = [item for item in all_items if item.id not in owned_items]
        
        # Sort each group by category, then by name
        owned_shop_items.sort(key=lambda x: (x.category_id, x.name))
        unowned_shop_items.sort(key=lambda x: (x.category_id, x.name))
        
        # Combine: owned items first, then unowned items
        sorted_items = owned_shop_items + unowned_shop_items
        
        # Calculate pagination manually since we're sorting in Python
        total_items = len(sorted_items)
        start_idx = (page - 1) * per_page
        end_idx = start_idx + per_page
        paginated_items = sorted_items[start_idx:end_idx]
        
        # Create pagination info
        total_pages = (total_items + per_page - 1) // per_page
        has_prev = page > 1
        has_next = page < total_pages
        
        # Format items for frontend
        formatted_items = []
        for item in paginated_items:
            item_dict = item.to_dict()
            # Add ownership status
            item_dict['owned'] = item.id in owned_items
            # Add selection status based on user's current avatar configuration
            item_dict['selected'] = item.id in selected_items
            formatted_items.append(item_dict)
        
        return jsonify({
            'success': True,
            'items': formatted_items,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total_items,
                'pages': total_pages,
                'has_prev': has_prev,
                'has_next': has_next
            },
            'filters': {
                'category': category,
                'rarity': rarity,
                'owned': owned_filter,
                'search': search_term
            }
        }), 200
        
    except Exception as e:
        print(f"Avatar shop items error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching avatar shop items'
        }), 500

@app.route('/api/avatar-shop/purchase', methods=['POST'])
def purchase_avatar_item():
    """Purchase an avatar shop item"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to purchase items'
            }), 401
        
        user_id = session['user_id']
        # Lock the user record to prevent race conditions
        user = User.query.filter_by(id=user_id).with_for_update().first()
        
        if not user:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Get JSON data from request
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        item_id = data.get('item_id')
        if not item_id:
            return jsonify({
                'success': False,
                'message': 'Item ID is required'
            }), 400
        
        # Get the item
        item = AvatarShopItem.query.filter_by(id=item_id, is_active=True).first()
        if not item:
            return jsonify({
                'success': False,
                'message': 'Item not found or not available'
            }), 404
        
        # Check if user already owns this item
        existing_ownership = UserAvatarItem.query.filter_by(
            user_id=user_id,
            avatar_item_id=item_id
        ).first()
        
        if existing_ownership:
            return jsonify({
                'success': False,
                'message': 'You already own this item'
            }), 400
        
        # Check if user has enough pearls
        if user.pearl < item.price:
            return jsonify({
                'success': False,
                'message': f'Insufficient pearls. You need {item.price} pearls but only have {user.pearl}.'
            }), 400
        
        # Perform the purchase
        original_balance = user.pearl
        original_exp = user.exp
        user.pearl -= item.price
        
        # Add 30% bonus XP (30% of item price)
        bonus_exp = int(item.price * 0.3)
        user.exp += bonus_exp
        
        # Check for level ups after adding bonus XP
        level_ups, original_level, new_level = check_level_up_and_reset_exp(user)
        
        # Create ownership record
        ownership = UserAvatarItem(
            user_id=user_id,
            avatar_item_id=item_id,
            is_equipped=False,  # Default to not equipped
            purchased_price=item.price
        )
        
        # Create transaction record
        transaction = Transaction(
            user_id=user_id,
            transaction_type='avatar_purchase',
            amount=-item.price,  # Negative because it's a purchase
            description=f'Purchased {item.name} ({item.get_category_name()}) - Bonus: +{bonus_exp} XP',
            reference_id=f'AVATAR-{item_id}-{user_id}-{int(datetime.now().timestamp())}'
        )
        
        # Add records to session
        db.session.add(ownership)
        db.session.add(transaction)
        
        # Commit all changes
        db.session.commit()
        
        print(f"Avatar item purchased: User {user_id} bought {item.name} for {item.price} pearls, earned {bonus_exp} bonus XP")
        
        # Create success message with level up info if applicable
        success_message = f'Successfully purchased {item.name}! You earned {bonus_exp} bonus XP.'
        if level_ups > 0:
            if level_ups == 1:
                success_message += f' Level up! You reached level {new_level}!'
            else:
                success_message += f' Multiple level ups! You reached level {new_level}!'
        
        return jsonify({
            'success': True,
            'message': success_message,
            'item': item.to_dict(),
            'transaction_id': transaction.id,
            'original_balance': original_balance,
            'original_exp': original_exp,
            'new_balance': user.pearl,
            'new_exp': user.exp,
            'bonus_exp': bonus_exp,
            'cost': item.price,
            'level_up_info': {
                'level_ups': level_ups,
                'original_level': original_level,
                'new_level': new_level,
                'leveled_up': level_ups > 0
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Avatar purchase error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while purchasing the item. Please try again.'
        }), 500

@app.route('/api/avatar-shop/user-items', methods=['GET'])
def get_user_avatar_items():
    """Get user's owned avatar items"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to view your items'
            }), 401
        
        user_id = session['user_id']
        
        # Get user's owned items with item details
        user_items = db.session.query(UserAvatarItem, AvatarShopItem).join(
            AvatarShopItem, UserAvatarItem.avatar_item_id == AvatarShopItem.id
        ).filter(
            UserAvatarItem.user_id == user_id,
            AvatarShopItem.is_active == True
        ).all()
        
        # Format items
        owned_items = []
        for user_item, shop_item in user_items:
            item_dict = shop_item.to_dict()
            item_dict.update({
                'owned': True,
                'is_equipped': user_item.is_equipped,
                'purchased_at': user_item.purchased_at.isoformat() if user_item.purchased_at else None,
                'purchased_price': user_item.purchased_price
            })
            owned_items.append(item_dict)
        
        return jsonify({
            'success': True,
            'items': owned_items,
            'total_owned': len(owned_items)
        }), 200
        
    except Exception as e:
        print(f"User avatar items error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching your items'
        }), 500

@app.route('/api/avatar-shop/user-configuration', methods=['GET'])
def get_user_avatar_configuration():
    """Get user's current avatar configuration"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to view your avatar configuration'
            }), 401
        
        user_id = session['user_id']
        
        # Get user's current avatar configuration
        user_config = UserAvatarConfiguration.query.filter_by(user_id=user_id).first()
        
        if not user_config:
            # Return empty configuration if none exists
            return jsonify({
                'success': True,
                'configuration': {
                    'equipped_items': {
                        'banner': None,
                        'avatar': None,
                        'decoration': None
                    }
                }
            }), 200
        
        # Get the actual item details for each configured item
        equipped_items = {
            'banner': None,
            'avatar': None,
            'decoration': None
        }
        
        # Fetch banner item details if configured
        if user_config.banner_item_id:
            banner_item = AvatarShopItem.query.filter_by(
                id=user_config.banner_item_id,
                is_active=True
            ).first()
            if banner_item:
                equipped_items['banner'] = {
                    'id': banner_item.id,
                    'name': banner_item.name,
                    'image_url': banner_item.get_full_url(),
                    'category': banner_item.get_category_name()
                }
        
        # Fetch avatar item details if configured
        if user_config.avatar_item_id:
            avatar_item = AvatarShopItem.query.filter_by(
                id=user_config.avatar_item_id,
                is_active=True
            ).first()
            if avatar_item:
                equipped_items['avatar'] = {
                    'id': avatar_item.id,
                    'name': avatar_item.name,
                    'image_url': avatar_item.get_full_url(),
                    'category': avatar_item.get_category_name()
                }
        
        # Fetch decoration item details if configured
        if user_config.decoration_item_id:
            decoration_item = AvatarShopItem.query.filter_by(
                id=user_config.decoration_item_id,
                is_active=True
            ).first()
            if decoration_item:
                equipped_items['decoration'] = {
                    'id': decoration_item.id,
                    'name': decoration_item.name,
                    'image_url': decoration_item.get_full_url(),
                    'category': decoration_item.get_category_name()
                }
        
        return jsonify({
            'success': True,
            'configuration': {
                'equipped_items': equipped_items
            }
        }), 200
        
    except Exception as e:
        print(f"User avatar configuration error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching your avatar configuration'
        }), 500

@app.route('/api/avatar-shop/equip', methods=['POST'])
def equip_avatar_item():
    """Equip or unequip an avatar item"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({'success': False, 'message': 'Not logged in'}), 401
        
        user_id = session['user_id']
        data = request.get_json()
        
        if not data or 'item_id' not in data:
            return jsonify({'success': False, 'message': 'Item ID is required'}), 400
        
        item_id = data['item_id']
        action = data.get('action', 'equip')  # 'equip' or 'unequip'
        
        # Get item and check ownership
        item = db.session.get(AvatarShopItem, item_id)
        if not item:
            return jsonify({'success': False, 'message': 'Item not found'}), 404
        
        user_item = UserAvatarItem.query.filter_by(user_id=user_id, avatar_item_id=item_id).first()
        if not user_item:
            return jsonify({'success': False, 'message': 'You do not own this item'}), 400
        
        # Get or create user avatar configuration
        user_config = UserAvatarConfiguration.query.filter_by(user_id=user_id).first()
        if not user_config:
            user_config = UserAvatarConfiguration(user_id=user_id)
            db.session.add(user_config)
        
        # Equip or unequip based on action and category
        if action == 'equip':
            if item.get_category_name() == 'banner':
                user_config.banner_item_id = item_id
            elif item.get_category_name() == 'avatar':
                user_config.avatar_item_id = item_id
            elif item.get_category_name() == 'decoration':
                user_config.decoration_item_id = item_id
            
            message = f'Successfully equipped {item.name}!'
        else:  # unequip
            if item.get_category_name() == 'banner' and user_config.banner_item_id == item_id:
                user_config.banner_item_id = None
            elif item.get_category_name() == 'avatar' and user_config.avatar_item_id == item_id:
                user_config.avatar_item_id = None
            elif item.get_category_name() == 'decoration' and user_config.decoration_item_id == item_id:
                user_config.decoration_item_id = None
            
            message = f'Successfully unequipped {item.name}!'
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': message,
            'action': action,
            'item': {
                'id': item.id,
                'name': item.name,
                'category': item.get_category_name()
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Error equipping avatar item: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while updating item'
        }), 500

# Simple Marketplace API Route
@app.route('/api/marketplace', methods=['GET'])
def get_marketplace_items():
    """Get marketplace items from database with filtering and favorite status"""
    try:
        user_id = None
        if session.get('logged_in') and session.get('user_id'):
            user_id = session['user_id']
        
        # Get query parameters for filtering
        search_term = request.args.get('search', '').strip()
        category = request.args.get('category', 'all').strip()
        rarity = request.args.get('rarity', 'all').strip()
        price_min = request.args.get('price_min', type=float)
        price_max = request.args.get('price_max', type=float)
        sort_by = request.args.get('sort', 'newest').strip()
        favorites_only = request.args.get('favorites_only', '').strip().lower() == 'true'
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 12, type=int)
        
        # Build base query for active marketplace items
        query = MarketplaceItem.query.filter(
            MarketplaceItem.is_active == True
        )
        
        # Apply search filter (search in card_name, card_series, card_description)
        if search_term:
            query = query.filter(
                db.or_(
                    MarketplaceItem.card_name.ilike(f'%{search_term}%'),
                    MarketplaceItem.card_series.ilike(f'%{search_term}%'),
                    MarketplaceItem.card_description.ilike(f'%{search_term}%')
                )
            )
        
        # Apply category filter (filter by card_name)
        if category and category.lower() != 'all':
            query = query.filter(MarketplaceItem.card_name == category)
        
        # Apply rarity filter
        if rarity and rarity.lower() != 'all':
            query = query.filter(MarketplaceItem.rarity.ilike(rarity))
        
        # Apply price filters
        if price_min is not None:
            query = query.filter(MarketplaceItem.card_price >= price_min)
        if price_max is not None:
            query = query.filter(MarketplaceItem.card_price <= price_max)
        
        # Apply sorting
        if sort_by == 'price_low':
            query = query.order_by(MarketplaceItem.card_price.asc())
        elif sort_by == 'price_high':
            query = query.order_by(MarketplaceItem.card_price.desc())
        elif sort_by == 'oldest':
            query = query.order_by(MarketplaceItem.created_at.asc())
        elif sort_by == 'name':
            query = query.order_by(MarketplaceItem.card_name.asc())
        else:  # 'newest' or any other value
            query = query.order_by(MarketplaceItem.created_at.desc())
        
        # Get total count before pagination
        total_items = query.count()
        
        # Apply pagination
        per_page = min(max(per_page, 1), 50)  # Limit per_page to reasonable values
        items = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # Get user's favorites if logged in
        user_favorites = set()
        if user_id:
            favorites = UserFavorite.query.filter_by(user_id=user_id).all()
            user_favorites = {fav.marketplace_item_id for fav in favorites}
        
        # Apply favorites filter if requested and user is logged in
        if favorites_only and user_id:
            if user_favorites:
                # Filter to only show user's favorite items
                filtered_items = [item for item in items.items if item.id in user_favorites]
                # Create a new mock pagination object for the filtered results
                class MockPagination:
                    def __init__(self, filtered_items):
                        self.items = filtered_items
                        self.total = len(filtered_items)
                        self.page = page
                        self.per_page = per_page
                        self.pages = max(1, (len(filtered_items) + per_page - 1) // per_page)
                        self.has_prev = False
                        self.has_next = False
                
                items = MockPagination(filtered_items)
            else:
                # User has no favorites, return empty result
                class MockPagination:
                    def __init__(self, filtered_items):
                        self.items = filtered_items
                        self.total = len(filtered_items)
                        self.page = page
                        self.per_page = per_page
                        self.pages = max(1, (len(filtered_items) + per_page - 1) // per_page)
                        self.has_prev = False
                        self.has_next = False
                
                items = MockPagination([])
        
        # Format items for frontend
        formatted_items = []
        for item in items.items:
            # Use url_for to create proper image URLs
            # Handle different image path formats from database
            if item.image_path:
                # Handle paths that start with /static/
                if item.image_path.startswith('/static/'):
                    image_filename = item.image_path.replace('/static/', '')
                    image_url = url_for('static', filename=image_filename)
                # Handle paths that start with images/ (direct static paths)
                elif item.image_path.startswith('images/'):
                    image_url = url_for('static', filename=item.image_path)
                # Handle any other format - assume it's a static path
                else:
                    image_url = url_for('static', filename=item.image_path)
            else:
                # Default placeholder image when no image_path
                image_url = url_for('static', filename='images/Goddess Story/Goddess Story.png')
            
            formatted_item = {
                'id': item.id,
                'name': item.card_name,
                'series': item.card_series,
                'description': item.card_description,
                'price': item.card_price,
                'category': item.category or 'card',
                'rarity': item.rarity or 'common',
                'image_path': item.image_path,
                'image_url': image_url,
                'is_active': item.is_active,
                'is_favorite': item.id in user_favorites,
                'created_at': item.created_at.isoformat() if item.created_at else None
            }
            formatted_items.append(formatted_item)
        
        return jsonify({
            'success': True,
            'items': formatted_items,
            'total': len(formatted_items)
        }), 200
        
    except Exception as e:
        print(f"Marketplace API error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'Failed to load marketplace items',
            'error': str(e)
        }), 500

# Marketplace Favorites API Routes
@app.route('/api/marketplace/favorites', methods=['POST'])
def add_favorite():
    """Add an item to user's favorites"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to add favorites'
            }), 401
        
        user_id = session['user_id']
        data = request.get_json()
        
        if not data or 'item_id' not in data:
            return jsonify({
                'success': False,
                'message': 'Item ID is required'
            }), 400
        
        item_id = data['item_id']
        
        # Check if marketplace item exists
        marketplace_item = MarketplaceItem.query.filter_by(
            id=item_id,
            is_active=True
        ).first()
        
        if not marketplace_item:
            return jsonify({
                'success': False,
                'message': 'Marketplace item not found'
            }), 404
        
        # Check if already favorited
        existing_favorite = UserFavorite.query.filter_by(
            user_id=user_id,
            marketplace_item_id=item_id
        ).first()
        
        if existing_favorite:
            return jsonify({
                'success': False,
                'message': 'Item is already in your favorites'
            }), 400
        
        # Create new favorite
        new_favorite = UserFavorite(
            user_id=user_id,
            marketplace_item_id=item_id
        )
        
        db.session.add(new_favorite)
        db.session.commit()
        
        print(f"Favorite added: User {user_id} favorited item {item_id} ({marketplace_item.card_name})")
        
        return jsonify({
            'success': True,
            'message': f'Added {marketplace_item.card_name} to favorites!',
            'item_id': item_id,
            'item_name': marketplace_item.card_name
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Add favorite error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while adding to favorites'
        }), 500

@app.route('/api/marketplace/favorites', methods=['DELETE'])
def remove_favorite():
    """Remove an item from user's favorites"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to manage favorites'
            }), 401
        
        user_id = session['user_id']
        data = request.get_json()
        
        if not data or 'item_id' not in data:
            return jsonify({
                'success': False,
                'message': 'Item ID is required'
            }), 400
        
        item_id = data['item_id']
        
        # Find the favorite to remove
        favorite = UserFavorite.query.filter_by(
            user_id=user_id,
            marketplace_item_id=item_id
        ).first()
        
        if not favorite:
            return jsonify({
                'success': False,
                'message': 'Item not found in your favorites'
            }), 404
        
        # Get item name for response
        item_name = favorite.marketplace_item.card_name if favorite.marketplace_item else 'Item'
        
        # Remove the favorite
        db.session.delete(favorite)
        db.session.commit()
        
        print(f"Favorite removed: User {user_id} unfavorited item {item_id} ({item_name})")
        
        return jsonify({
            'success': True,
            'message': f'Removed {item_name} from favorites!',
            'item_id': item_id,
            'item_name': item_name
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Remove favorite error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while removing from favorites'
        }), 500

@app.route('/api/marketplace/favorites', methods=['GET'])
def get_user_favorites():
    """Get user's favorite items"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to view your favorites'
            }), 401
        
        user_id = session['user_id']
        
        # Get user's favorites with marketplace item details
        favorites = db.session.query(UserFavorite, MarketplaceItem).join(
            MarketplaceItem, UserFavorite.marketplace_item_id == MarketplaceItem.id
        ).filter(
            UserFavorite.user_id == user_id,
            MarketplaceItem.is_active == True
        ).order_by(UserFavorite.created_at.desc()).all()
        
        # Format favorites for frontend
        formatted_favorites = []
        for favorite, item in favorites:
            # Use url_for to create proper image URLs
            if item.image_path:
                # Handle paths that start with /static/
                if item.image_path.startswith('/static/'):
                    image_filename = item.image_path.replace('/static/', '')
                    image_url = url_for('static', filename=image_filename)
                # Handle paths that start with images/ (direct static paths)
                elif item.image_path.startswith('images/'):
                    image_url = url_for('static', filename=item.image_path)
                # Handle any other format - assume it's a static path
                else:
                    image_url = url_for('static', filename=item.image_path)
            else:
                # Default placeholder image when no image_path
                image_url = url_for('static', filename='images/Goddess Story/Goddess Story.png')
            
            formatted_favorite = {
                'favorite_id': favorite.id,
                'favorited_at': favorite.created_at.isoformat() if favorite.created_at else None,
                'item': {
                    'id': item.id,
                    'name': item.card_name,
                    'series': item.card_series,
                    'description': item.card_description,
                    'price': item.card_price,
                    'category': item.category or 'card',
                    'rarity': item.rarity or 'common',
                    'image_path': item.image_path,
                    'image_url': image_url,
                    'is_favorite': True,  # Always true for this endpoint
                    'created_at': item.created_at.isoformat() if item.created_at else None
                }
            }
            formatted_favorites.append(formatted_favorite)
        
        return jsonify({
            'success': True,
            'favorites': formatted_favorites,
            'total': len(formatted_favorites)
        }), 200
        
    except Exception as e:
        print(f"Get favorites error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching your favorites'
        }), 500

@app.route('/api/marketplace/unique-card-names', methods=['GET'])
def get_unique_card_names():
    """Get unique card names from marketplace items for category filter"""
    try:
        # Get distinct card names from active marketplace items
        unique_names = db.session.query(
            MarketplaceItem.card_name
        ).filter(
            MarketplaceItem.is_active == True
        ).distinct().order_by(
            MarketplaceItem.card_name
        ).all()
        
        # Extract card names from query result tuples
        card_names = [name[0] for name in unique_names]
        
        return jsonify({
            'success': True,
            'card_names': card_names,
            'total': len(card_names)
        }), 200
        
    except Exception as e:
        print(f"Get unique card names error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Failed to load card names',
            'error': str(e)
        }), 500

@app.route('/api/marketplace/item/<int:item_id>', methods=['GET'])
def get_marketplace_item_details(item_id):
    """Get detailed information about a specific marketplace item"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to view item details'
            }), 401
        
        user_id = session['user_id']
        
        # Get the item
        item = MarketplaceItem.query.filter_by(
            id=item_id,
            is_active=True
        ).first()
        
        if not item:
            return jsonify({
                'success': False,
                'message': 'Item not found or no longer available'
            }), 404
        
        # Get seller information
        seller_info = {
            'id': item.seller.id if item.seller else None,
            'username': item.seller.username if item.seller else 'Unknown',
            'first_name': item.seller.first_name if item.seller else 'Unknown',
            'last_name': item.seller.last_name if item.seller else '',
            'level': item.seller.level if item.seller else 1,
            'pearl_balance': item.seller.pearl if item.seller else 0
        }
        
        # Calculate time since listing
        time_since_listing = datetime.now() - item.created_at if item.created_at else timedelta(0)
        if time_since_listing.days > 0:
            time_ago = f"{time_since_listing.days} days ago"
        elif time_since_listing.seconds > 3600:
            hours = time_since_listing.seconds // 3600
            time_ago = f"{hours} hours ago"
        elif time_since_listing.seconds > 60:
            minutes = time_since_listing.seconds // 60
            time_ago = f"{minutes} minutes ago"
        else:
            time_ago = "Just now"
        
        # Check ownership and purchase eligibility
        is_own_item = item.seller_id == user_id
        can_purchase = not is_own_item and item.is_active
        
        # Get current user's pearl balance for purchase validation
        current_user = db.session.get(User, user_id)
        has_enough_pearls = current_user.pearl >= item.card_price if current_user else False
        
        item_details = {
            'id': item.id,
            'title': item.card_name,
            'description': item.card_description,
            'price': item.card_price,
            'category': item.category,
            'rarity': item.rarity,
            'image_url': item.image_path,
            'seller': seller_info,
            'time_ago': time_ago,
            'created_at': item.created_at.isoformat() if item.created_at else None,
            'updated_at': item.updated_at.isoformat() if item.updated_at else None,
            'is_own_item': is_own_item,
            'can_purchase': can_purchase,
            'has_enough_pearls': has_enough_pearls,
            'user_pearl_balance': current_user.pearl if current_user else 0,
            'rarity_color': {
                'common': '#9ca3af',
                'rare': '#3b82f6', 
                'epic': '#8b5cf6',
                'legendary': '#f59e0b',
                'mythic': '#ef4444'
            }.get(item.rarity, '#9ca3af')
        }
        
        return jsonify({
            'success': True,
            'item': item_details
        }), 200
        
    except Exception as e:
        print(f"Marketplace item details error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching item details'
        }), 500

# Battle Pass API Routes
@app.route('/api/battle-pass/claimed-rewards', methods=['GET'])
def get_battle_pass_claimed_rewards():
    """Get all claimed battle pass rewards for the logged-in user"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to view your battle pass progress'
            }), 401
        
        user_id = session['user_id']
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Get all claimed levels for this user
        claimed_levels = BattlePassClaim.get_user_claimed_levels(user_id)
        
        # Get detailed claim information
        claims = BattlePassClaim.query.filter_by(user_id=user_id).order_by(BattlePassClaim.level).all()
        
        # Calculate total pearls earned from battle pass
        total_pearls_from_bp = BattlePassClaim.get_user_total_pearl_rewards(user_id)
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'current_level': user.level,
            'claimed_levels': claimed_levels,
            'claims': [claim.to_dict() for claim in claims],
            'total_pearls_earned': total_pearls_from_bp
        }), 200
        
    except Exception as e:
        print(f"Battle pass claimed rewards error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching battle pass data'
        }), 500

@app.route('/api/battle-pass/claim-reward/<int:level>', methods=['POST'])
def claim_battle_pass_reward(level):
    """Claim a battle pass reward for a specific level"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to claim battle pass rewards'
            }), 401
        
        user_id = session['user_id']
        # Use SELECT FOR UPDATE to lock the user record and prevent race conditions
        user = User.query.filter_by(id=user_id).with_for_update().first()
        
        if not user:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Validate level parameter
        if level < 1 or level > 100:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': 'Invalid level. Must be between 1 and 100.'
            }), 400
        
        # Check if user has reached this level
        if user.level < level:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': f'You must reach level {level} to claim this reward. Current level: {user.level}'
            }), 400
        
        # Check if reward has already been claimed
        existing_claim = BattlePassClaim.query.filter_by(
            user_id=user_id,
            level=level
        ).first()
        
        if existing_claim:
            db.session.rollback()
            return jsonify({
                'success': False,
                'message': f'Level {level} reward has already been claimed'
            }), 400
        
        # All levels now get pearl rewards only
        pearl_amount = level * 100
        reward_type = 'pearls'
        reward_data = {
            'icon': 'fa-gem',
            'title': '',
            'value': f'<i class="fas fa-gem" style="color: #f59e0b; margin-right: 4px;"></i>{pearl_amount}',
            'type': 'pearls'
        }
        pearls_awarded = pearl_amount
        
        # Store original balance for verification
        original_balance = user.pearl
        
        # Create the battle pass claim record
        new_claim = BattlePassClaim(
            user_id=user_id,
            level=level,
            reward_type=reward_type,
            reward_data=reward_data,
            pearls_awarded=pearls_awarded
        )
        
        # Add pearls to user's account if applicable
        if pearls_awarded > 0:
            user.pearl += pearls_awarded
            expected_balance = original_balance + pearls_awarded
            
            # Verify balance update
            if user.pearl != expected_balance:
                db.session.rollback()
                return jsonify({
                    'success': False,
                    'message': 'Balance synchronization error. Please try again.'
                }), 500
            
            # Create transaction record for pearl rewards
            reward_transaction = Transaction(
                user_id=user_id,
                transaction_type='battle_pass_reward',
                amount=pearls_awarded,
                description=f'Battle Pass Level {level} reward ({pearls_awarded} pearls)',
                reference_id=f'BP-{level}-{user_id}-{int(datetime.now().timestamp())}',
                created_at=datetime.now()
            )
            
            db.session.add(reward_transaction)
        else:
            # Create transaction record for non-pearl rewards (items, trophies, etc.)
            reward_transaction = Transaction(
                user_id=user_id,
                transaction_type='battle_pass_reward',
                amount=0,
                description=f'Battle Pass Level {level} reward ({reward_data["title"]})',
                reference_id=f'BP-{level}-{user_id}-{int(datetime.now().timestamp())}',
                created_at=datetime.now()
            )
            
            db.session.add(reward_transaction)
        
        # Add the claim record to the session
        db.session.add(new_claim)
        
        # Flush to get the claim ID and validate constraints
        db.session.flush()
        
        # Final commit - balance, claim record, and transaction are updated atomically
        db.session.commit()
        
        # Log successful transaction
        print(f"Battle pass reward claimed: User {user_id} claimed level {level} reward, pearls: {pearls_awarded}, new balance: {user.pearl}")
        
        # Prepare success message
        if pearls_awarded > 0:
            success_message = f'Level {level} reward claimed! You earned {pearls_awarded} pearls.'
        else:
            success_message = f'Level {level} reward claimed! You earned {reward_data["title"]}.'
        
        return jsonify({
            'success': True,
            'message': success_message,
            'level': level,
            'reward_type': reward_type,
            'reward_data': reward_data,
            'pearls_awarded': pearls_awarded,
            'original_balance': original_balance,
            'new_pearl_balance': user.pearl,
            'claim_details': new_claim.to_dict()
        }), 200
        
    except Exception as e:
        # Always rollback on any error to maintain data consistency
        db.session.rollback()
        print(f"Battle pass claim error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': 'An error occurred while claiming your battle pass reward. Please try again.',
            'error_details': str(e) if app.config.get('DEBUG') else None
        }), 500

@app.route('/api/battle-pass/data', methods=['GET'])
def get_battle_pass_data():
    """Get battle pass data including claimed status for the logged-in user"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to view battle pass data'
            }), 401
        
        user_id = session['user_id']
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Get claimed levels
        claimed_levels = BattlePassClaim.get_user_claimed_levels(user_id)
        
        # Generate battle pass tiers with claim status
        tiers = []
        for level in range(1, 101):  # Levels 1-100
            # Calculate if this level has rewards (all levels now have rewards)
            has_reward = True
            is_claimed = level in claimed_levels
            
            # All levels now get pearl rewards only
            pearl_amount = level * 100
            reward = {
                'icon': 'fa-gem',
                'title': '',
                'value': f'<i class="fas fa-gem" style="color: #f59e0b; margin-right: 4px;"></i>{pearl_amount}',
                'type': 'pearls',
                'claimed': is_claimed
            }
            
            tiers.append({
                'level': level,
                'has_reward': has_reward,
                'reward': reward,
                'exp_reward': 50 + (level * 10) if not has_reward else 0  # EXP for levels without item rewards
            })
        
        return jsonify({
            'success': True,
            'user_level': user.level,
            'user_exp': user.exp,
            'tiers': tiers,
            'claimed_levels': claimed_levels
        }), 200
        
    except Exception as e:
        print(f"Battle pass data error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching battle pass data'
        }), 500

@app.route('/pearl_card_set')
def pearl_card_set():
    """Pearl Card Set - collection progress and card series view"""
    # Check if user is logged in
    if not session.get('logged_in'):
        return redirect('/login')
    
    # Get card_name and card_series parameters
    card_name = request.args.get('card_name', 'Unknown')
    card_series = request.args.get('card_series', 'Unknown')
    
    # For backward compatibility, also check 'series' parameter
    if card_series == 'Unknown' and request.args.get('series'):
        card_series = request.args.get('series')
    
    # Use card_series for display, but card_name for file path generation
    series = card_series
    
    # Load card data from JSON file
    cards = []
    cards_by_rarity = {}
    total_count = 0
    owned_count = 0
    missing_count = 0
    completion_percentage = 0
    
    json_file_path = f'cardset/{card_name}/{card_series}.json'
    full_json_path = os.path.join(app.root_path, 'static', json_file_path)
    
    if os.path.exists(full_json_path):
        try:
            import json
            with open(full_json_path, 'r', encoding='utf-8') as f:
                card_data = json.load(f)
            
            # Extract cards from the nested gacha.pool structure
            gacha_data = card_data.get('gacha', {})
            pool_cards = gacha_data.get('pool', [])
            rarity_tiers = gacha_data.get('rarity_tiers', [])
            
            # Build rarity mapping from JSON rarity_tiers - use actual rarity codes
            rarity_map = {}
            rarity_order = {}
            for i, tier in enumerate(rarity_tiers):
                tier_code = tier.get('tier', '')
                tier_chance = tier.get('chance', 0)
                # Use the actual tier code as the display name
                display_name = tier_code
                
                rarity_map[tier_code] = display_name
                rarity_order[display_name] = i  # For sorting purposes
            
            print(f"Rarity tiers found: {rarity_tiers}")
            print(f"Rarity mapping: {rarity_map}")
            
            # Process each card from the JSON data
            for card in pool_cards:
                # Get filename from JSON and construct image URL
                filename = card.get('file_name', '')
                if filename:
                    # Construct image path: images/<card_name>/<card_series>/{filename}
                    image_path = f'images/{card_name}/{card_series}/{filename}'
                    image_url = url_for('static', filename=image_path)
                else:
                    # Default placeholder if no filename
                    image_url = url_for('static', filename='images/placeholder-card.webp')
                
                # Get rarity code and use it directly as display name
                rarity_code = card.get('rarity', 'R')
                rarity = rarity_map.get(rarity_code, rarity_code)  # Use rarity_code as fallback instead of 'Common'
                
                # Extract card number from card_code (e.g., "R-1" -> "1")
                card_code = card.get('card_code', '')
                card_number = card_code.split('-')[-1] if '-' in card_code else card_code
                
                # Generate card name from rarity and number
                card_name_display = f"{card_series} {rarity_code}-{card_number}" if card_number else f"{card_series} Card"
                
                # Calculate price based on rarity - use dynamic pricing based on rarity order
                # Base price increases with rarity tier level
                rarity_tier_index = rarity_order.get(rarity, 0)
                base_prices = [100, 250, 500, 1000, 2500, 5000]  # Prices for tiers 0-5
                price = base_prices[min(rarity_tier_index, len(base_prices) - 1)]
                
                # Create card info object
                card_info = {
                    'id': card_code,  # Use card_code as ID
                    'name': card_name_display,
                    'series': card_series,
                    'rarity': rarity,
                    'price': price,  # Use the dynamically calculated price
                    'description': f'A {rarity.lower()} card from the {card_series} collection.',
                    'image_url': image_url,
                    'filename': filename,
                    'owned': False,  # TODO: Load actual ownership data from database
                    'available_for_purchase': True
                }
                
                # Add to main cards list
                cards.append(card_info)
                
                # Group cards by rarity for category display
                if rarity not in cards_by_rarity:
                    cards_by_rarity[rarity] = []
                cards_by_rarity[rarity].append(card_info)
            
            # Sort cards by rarity priority (from JSON) and then by name
            # Use the rarity_order built from JSON rarity_tiers, fallback to default for unknown rarities
            default_rarity_order = {
                'Common': 1, 'Uncommon': 2, 'Rare': 3, 'Epic': 4, 
                'Legendary': 5, 'Mythic': 6, 'Unknown': 99
            }
            # Merge JSON-based order with default fallback
            final_rarity_order = {**default_rarity_order, **rarity_order}
            cards.sort(key=lambda x: (final_rarity_order.get(x['rarity'], 99), x['name']))
            
            # Sort cards within each rarity group
            for rarity in cards_by_rarity:
                cards_by_rarity[rarity].sort(key=lambda x: x['name'])
            
            # Calculate collection statistics
            total_count = len(cards)
            owned_count = sum(1 for card in cards if card.get('owned', False))
            missing_count = total_count - owned_count
            completion_percentage = round((owned_count / total_count) * 100) if total_count > 0 else 0
            
            print(f"Loaded {len(cards)} cards from JSON: {json_file_path}")
            print(f"Rarity categories: {list(cards_by_rarity.keys())}")
            print(f"Collection stats - Total: {total_count}, Owned: {owned_count}, Missing: {missing_count}, Completion: {completion_percentage}%")
            
        except Exception as e:
            print(f"Error reading JSON file {full_json_path}: {str(e)}")
            cards = []
            cards_by_rarity = {}
            total_count = 0
            owned_count = 0
            missing_count = 0
            completion_percentage = 0
    else:
        print(f"JSON file not found: {full_json_path}")
        cards = []
        cards_by_rarity = {}
    
    # If no JSON data was loaded, create sample cards for fallback
    if not cards:
        sample_cards = [
            {
                'id': 1,
                'name': f'{series} Warrior',
                'series': series,
                'rarity': 'Common',
                'price': 500,
                'description': f'A brave warrior from the {series} collection.',
                'image_url': '/static/images/placeholder-card.webp',
                'owned': True,
                'available_for_purchase': False
            },
            {
                'id': 2,
                'name': f'{series} Mage',
                'series': series,
                'rarity': 'Uncommon',
                'price': 750,
                'description': f'A powerful mage from the {series} collection.',
                'image_url': '/static/images/placeholder-card.webp',
                'owned': True,
                'available_for_purchase': False
            },
            {
                'id': 3,
                'name': f'{series} Assassin',
                'series': series,
                'rarity': 'Rare',
                'price': 1000,
                'description': f'A deadly assassin from the {series} collection.',
                'image_url': '/static/images/placeholder-card.webp',
                'owned': False,
                'available_for_purchase': True
            },
            {
                'id': 4,
                'name': f'{series} Dragon',
                'series': series,
                'rarity': 'Epic',
                'price': 2500,
                'description': f'A mighty dragon from the {series} collection.',
                'image_url': '/static/images/placeholder-card.webp',
                'owned': False,
                'available_for_purchase': True
            },
            {
                'id': 5,
                'name': f'{series} Legend',
                'series': series,
                'rarity': 'Legendary',
                'price': 5000,
                'description': f'The legendary hero of the {series} collection.',
                'image_url': '/static/images/placeholder-card.webp',
                'owned': False,
                'available_for_purchase': True
            },
            {
                'id': 6,
                'name': f'{series} Mystic',
                'series': series,
                'rarity': 'Mythic',
                'price': 10000,
                'description': f'The ultimate mystic being from the {series} collection.',
                'image_url': '/static/images/placeholder-card.webp',
                'owned': False,
                'available_for_purchase': True
            }
        ]
        
        # Use sample cards and recalculate statistics
        cards = sample_cards
        total_count = len(sample_cards)
        owned_count = sum(1 for card in sample_cards if card['owned'])
        missing_count = total_count - owned_count
        completion_percentage = round((owned_count / total_count) * 100) if total_count > 0 else 0
        
        # Group sample cards by rarity
        cards_by_rarity = {}
        for card in sample_cards:
            rarity = card['rarity']
            if rarity not in cards_by_rarity:
                cards_by_rarity[rarity] = []
            cards_by_rarity[rarity].append(card)
    
    return render_template('pearl_card_set.html',
                         series=series,
                         card_name=card_name,
                         card_series=card_series,
                         card_images=cards,  # Use the loaded cards from JSON
                         card_images_by_rarity=cards_by_rarity,  # Use rarity-based categories
                         cards=cards if cards else sample_cards,  # Fallback to sample_cards if no JSON
                         total_count=total_count,
                         owned_count=owned_count,
                         missing_count=missing_count,
                         completion_percentage=completion_percentage)

@app.route('/api/purchase_card', methods=['POST'])
def api_purchase_card():
    """API endpoint to purchase a card from a collection"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to purchase cards'
            }), 401
        
        user_id = session['user_id']
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Get JSON data from request
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        card_id = data.get('card_id')
        if not card_id:
            return jsonify({
                'success': False,
                'message': 'Card ID is required'
            }), 400
        
        # For demo purposes, simulate successful purchase
        # In a real implementation, you would:
        # 1. Check if card exists and is available for purchase
        # 2. Check if user has sufficient pearls
        # 3. Update user's card collection
        # 4. Deduct pearls from user's account
        # 5. Create transaction record
        
        # Mock card prices for demo
        card_prices = {
            '1': 500, '2': 750, '3': 1000, '4': 2500, '5': 5000, '6': 10000
        }
        
        card_price = card_prices.get(str(card_id), 1000)
        
        # Check if user has enough pearls
        if user.pearl < card_price:
            return jsonify({
                'success': False,
                'message': f'Insufficient pearls. You need {card_price} pearls but only have {user.pearl}.'
            }), 400
        
        # Simulate successful purchase
        user.pearl -= card_price
        
        # Create transaction record
        purchase_transaction = Transaction(
            user_id=user_id,
            transaction_type='card_purchase',
            amount=-card_price,
            description=f'Purchased card ID {card_id}',
            reference_id=f'CARD-{card_id}-{int(datetime.now().timestamp())}'
        )
        
        db.session.add(purchase_transaction)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Card purchased successfully! You spent {card_price} pearls.',
            'new_balance': user.pearl,
            'transaction_id': purchase_transaction.id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"Card purchase error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while purchasing the card. Please try again.'
        }), 500


def create_tables():
    db.create_all()

if __name__ == '__main__':
    with app.app_context():
        create_tables()
    
    print(f"Starting {app.config['APP_NAME']} v{app.config['APP_VERSION']}")
    print(f"Database: {app.config.get('DB_NAME', 'Not configured')}")
    print(f"Environment: {config_name}")
    app.run(debug=app.config['DEBUG'], host='0.0.0.0', port=5000)
