from flask import Flask, render_template, request, jsonify, session, redirect, url_for, send_from_directory
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from config import get_config
from models import db, User, DailyClaim, Referral, Transaction, Transfer, Follow, Post, PostReaction, SocialMediaLink, Comment, CommentLike
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





@app.route('/')
def index():
    """Main landing page"""
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Login route"""
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
                'created_at': user.created_at.isoformat() if user.created_at else None
            }
        }
        return jsonify(user_data), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching user data.'
        }), 500

@app.route('/api/update-bio', methods=['POST'])
def api_update_bio():
    """API endpoint to update user bio"""
    try:
        # Check if user is logged in
        if not session.get('logged_in'):
            return jsonify({'success': False, 'message': 'Not logged in'}), 401
        
        # Get JSON data from request
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        bio = data.get('bio', '').strip()
        
        # Get user from database
        user = db.session.get(User, session.get('user_id'))
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        # Update bio
        user.bio = bio
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Bio updated successfully'
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'An error occurred while updating bio.'
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
        required_fields = ['firstName', 'lastName', 'username', 'email', 'password', 'dateOfBirth']
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
        date_of_birth_str = (data.get('dateOfBirth') or '').strip()
        
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
            # Check if user is at least 13 years old
            today = date.today()
            age = today.year - date_of_birth.year - ((today.month, today.day) < (date_of_birth.month, date_of_birth.day))
            if age < 13:
                return jsonify({
                    'success': False,
                    'message': 'You must be at least 13 years old to register'
                }), 400
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Please enter a valid date of birth'
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
                # Award 1000 pearls to both referrer and new user
                referrer.pearl += 1000
                new_user.pearl += 1000
                referral_bonus_awarded = True
                
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
                    description=f'Referral bonus for referring {new_user.username}',
                    related_user_id=new_user.id,
                    reference_id=f'REF-{int(datetime.now().timestamp())}-{referrer.id}'
                )
                
                referee_transaction = Transaction(
                    user_id=new_user.id,
                    transaction_type='referral_bonus',
                    amount=1000,
                    description=f'Referral bonus for using {referrer.username} referral code',
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
            success_message += f' You and your referrer each earned 1000 bonus pearls!'
        
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
        return jsonify({
            'success': False,
            'message': 'An error occurred during registration. Please try again.'
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
        
        pearl_reward = reward_amounts[current_streak]
        
        # Store original balance for verification
        original_balance = user.pearl
        
        # Create the daily claim record
        new_claim = DailyClaim(
            user_id=user_id,
            claim_date=today,
            day_number=current_streak,
            pearl_amount=pearl_reward,
            streak_count=current_streak
        )
        
        # Add pearls to user's account
        user.pearl += pearl_reward
        expected_balance = original_balance + pearl_reward
        
        # Verify balance update
        if user.pearl != expected_balance:
            db.session.rollback()
            
            return jsonify({
                'success': False,
                'message': 'Balance synchronization error. Please try again.'
            }), 500
        
        # Create transaction record for the daily claim
        claim_transaction = Transaction(
            user_id=user_id,
            transaction_type='daily_claim',
            amount=pearl_reward,
            description=f'Daily claim reward - Day {current_streak} ({pearl_reward} pearls)',
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
        print(f"Daily claim successful: User {user_id} claimed {pearl_reward} pearls, new balance: {user.pearl}")
        
        # Check if this completes a 7-day cycle
        cycle_completed = current_streak == 7
        bonus_message = ""
        if cycle_completed:
            bonus_message = " Congratulations! You've completed a 7-day cycle!"
        
        return jsonify({
            'success': True,
            'message': f'Daily reward claimed! You earned {pearl_reward} pearls.{bonus_message}',
            'claimed_amount': pearl_reward,
            'original_balance': original_balance,
            'new_pearl_balance': user.pearl,
            'current_streak': current_streak,
            'cycle_completed': cycle_completed,
            'next_reward': reward_amounts[1] if cycle_completed else reward_amounts[current_streak + 1] if current_streak < 7 else reward_amounts[1],
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
        if transaction_type and transaction_type in ['send', 'receive', 'bought', 'referral', 'daily_claim']:
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
        
        # Count posts by this user
        posts_count = Post.query.filter_by(user_id=user_id).count()
        
        # Get recent followers for display
        recent_followers = Follow.query.filter_by(
            following_id=user_id
        ).order_by(Follow.created_at.desc()).limit(5).all()
        
        # Get recent posts for display
        recent_posts = Post.query.filter_by(
            user_id=user_id
        ).order_by(Post.created_at.desc()).limit(3).all()
        
        return jsonify({
            'success': True,
            'user_id': user_id,
            'followers_count': followers_count,
            'following_count': following_count,
            'posts_count': posts_count,
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
            'recent_posts': [post.to_dict() for post in recent_posts]
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
        
        # Update user information
        user.first_name = first_name
        user.last_name = last_name
        user.email = email
        
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
        
        recipient_identifier = data.get('recipient', '').strip()
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
            'discord': r'^.+#\d{4}$',  # Discord username format
            'twitch': r'^https?://(www\.)?twitch\.tv/.+$',
            'snapchat': r'^.+$',  # Snapchat username
            'whatsapp': r'^\+?[1-9]\d{1,14}$',  # WhatsApp phone number
            'telegram': r'^.+$',  # Telegram username
            'reddit': r'^https?://(www\.)?reddit\.com/.+$',
            'pinterest': r'^https?://(www\.)?pinterest\.com/.+$',
            'steam': r'^https?://steamcommunity\.com/.+$',
            'website': r'^https?://.+$'  # Generic URL pattern
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
                        # For Discord, validate username format
                        if platform == 'discord' and not re.match(platform_patterns['discord'], link_value):
                            errors.append(f'{platform.title()}: Please enter a valid Discord username (e.g., username#1234)')
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

# Posts API Routes

# Helper: Valid reaction types
VALID_REACTIONS = {'like', 'love', 'haha', 'wow', 'sad', 'angry'}

@app.route('/api/posts', methods=['POST'])
def create_post():
    """Create a new post for the logged-in user"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to create a post'
            }), 401
        
        user_id = session['user_id']
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Handle both JSON and FormData requests
        content = ''
        image_url = ''
        feeling = ''
        location = ''
        
        # Check if this is a FormData request (from modal) or JSON request (from simple form)
        if request.content_type and 'multipart/form-data' in request.content_type:
            # Handle FormData (from create post modal)
            content = request.form.get('content', '').strip()
            feeling = request.form.get('feeling', '').strip()
            location = request.form.get('location', '').strip()
            
            # Handle file uploads if any
            uploaded_files = []
            for key in request.files:
                if key.startswith('image_'):
                    file = request.files[key]
                    if file and file.filename:
                        uploaded_files.append(file)
            
            # Process and save uploaded images
            if uploaded_files:
                try:
                    # For now, we'll handle the first uploaded image
                    # In a real implementation, you might want to handle multiple images
                    file = uploaded_files[0]
                    
                    # Save the uploaded file
                    image_url, error_message = save_uploaded_file(file, user_id)
                    
                    if error_message:
                        return jsonify({
                            'success': False,
                            'message': f'Image upload failed: {error_message}'
                        }), 400
                        
                    print(f"Image uploaded successfully: {image_url}")
                    
                except Exception as e:
                    print(f"Error uploading image: {e}")
                    return jsonify({
                        'success': False,
                        'message': 'Error uploading image. Please try again.'
                    }), 500
        
        else:
            # Handle JSON data (from simple post creation)
            data = request.get_json()
            if not data:
                return jsonify({
                    'success': False,
                    'message': 'No data provided'
                }), 400
            
            # Extract fields from request (support both field names for backward compatibility)
            content = data.get('content', '').strip() or data.get('caption', '').strip()
            image_url = data.get('image_url', '').strip() or data.get('photos', '').strip()
            feeling = data.get('feeling', '').strip()
            location = data.get('location', '').strip()
        
        # Parse feeling from content if not explicitly provided
        if not feeling and content:
            import re
            # Look for pattern like <Feeling excited>, <feeling happy>, etc.
            feeling_pattern = r'<[Ff]eeling\s+([^>]+)>'
            feeling_match = re.search(feeling_pattern, content)
            if feeling_match:
                feeling = feeling_match.group(1).strip().lower()
                # Remove the feeling tag from content
                content = re.sub(feeling_pattern, '', content).strip()
                print(f"Extracted feeling '{feeling}' from content")
        
        # Common validation for both request types
        # Validate content/caption (required)
        if not content:
            return jsonify({
                'success': False,
                'message': 'Post caption is required'
            }), 400
        
        if len(content) > 1000:  # Set reasonable character limit
            return jsonify({
                'success': False,
                'message': 'Post caption must be 1000 characters or less'
            }), 400
        
        # Validate image URL if provided (optional) - skip validation for placeholder uploads
        if image_url and not image_url.startswith('placeholder_'):
            # Allow local upload paths (/uploads/...) and external URLs (http/https)
            if not (image_url.startswith('/uploads/') or image_url.startswith('http://') or image_url.startswith('https://')):
                return jsonify({
                    'success': False,
                    'message': 'Invalid photo URL format'
                }), 400
        
        # Validate feeling length if provided (optional)
        if feeling and len(feeling) > 100:
            return jsonify({
                'success': False,
                'message': 'Feeling must be 100 characters or less'
            }), 400
        
        # Validate location length if provided (optional)
        if location and len(location) > 255:
            return jsonify({
                'success': False,
                'message': 'Location must be 255 characters or less'
            }), 400
        
        # Create new post
        new_post = Post(
            user_id=user_id,
            content=content,
            image_url=image_url if image_url else None,
            feeling=feeling if feeling else None,
            location=location if location else None,
            likes_count=0,
            comments_count=0
        )
        
        db.session.add(new_post)
        db.session.commit()
        
        print(f"Post created successfully by user {user_id}: {content[:50]}...")
        
        return jsonify({
            'success': True,
            'message': 'Post created successfully!',
            'post': new_post.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Create post error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while creating your post. Please try again.'
        }), 500

