from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from flask_migrate import Migrate
from flask_wtf.csrf import CSRFProtect
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired, Email, EqualTo, ValidationError
from config import Config
import json
import re
from datetime import datetime, timedelta

app = Flask(__name__)
app.config.from_object(Config)

db = SQLAlchemy(app)
migrate = Migrate(app, db)
csrf = CSRFProtect(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)  

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class LoginForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    submit = SubmitField('Login')

class RegistrationForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired()])
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired()])
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('Register')

    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user:
            raise ValidationError('Username already taken. Please choose a different one.')

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user:
            raise ValidationError('Email already registered. Please use a different one.')

class Appointment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    patient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    appointment_type = db.Column(db.String(120), nullable=False)
    appointment_date = db.Column(db.DateTime, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(120), nullable=False, default='pending')

class Meal(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    calories = db.Column(db.Integer, nullable=False)

class WaterIntake(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    amount = db.Column(db.Integer, nullable=False)

class Exercise(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    duration = db.Column(db.Integer, nullable=False)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route('/')
@login_required
def index():
    return render_template('index.html', maps_api_key=app.config['MAPS_API_KEY'])

def format_response_list(response_list):
    return '\n'.join([f'• {item}' for item in response_list])

# Load training data
with open('training_data.json', 'r') as f:
    training_data = json.load(f)['training_data']

def get_severity_level(symptoms):
    emergency_symptoms = ['chest pain', 'shortness of breath', 'severe bleeding', 'stroke', 'heart attack']
    urgent_symptoms = ['high fever', 'severe pain', 'persistent vomiting', 'severe headache']
    
    if any(s in symptoms for s in emergency_symptoms):
        return 'emergency', '#dc3545', '⚠️ EMERGENCY: Seek immediate medical attention!'
    elif any(s in symptoms for s in urgent_symptoms):
        return 'urgent', '#ffc107', '⚠️ URGENT: Consult a healthcare provider soon!'
    return 'normal', '#28a745', 'Monitor your symptoms and follow the advice below.'

def check_symptom_duration(message):
    duration_patterns = {
        'days': r'(\d+)\s*days?',
        'weeks': r'(\d+)\s*weeks?',
        'months': r'(\d+)\s*months?'
    }
    
    for unit, pattern in duration_patterns.items():
        match = re.search(pattern, message)
        if match:
            duration = int(match.group(1))
            if unit == 'months' or (unit == 'weeks' and duration > 2) or (unit == 'days' and duration > 14):
                return True, f"⚠️ Your symptoms have persisted for {duration} {unit}. It's recommended to consult a healthcare provider."
    return False, ""

def find_related_conditions(user_symptoms, current_disease):
    related = []
    
    # Define condition categories
    respiratory_infections = {'Common Cold', 'Flu', 'Tonsillitis'}
    chronic_respiratory = {'COPD', 'Asthma'}
    emergency_conditions = {'Heart Attack', 'Stroke'}
    
    for item in training_data:
        if 'symptoms' not in item or item['disease'] == current_disease:
            continue
            
        # Convert both sets to lowercase for comparison
        item_symptoms = set(s.lower() for s in item['symptoms'])
        user_symptoms_lower = set(s.lower() for s in user_symptoms)
        
        # Count matching symptoms
        matching_count = len(item_symptoms & user_symptoms_lower)
        
        # Define symptom groups
        mild_respiratory = {'cough', 'runny nose', 'sore throat'}
        severe_respiratory = {'shortness of breath', 'wheezing', 'chest pain'}
        
        # Check if current symptoms are mild or severe
        has_mild = any(s in mild_respiratory for s in user_symptoms_lower)
        has_severe = any(s in severe_respiratory for s in user_symptoms_lower)
        
        # Skip chronic conditions for mild symptoms
        if has_mild and not has_severe and item['disease'] in chronic_respiratory:
            continue
            
        # Skip mild conditions for severe symptoms
        if has_severe and item['disease'] in respiratory_infections:
            continue
        
        if matching_count > 0:
            related.append({
                'disease': item['disease'],
                'match_count': matching_count,
                'is_emergency': item['disease'] in emergency_conditions
            })
    
    # Sort by emergency first, then match count
    related.sort(key=lambda x: (x['is_emergency'], x['match_count']), reverse=True)
    return [r['disease'] for r in related[:3]] if related else []

def check_symptoms(message):
    user_symptoms = set()
    for item in training_data:
        if 'symptoms' in item:
            for symptom in item['symptoms']:
                if symptom.lower() in message.lower():
                    user_symptoms.add(symptom)  # Keep original case for display
    
    if user_symptoms:
        possible_matches = []
        for item in training_data:
            if 'symptoms' not in item:
                continue
            
            matching_symptoms = set(s.lower() for s in user_symptoms) & set(s.lower() for s in item['symptoms'])
            if matching_symptoms:
                possible_matches.append({
                    'disease': item['disease'],
                    'treatment': item['treatment'],
                    'advice': item['advice'],
                    'match_count': len(matching_symptoms),
                    'total_symptoms': len(item['symptoms'])
                })
        
        if possible_matches:
            possible_matches.sort(key=lambda x: x['match_count'], reverse=True)
            best_match = possible_matches[0]
            
            # Get severity level
            severity_level, severity_color, severity_message = get_severity_level(user_symptoms)
            
            # Check symptom duration
            has_long_duration, duration_message = check_symptom_duration(message)
            
            response = [
                f"<div class='diagnosis-header'>Based on your symptoms ({', '.join(sorted(user_symptoms))}), you may have:</div>",
                f"<div class='disease-name' style='border-left: 4px solid {severity_color}'>{best_match['disease']}</div>",
                f"<div class='severity-message' style='color: {severity_color}'>{severity_message}</div>",
                "<div class='section-header'>Recommended treatments:</div>",
                f"<ul class='treatment-list'>{format_response_list(best_match['treatment'])}</ul>",
                "<div class='section-header'>Advice:</div>",
                f"<div class='advice-text'>{best_match['advice']}</div>"
            ]
            
            if has_long_duration:
                response.insert(3, f"<div class='duration-warning'>{duration_message}</div>")
            
            return '\n'.join(response)
    return None

@app.route('/chat', methods=['POST'])
@login_required
def chat():
    message = request.json.get('message', '').lower()
    
    # First check if it's a single symptom that exists in health_responses
    health_responses = {
        'headache': {
            'response': [
                'Rest in a quiet, dark room',
                'Stay hydrated',
                'Try over-the-counter pain relievers',
                'Consider applying a cold or warm compress'
            ],
            'additional_advice': 'If the headache persists for more than 3 days or worsens, consult a healthcare provider.'
        },
        'fever': {
            'response': [
                'Rest and stay hydrated',
                'Take acetaminophen or ibuprofen',
                'Use a light blanket',
                'Take lukewarm baths'
            ],
            'additional_advice': 'Seek medical attention if fever is high or persists.'
        },
        'cold': {
            'response': [
                'Get plenty of rest',
                'Stay hydrated',
                'Use over-the-counter cold medications',
                'Try honey for sore throat',
                'Use a humidifier'
            ],
            'additional_advice': 'Consult a doctor if symptoms worsen.'
        },
        'cough': {
            'response': [
                'Stay hydrated',
                'Try honey and warm tea',
                'Use a humidifier',
                'Consider over-the-counter cough medicine'
            ],
            'additional_advice': 'See a doctor if the cough persists or is severe.'
        },
        'pain': {
            'response': [
                'Rest the affected area',
                'Apply ice or heat',
                'Use over-the-counter pain relievers',
                'Consider gentle stretching or physical therapy'
            ],
            'additional_advice': 'If the pain is severe or persists, consult a healthcare professional.'
        },
        'hurt': {
            'response': [
                'Assess the injury for swelling or bruising',
                'Rest and avoid strain',
                'Apply ice or compression if needed'
            ],
            'additional_advice': 'If the pain does not improve or worsens, seek medical advice.'
        },
        'sore throat': {
            'response': [
                'Gargle with warm salt water',
                'Drink warm teas with honey',
                'Use lozenges or throat sprays',
                'Stay hydrated'
            ],
            'additional_advice': 'If symptoms persist for more than a week, consult a doctor.'
        },
        'flu': {
            'response': [
                'Get plenty of rest',
                'Drink fluids to prevent dehydration',
                'Take over-the-counter flu medicine',
                'Use a humidifier to ease congestion'
            ],
            'additional_advice': 'Seek medical attention if symptoms become severe.'
        },
        'fatigue': {
            'response': [
                'Ensure you get enough sleep',
                'Stay hydrated and eat a balanced diet',
                'Take breaks and avoid excessive screen time',
                'Consider light physical activity like walking'
            ],
            'additional_advice': 'Persistent fatigue may require a medical checkup.'
        }
    }

    for key in health_responses:
        if message.count(key) == 1 and len(message.split()) <= 4:  # Check if it's a simple symptom mention
            response = [
                f"For {key}, I recommend:",
                format_response_list(health_responses[key]['response']),
                "\nAdditional advice:",
                health_responses[key]['additional_advice']
            ]
            return jsonify({'response': '\n'.join(response)})
    
    # If not a single symptom, try symptom matching from training data
    symptom_response = check_symptoms(message)
    if symptom_response:
        return jsonify({'response': symptom_response})
    
    # Basic responses
    basic_responses = {
        'hello': f'Hello {current_user.username}! How can I assist you with your health today?',
        'hi': f'Hi {current_user.username}! How can I help you with your health concerns?',
        'how are you': 'I am doing well, thank you! How can I assist you with your health today?',
        'goodbye': 'Goodbye! Take care of your health!',
        'bye': 'Bye! Stay healthy!',
        'thank you': 'You are welcome! Let me know if you need any more help.',
        'thanks': 'You are welcome! Feel free to ask if you need further assistance.'
    }

    # Check for basic greetings and thank you responses
    for key in basic_responses:
        if key in message:
            return jsonify({'response': basic_responses[key]})

    # Check for health concerns
    for key in health_responses:
        if key in message:
            response = [
                f"For {key}, I recommend:",
                format_response_list(health_responses[key]['response']),
                "\nAdditional advice:",
                health_responses[key]['additional_advice']
            ]
            return jsonify({'response': '\n'.join(response)})

    # Custom health advice based on user input
    if 'headache' in message and ('3 days' in message or 'persistent' in message):
        return jsonify({
            'response': 'It sounds like you are experiencing a persistent headache. For headaches that last more than a few days, here are a few suggestions:\n' +
                       '- Continue resting in a quiet, dark room\n' +
                       '- Stay hydrated\n' +
                       '- Consider trying a cold or warm compress\n' +
                       '- Over-the-counter medications may help, but you might want to consult with a healthcare provider for further evaluation if the pain continues beyond 3 days.\n\n' +
                       'You may need a more thorough evaluation to rule out other conditions that could be causing the headache.'
        })

    # Default response for health-related concerns
    health_keywords = ['pain', 'hurt', 'feel', 'sick', 'symptoms', 'treatment', 'medicine', 'doctor']
    if any(keyword in message for keyword in health_keywords):
        return jsonify({
            'response': 'I understand you have a health concern. To provide the best advice, could you please:\n' +
                       '1. Describe your symptoms in detail\n' +
                       '2. How long have you been experiencing this?\n' +
                       '3. Have you tried any remedies?\n\n' +
                       'Remember, I am an AI assistant and not a substitute for professional medical advice. ' +
                       'Please consult a healthcare provider for proper diagnosis and treatment.'
        })

    # Default response if no match is found
    return jsonify({
        'response': 'I am your healthcare assistant. You can ask me about common health issues like headaches, ' +
                   'fever, colds, or coughs. How can I help you today?'
    })

@app.route('/book_appointment', methods=['POST'])
@login_required
def book_appointment():
    if not request.is_json:
        return jsonify({
            'status': 'error',
            'message': 'Invalid content type. Expected JSON.'
        }), 400

    try:
        data = request.get_json()
        print("Received appointment data:", data)
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data received'
            }), 400
        
        appointment_type = data.get('appointmentType')
        appointment_date = data.get('appointmentDate')
        appointment_time = data.get('appointmentTime')
        notes = data.get('appointmentNotes', '')
        
        print(f"Parsed data - Type: {appointment_type}, Date: {appointment_date}, Time: {appointment_time}")
        
        # Validate required fields
        if not all([appointment_type, appointment_date, appointment_time]):
            missing_fields = []
            if not appointment_type:
                missing_fields.append('appointment type')
            if not appointment_date:
                missing_fields.append('date')
            if not appointment_time:
                missing_fields.append('time')
            
            error_msg = f"Missing required fields: {', '.join(missing_fields)}"
            print(error_msg)
            return jsonify({
                'status': 'error',
                'message': error_msg
            }), 400
            
        try:
            # Parse the date and time
            date_obj = datetime.strptime(f"{appointment_date} {appointment_time}", "%Y-%m-%d %H:%M")
            
            # Create appointment
            appointment = Appointment(
                patient_id=current_user.id,
                appointment_type=appointment_type,
                appointment_date=date_obj,
                notes=notes,
                status='pending'
            )
            
            db.session.add(appointment)
            db.session.commit()
            
            return jsonify({
                'status': 'success',
                'message': 'Appointment scheduled successfully!'
            })
            
        except ValueError as e:
            return jsonify({
                'status': 'error',
                'message': 'Invalid date or time format'
            }), 400
            
    except Exception as e:
        print(f"Error booking appointment: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'An error occurred while booking the appointment'
        }), 500

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
        
    form = RegistrationForm()
    if request.method == 'POST':
        # Debug prints
        print("Raw form data:", request.form)
        print("Form data:", {
            'username': form.username.data,
            'email': form.email.data,
            'password': 'hidden',
            'csrf_token': form.csrf_token.data
        })
        print("Form errors:", form.errors)
        print("Form validated:", form.validate())
        
        if form.validate_on_submit():
            try:
                # Create new user
                user = User(
                    username=form.username.data,
                    email=form.email.data
                )
                user.set_password(form.password.data)
                
                # Try to add to database
                db.session.add(user)
                db.session.commit()
                print("Registration successful for:", user.username)
                return jsonify({'status': 'success', 'message': 'Registration successful! Please login.'})
            except Exception as e:
                db.session.rollback()
                print(f"Registration error: {str(e)}")
                return jsonify({'status': 'error', 'message': f'Registration failed: {str(e)}'})
        else:
            print("Form validation failed:", form.errors)
            return jsonify({'status': 'error', 'message': form.errors})
            
    return render_template('register.html', form=form)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index'))
    
    form = LoginForm()
    if request.method == 'POST':
        # Debug prints
        print("Raw login form data:", request.form)
        print("Login form data:", {
            'username': form.username.data,
            'csrf_token': form.csrf_token.data
        })
        print("Login form errors:", form.errors)
        print("Login form validated:", form.validate())
        
        if form.validate_on_submit():
            user = User.query.filter_by(username=form.username.data).first()
            print("User found:", user is not None)
            if user and user.check_password(form.password.data):
                login_user(user)
                print("Login successful for user:", user.username)
                return jsonify({'status': 'success', 'redirect': url_for('index')})
            print("Invalid password for user:", form.username.data)
            return jsonify({'status': 'error', 'message': 'Invalid username or password'})
        print("Login form validation failed:", form.errors)
        return jsonify({'status': 'error', 'message': 'Invalid form data'})
            
    return render_template('login.html', form=form)

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/get_daily_progress')
@login_required
def get_daily_progress():
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'error': 'Date parameter is required'}), 400

    try:
        # Parse the date
        target_date = datetime.strptime(date_str, '%Y-%m-%d')
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)

        # Get meals for the day
        meals = Meal.query.filter(
            Meal.user_id == current_user.id,
            Meal.date >= start_of_day,
            Meal.date < end_of_day
        ).all()

        # Calculate total calories
        total_calories = sum(meal.calories for meal in meals)

        # Get water intake for the day
        water_entries = WaterIntake.query.filter(
            WaterIntake.user_id == current_user.id,
            WaterIntake.date >= start_of_day,
            WaterIntake.date < end_of_day
        ).all()
        total_water = sum(entry.amount for entry in water_entries)

        # Get exercise for the day
        exercises = Exercise.query.filter(
            Exercise.user_id == current_user.id,
            Exercise.date >= start_of_day,
            Exercise.date < end_of_day
        ).all()
        total_exercise = sum(exercise.duration for exercise in exercises)

        # Return progress data with default goals
        return jsonify({
            'calories': {
                'current': total_calories,
                'goal': 2000  # Default daily calorie goal
            },
            'water': {
                'current': total_water,
                'goal': 2000  # Default daily water goal in ml
            },
            'exercise': {
                'current': total_exercise,
                'goal': 30  # Default daily exercise goal in minutes
            }
        })

    except ValueError:
        return jsonify({'error': 'Invalid date format'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/log_water', methods=['POST'])
@login_required
def log_water():
    try:
        data = request.get_json()
        amount = data.get('amount')
        
        if not amount or not isinstance(amount, (int, float)) or amount <= 0:
            return jsonify({'success': False, 'message': 'Invalid water amount'}), 400

        # Convert glasses to milliliters (1 glass = 250ml)
        amount_ml = int(amount * 250)
        
        water_entry = WaterIntake(
            user_id=current_user.id,
            date=datetime.now(),
            amount=amount_ml
        )
        
        db.session.add(water_entry)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Successfully logged {amount} glasses of water'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)

@app.route('/summary')
def get_health_summary():
    try:
        # Get today's date
        today = date.today()
        
        # Get latest health metrics
        health_metrics = HealthMetrics.query.order_by(HealthMetrics.date.desc()).first()
        
        # Get today's water intake
        water_intake = WaterIntake.query.filter_by(date=today).first()
        
        # Get today's exercise
        exercise = Exercise.query.filter_by(date=today).all()
        total_exercise_duration = sum(e.duration for e in exercise) if exercise else 0
        
        # Get today's meals
        meals = MealLog.query.filter_by(date=today).all()
        total_calories = sum(meal.calories for meal in meals) if meals else 0
        
        # Get today's sleep
        sleep = Sleep.query.filter_by(date=today).first()
        
        # Get user's goals
        user = User.query.first()  # Get first user since we removed user_id
        
        return jsonify({
            'status': 'success',
            'weight': health_metrics.weight if health_metrics else None,
            'blood_pressure': f"{health_metrics.blood_pressure_sys}/{health_metrics.blood_pressure_dia}" if health_metrics else None,
            'heart_rate': health_metrics.heart_rate if health_metrics else None,
            'water_intake': water_intake.amount if water_intake else 0,
            'exercise_duration': total_exercise_duration,
            'calories_consumed': total_calories,
            'sleep_duration': sleep.duration if sleep else 0,
            'daily_water_goal': user.daily_water_goal,
            'daily_exercise_goal': user.daily_exercise_goal,
            'daily_calorie_goal': user.daily_calorie_goal,
            'daily_sleep_goal': user.daily_sleep_goal
        })
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@app.route('/find_hospitals', methods=['POST'])
@login_required
def find_hospitals():
    try:
        data = request.json
        lat = data.get('lat')
        lng = data.get('lng')
        
        if not lat or not lng:
            return jsonify({
                'error': 'Location coordinates are required'
            }), 400
            
        return jsonify({
            'message': 'Location received',
            'coordinates': {'lat': lat, 'lng': lng}
        })
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500
