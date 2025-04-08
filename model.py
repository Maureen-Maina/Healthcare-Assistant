import numpy as np
import nltk
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from tensorflow.keras.models import Sequential, load_model
from tensorflow.keras.layers import Dense, LSTM, Embedding, Dropout
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
import json
import pickle

# Download required NLTK data
nltk.download('punkt')
nltk.download('stopwords')
nltk.download('wordnet')

class HealthcareBot:
    def __init__(self):
        self.lemmatizer = WordNetLemmatizer()
        self.tokenizer = None
        self.model = None
        self.responses = None
        self.max_sequence_length = 20
        self.intent_names = []

    def preprocess_text(self, text):
        # Tokenize the text
        tokens = word_tokenize(text.lower())
        
        # Remove stopwords and lemmatize
        stop_words = set(stopwords.words('english'))
        tokens = [self.lemmatizer.lemmatize(token) for token in tokens if token not in stop_words]
        
        return ' '.join(tokens)

    def load_training_data(self, file_path):
        with open(file_path, 'r') as file:
            self.training_data = json.load(file)
            
        # Extract patterns and responses
        patterns = []
        labels = []
        self.responses = {}
        
        for intent in self.training_data['intents']:
            self.intent_names.append(intent['tag'])
            for pattern in intent['patterns']:
                patterns.append(self.preprocess_text(pattern))
                labels.append(len(self.intent_names) - 1)  # Use index as label
                self.responses[pattern] = intent['responses']
        
        # Create tokenizer
        self.tokenizer = Tokenizer()
        self.tokenizer.fit_on_texts(patterns)
        
        # Convert text to sequences
        sequences = self.tokenizer.texts_to_sequences(patterns)
        padded_sequences = pad_sequences(sequences, maxlen=self.max_sequence_length)
        
        # Convert labels to categorical format
        y = np.zeros((len(labels), len(self.intent_names)))
        for i, label in enumerate(labels):
            y[i][label] = 1
        
        return padded_sequences, y

    def build_model(self, vocab_size, num_classes):
        model = Sequential([
            Embedding(vocab_size, 128, input_length=self.max_sequence_length),
            LSTM(64, return_sequences=True),
            LSTM(64),
            Dense(64, activation='relu'),
            Dropout(0.5),
            Dense(num_classes, activation='softmax')
        ])
        
        model.compile(optimizer='adam',
                     loss='categorical_crossentropy',
                     metrics=['accuracy'])
        
        self.model = model
        return model

    def train(self, X, y, epochs=100, batch_size=32):
        self.model.fit(X, y,
                      epochs=epochs,
                      batch_size=batch_size,
                      validation_split=0.2)

    def predict(self, text):
        # Preprocess input text
        processed_text = self.preprocess_text(text)
        
        # Convert to sequence
        sequence = self.tokenizer.texts_to_sequences([processed_text])
        padded_sequence = pad_sequences(sequence, maxlen=self.max_sequence_length)
        
        # Get prediction
        prediction = self.model.predict(padded_sequence)
        
        # Get the intent with highest probability
        intent_index = np.argmax(prediction)
        
        # Get random response from the predicted intent
        intent_tag = self.intent_names[intent_index]
        for intent in self.training_data['intents']:
            if intent['tag'] == intent_tag:
                return np.random.choice(intent['responses'])
        
        return "I'm sorry, I don't understand. Could you please rephrase that?"

    def save_model(self, model_path, tokenizer_path):
        # Save the model
        self.model.save(model_path)
        
        # Save the tokenizer
        with open(tokenizer_path, 'wb') as handle:
            pickle.dump(self.tokenizer, handle, protocol=pickle.HIGHEST_PROTOCOL)

    def load_model(self, model_path, tokenizer_path):
        # Load the model
        self.model = load_model(model_path)
        
        # Load the tokenizer
        with open(tokenizer_path, 'rb') as handle:
            self.tokenizer = pickle.load(handle)

if __name__ == '__main__':
    # Example usage
    bot = HealthcareBot()
    
    # Load and preprocess training data
    X, y = bot.load_training_data('training_data.json')
    
    # Build and train the model
    vocab_size = len(bot.tokenizer.word_index) + 1
    num_classes = len(bot.intent_names)
    
    bot.build_model(vocab_size, num_classes)
    bot.train(X, y, epochs=100, batch_size=32)
    
    # Save the model
    bot.save_model('healthcare_model.h5', 'tokenizer.pickle')