@app.route('/api/posts/<int:post_id>', methods=['PUT'])
def edit_post(post_id):
    """Edit a post content if the requester is the owner"""
    try:
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({'success': False, 'message': 'Please log in to edit posts'}), 401
        user_id = session['user_id']
        post = db.session.get(Post, post_id)
        if not post:
            return jsonify({'success': False, 'message': 'Post not found'}), 404
        if post.user_id != user_id:
            return jsonify({'success': False, 'message': 'You do not have permission to edit this post'}), 403
        data = request.get_json() or {}
        content = (data.get('content') or '').strip()
        if not content:
            return jsonify({'success': False, 'message': 'Post content is required'}), 400
        if len(content) > 1000:
            return jsonify({'success': False, 'message': 'Post content must be 1000 characters or less'}), 400
        post.content = content
        db.session.commit()
        return jsonify({'success': True, 'message': 'Post updated successfully', 'post': post.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Edit post error: {str(e)}")
        return jsonify({'success': False, 'message': 'An error occurred while editing the post'}), 500

@app.route('/api/posts/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    """Delete a post if the requester is the owner. Also delete related reactions, comments, comment likes, and image files."""
    try:
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({'success': False, 'message': 'Please log in to delete posts'}), 401
        user_id = session['user_id']
        post = db.session.get(Post, post_id)
        if not post:
            return jsonify({'success': False, 'message': 'Post not found'}), 404
        if post.user_id != user_id:
            return jsonify({'success': False, 'message': 'You do not have permission to delete this post'}), 403
        
        # Store image path for deletion after database operations
        image_path_to_delete = None
        if post.image_url:
            # Extract filename from URL path (e.g., "/uploads/filename.jpg" -> "filename.jpg")
            if post.image_url.startswith('/uploads/'):
                filename = post.image_url.replace('/uploads/', '')
                image_path_to_delete = os.path.join(UPLOAD_FOLDER, filename)
        
        print(f"Deleting post {post_id} and all related data...")
        
        # Delete related data in the correct order (deepest dependencies first)
        # 1. Delete comment likes (depends on comments)
        comment_ids = [comment.id for comment in Comment.query.filter_by(post_id=post_id).all()]
        if comment_ids:
            deleted_comment_likes = CommentLike.query.filter(CommentLike.comment_id.in_(comment_ids)).delete(synchronize_session=False)
            print(f"Deleted {deleted_comment_likes} comment likes")
        
        # 2. Delete comments (depends on post)
        deleted_comments = Comment.query.filter_by(post_id=post_id).delete()
        print(f"Deleted {deleted_comments} comments")
        
        # 3. Delete post reactions (depends on post)
        deleted_reactions = PostReaction.query.filter_by(post_id=post_id).delete()
        print(f"Deleted {deleted_reactions} post reactions")
        
        # 4. Delete the post record itself
        db.session.delete(post)
        db.session.commit()
        
        print(f"Post {post_id} deleted successfully from database")
        
        # Delete the image file from filesystem after successful database deletion
        if image_path_to_delete and os.path.exists(image_path_to_delete):
            try:
                os.remove(image_path_to_delete)
                print(f"Deleted image file: {image_path_to_delete}")
            except Exception as file_error:
                print(f"Warning: Could not delete image file {image_path_to_delete}: {file_error}")
                # Don't fail the request if file deletion fails - post is already deleted from database
        
        return jsonify({'success': True, 'message': 'Post deleted successfully'}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Delete post error: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'An error occurred while deleting the post'}), 500

@app.route('/api/posts', methods=['GET'])
def get_posts():
    """Get posts with pagination - shows latest posts first"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to view posts'
            }), 401
        
        user_id = session['user_id']
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        user_only = request.args.get('user_only', 'false').lower() == 'true'
        
        # Limit per_page to reasonable values
        per_page = min(max(per_page, 1), 20)
        
        # Build query
        if user_only:
            # Get only posts from the current user
            query = Post.query.filter_by(user_id=user_id)
        else:
            # Get all posts (for feed)
            query = Post.query
        
        # Order by most recent first
        query = query.order_by(Post.created_at.desc())
        
        # Get paginated results
        posts_pagination = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Format posts for frontend
        formatted_posts = []
        for post in posts_pagination.items:
            post_dict = post.to_dict()
            
            # Add time ago formatting
            try:
                from datetime import datetime, timedelta
                created_at = datetime.fromisoformat(post_dict['created_at'].replace('Z', '+00:00')) if post_dict['created_at'] else datetime.now()
                time_diff = datetime.now() - created_at
                
                if time_diff.days > 0:
                    time_ago = f"{time_diff.days} day{'s' if time_diff.days > 1 else ''} ago"
                elif time_diff.seconds > 3600:
                    hours = time_diff.seconds // 3600
                    time_ago = f"{hours} hour{'s' if hours > 1 else ''} ago"
                elif time_diff.seconds > 60:
                    minutes = time_diff.seconds // 60
                    time_ago = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
                else:
                    time_ago = "Just now"
                
                post_dict['time_ago'] = time_ago
            except Exception as e:
                post_dict['time_ago'] = "Recently"
            
            # Add user's initials for avatar
            if post.author:
                post_dict['author_initials'] = f"{post.author.first_name[0]}{post.author.last_name[0]}"
            else:
                post_dict['author_initials'] = "?"
            
            # Build reactions summary and current user's reaction
            try:
                reactions = PostReaction.query.filter_by(post_id=post.id).all()
                summary = {}
                for r in reactions:
                    summary[r.reaction] = summary.get(r.reaction, 0) + 1
                post_dict['reactions_summary'] = summary
                # Maintain likes_count for backward compatibility (count of 'like')
                post_dict['likes_count'] = summary.get('like', 0)
                # User reaction
                user_reaction = next((r.reaction for r in reactions if r.user_id == user_id), None)
                post_dict['user_reaction'] = user_reaction
                post_dict['liked_by_user'] = user_reaction == 'like'
            except Exception:
                post_dict['reactions_summary'] = {}
                post_dict['user_reaction'] = None
            
            formatted_posts.append(post_dict)
        
        return jsonify({
            'success': True,
            'posts': formatted_posts,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': posts_pagination.total,
                'pages': posts_pagination.pages,
                'has_prev': posts_pagination.has_prev,
                'has_next': posts_pagination.has_next
            },
            'total_posts': posts_pagination.total
        }), 200
        
    except Exception as e:
        print(f"Get posts error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching posts'
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
            'discord': r'^.+#\d{4}$',  # Discord username format
            'twitch': r'^https?://(www\.)?twitch\.tv/.+$',
            'website': r'^https?://.+$'  # Generic URL pattern
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
                    'message': 'Please enter a valid Discord username (e.g., username#1234)'
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


@app.route('/api/posts/<int:post_id>/react', methods=['POST'])
def react_to_post(post_id):
    """React to a post with one of the supported reactions. Single reaction per user.
    If the same reaction is sent again, remove it (dis-react).
    If a different reaction exists, update it.
    """
    try:
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({'success': False, 'message': 'Please log in to react to posts'}), 401
        user_id = session['user_id']

        data = request.get_json() or {}
        reaction = (data.get('reaction') or '').strip().lower()
        if reaction not in VALID_REACTIONS:
            return jsonify({'success': False, 'message': 'Invalid reaction type'}), 400

        post = db.session.get(Post, post_id)
        if not post:
            return jsonify({'success': False, 'message': 'Post not found'}), 404

        existing = PostReaction.query.filter_by(user_id=user_id, post_id=post_id).first()

        action = None
        if existing and existing.reaction == reaction:
            # Remove reaction (dis-react)
            db.session.delete(existing)
            action = 'removed'
            if reaction == 'like':
                post.likes_count = max(0, (post.likes_count or 0) - 1)
        elif existing and existing.reaction != reaction:
            # Switch reaction
            prev = existing.reaction
            existing.reaction = reaction
            action = 'switched'
            # Maintain likes_count for backward compatibility
            if prev == 'like' and post.likes_count and post.likes_count > 0:
                post.likes_count -= 1
            if reaction == 'like':
                post.likes_count = (post.likes_count or 0) + 1
        else:
            # New reaction
            new_r = PostReaction(user_id=user_id, post_id=post_id, reaction=reaction)
            db.session.add(new_r)
            action = 'added'
            if reaction == 'like':
                post.likes_count = (post.likes_count or 0) + 1

        db.session.commit()

        # Build updated summary
        reactions = PostReaction.query.filter_by(post_id=post_id).all()
        summary = {}
        for r in reactions:
            summary[r.reaction] = summary.get(r.reaction, 0) + 1
        user_reaction = next((r.reaction for r in reactions if r.user_id == user_id), None)

        return jsonify({
            'success': True,
            'message': 'Reaction updated',
            'action': action,
            'reactions_summary': summary,
            'user_reaction': user_reaction,
            'new_like_count': summary.get('like', 0)
        }), 200
    except Exception as e:
        db.session.rollback()
        print(f"React error: {str(e)}")
        return jsonify({'success': False, 'message': 'An error occurred while processing your reaction'}), 500

# Backward-compatible like endpoint: treat as 'like' reaction
@app.route('/api/posts/<int:post_id>/like', methods=['POST'])
def toggle_post_like(post_id):
    try:
        # Proxy to react_to_post with 'like'
        request_data = request.get_json() or {}
        request_data['reaction'] = 'like'
        # Temporarily set json on request is non-trivial; directly call logic
        # Re-implement minimal logic here by calling same function body
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({'success': False, 'message': 'Please log in to like posts'}), 401
        user_id = session['user_id']
        post = db.session.get(Post, post_id)
        if not post:
            return jsonify({'success': False, 'message': 'Post not found'}), 404
        existing = PostReaction.query.filter_by(user_id=user_id, post_id=post_id).first()
        if existing and existing.reaction == 'like':
            db.session.delete(existing)
        elif existing and existing.reaction != 'like':
            if existing.reaction == 'like':
                pass
            existing.reaction = 'like'
        else:
            db.session.add(PostReaction(user_id=user_id, post_id=post_id, reaction='like'))
        # Update likes_count to actual count
        db.session.commit()
        likes = PostReaction.query.filter_by(post_id=post_id, reaction='like').count()
        post.likes_count = likes
        db.session.commit()
        return jsonify({'success': True, 'message': 'OK', 'new_like_count': likes}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Toggle like error: {str(e)}")
        return jsonify({'success': False, 'message': 'An error occurred while processing your request'}), 500

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

# Comment API Routes
@app.route('/api/posts/<int:post_id>/comments', methods=['POST'])
def add_comment_to_post(post_id):
    """Add a comment to a specific post"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to add comments'
            }), 401
        
        user_id = session['user_id']
        user = db.session.get(User, user_id)
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Check if post exists
        post = db.session.get(Post, post_id)
        if not post:
            return jsonify({
                'success': False,
                'message': 'Post not found'
            }), 404
        
        # Get JSON data from request
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        content = data.get('content', '').strip()
        
        # Validate content
        if not content:
            return jsonify({
                'success': False,
                'message': 'Comment content is required'
            }), 400
        
        if len(content) > 500:  # Set reasonable character limit for comments
            return jsonify({
                'success': False,
                'message': 'Comment must be 500 characters or less'
            }), 400
        
        # Create new comment
        new_comment = Comment(
            user_id=user_id,
            post_id=post_id,
            content=content,
            likes_count=0
        )
        
        # Update post comments count
        post.comments_count = (post.comments_count or 0) + 1
        
        db.session.add(new_comment)
        db.session.commit()
        
        print(f"Comment added successfully by user {user_id} on post {post_id}: {content[:50]}...")
        
        return jsonify({
            'success': True,
            'message': 'Comment added successfully!',
            'comment': new_comment.to_dict(),
            'new_comments_count': post.comments_count
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Add comment error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while adding your comment. Please try again.'
        }), 500

