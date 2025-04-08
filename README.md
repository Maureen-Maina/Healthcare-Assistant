# AI Healthcare Chatbot

An intelligent healthcare chatbot system built with Python, Flask, and TensorFlow. The system provides health-related information, analyzes symptoms, and helps users find nearby healthcare facilities.

## Features

- Natural Language Processing for understanding user queries
- Symptom analysis and health information retrieval
- Integration with Google Places API for finding nearby healthcare facilities
- User-friendly web interface
- Secure user authentication
- Admin panel for managing the system

## Prerequisites

- Python 3.8+
- pip (Python package manager)
- Google Maps API key

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd healthcare-chatbot
```

2. Install the required packages:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
Create a `.env` file in the root directory and add:
```
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

4. Initialize the database:
```bash
python app.py
```

## Usage

1. Start the Flask server:
```bash
python app.py
```

2. Open a web browser and navigate to:
```
http://localhost:5000
```

3. Train the AI model (optional):
```bash
python model.py
```

## Project Structure

- `app.py`: Main Flask application
- `model.py`: AI model implementation and training
- `training_data.json`: Training data for the chatbot
- `requirements.txt`: Python dependencies
- `templates/`: HTML templates
- `static/`: Static files (CSS, JS, images)

## Security Considerations

- User passwords are hashed before storage
- Session management for secure authentication
- Input validation and sanitization
- CSRF protection
- Secure handling of API keys

## Contributing

1. Fork the repository
2. Create a new branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