@app.route('/api/posts/<int:post_id>/comments', methods=['GET'])
def get_post_comments(post_id):
    """Get comments for a specific post with pagination (newest first)"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to view comments'
            }), 401
        
        user_id = session['user_id']
        
        # Check if post exists
        post = db.session.get(Post, post_id)
        if not post:
            return jsonify({
                'success': False,
                'message': 'Post not found'
            }), 404
        
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        order = request.args.get('order', 'desc').lower()  # desc for newest first, asc for oldest first
        
        # Limit per_page to reasonable values
        per_page = min(max(per_page, 1), 50)
        
        # Build query for comments
        query = Comment.query.filter_by(post_id=post_id)
        
        # Order by creation time (newest first by default)
        if order == 'asc':
            query = query.order_by(Comment.created_at.asc())
        else:
            query = query.order_by(Comment.created_at.desc())
        
        # Get paginated results
        comments_pagination = query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        # Format comments for frontend
        formatted_comments = []
        for comment in comments_pagination.items:
            comment_dict = comment.to_dict()
            
            # Add time ago formatting
            try:
                created_at = datetime.fromisoformat(comment_dict['created_at'].replace('Z', '+00:00')) if comment_dict['created_at'] else datetime.now()
                time_diff = datetime.now() - created_at
                
                if time_diff.days > 0:
                    time_ago = f"{time_diff.days} day{'s' if time_diff.days > 1 else ''} ago"
                elif time_diff.seconds > 3600:
                    hours = time_diff.seconds // 3600
                    time_ago = f"{hours} hour{'s' if hours > 1 else ''} ago"
                elif time_diff.seconds > 60:
                    minutes = time_diff.seconds // 60
                    time_ago = f"{minutes} minute{'s' if minutes > 1 else ''} ago"
                else:
                    time_ago = "Just now"
                
                comment_dict['time_ago'] = time_ago
            except Exception as e:
                comment_dict['time_ago'] = "Recently"
            
            # Add user's initials for avatar
            if comment.author:
                comment_dict['author_initials'] = f"{comment.author.first_name[0]}{comment.author.last_name[0]}"
            else:
                comment_dict['author_initials'] = "?"
            
            # Check if current user has liked this comment
            user_liked = CommentLike.query.filter_by(
                user_id=user_id,
                comment_id=comment.id
            ).first() is not None
            comment_dict['user_liked'] = user_liked
            
            formatted_comments.append(comment_dict)
        
        return jsonify({
            'success': True,
            'comments': formatted_comments,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': comments_pagination.total,
                'pages': comments_pagination.pages,
                'has_prev': comments_pagination.has_prev,
                'has_next': comments_pagination.has_next
            },
            'total_comments': comments_pagination.total
        }), 200
        
    except Exception as e:
        print(f"Get comments error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'An error occurred while fetching comments'
        }), 500

@app.route('/api/comments/<int:comment_id>/like', methods=['POST'])
def toggle_comment_like(comment_id):
    """Like or unlike a comment"""
    try:
        # Check if user is logged in
        if not session.get('logged_in') or not session.get('user_id'):
            return jsonify({
                'success': False,
                'message': 'Please log in to like comments'
            }), 401
        
        user_id = session['user_id']
        
        # Check if comment exists
        comment = db.session.get(Comment, comment_id)
        if not comment:
            return jsonify({
                'success': False,
                'message': 'Comment not found'
            }), 404
        
        # Check if user has already liked this comment
        existing_like = CommentLike.query.filter_by(
            user_id=user_id,
            comment_id=comment_id
        ).first()
        
        if existing_like:
            # Unlike the comment
            db.session.delete(existing_like)
            comment.likes_count = max(0, (comment.likes_count or 0) - 1)
            action = 'unliked'
            liked = False
        else:
            # Like the comment
            new_like = CommentLike(
                user_id=user_id,
                comment_id=comment_id
            )
            db.session.add(new_like)
            comment.likes_count = (comment.likes_count or 0) + 1
            action = 'liked'
            liked = True
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Comment {action} successfully!',
            'liked': liked,
            'likes_count': comment.likes_count
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': 'An error occurred while processing your request'
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
