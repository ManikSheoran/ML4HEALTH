from flask import Flask, request, jsonify # Removed render_template as it's likely not needed for React frontend
from flask_cors import CORS
import joblib       
import pickle       
import numpy as np
import random
import nltk
import os

# --- Initialization ---
app = Flask(__name__)
CORS(app)  # Enable CORS for the entire app (allows React frontend to call)

# --- Model Loading ---

# Load Mental Health Model & Vectorizer
mind_model_path = os.path.join(os.path.dirname(__file__), 'models/mental_health_model.pkl')
mind_vectorizer_path = os.path.join(os.path.dirname(__file__), 'models/tfidf_vectorizer.pkl')
mind_model = None
mind_vectorizer = None
try:
    try:
        nltk.data.find('tokenizers/punkt')
    except nltk.downloader.DownloadError:
        print("Downloading NLTK 'punkt' tokenizer...")
        nltk.download('punkt', quiet=True)

    mind_model = joblib.load(mind_model_path)
    mind_vectorizer = joblib.load(mind_vectorizer_path)
    print("Mental health model and vectorizer loaded successfully.")
except Exception as e:
    print(f"ERROR loading mental health model/vectorizer: {e}")
    # App can still run, but /predict/mind endpoint will fail

# Load Heart Disease Model
body_model_path = os.path.join(os.path.dirname(__file__), 'models/heart_disease_model.pkl')
body_model = None
body_feature_names = None # Store feature names after loading
try:
    with open(body_model_path, 'rb') as f:
        body_model = pickle.load(f)
    # Store the expected feature names from the loaded model
    if hasattr(body_model, 'feature_names_in_'):
         body_feature_names = body_model.feature_names_in_
         print(f"Heart disease model loaded successfully. Expecting features: {body_feature_names}")
    else:
         print("WARNING: Heart disease model loaded, but does not have 'feature_names_in_'. Feature order might be critical and is assumed.")
         # Define expected features manually if model doesn't store them (less robust)
         # body_feature_names = ['age', 'sex', 'cp', 'trestbps', 'chol', 'fbs', 'restecg', 'thalach', 'exang', 'oldpeak', 'slope', 'ca', 'thal'] # Example - adjust to your actual features

except FileNotFoundError:
     print(f"ERROR: Heart disease model file not found at {body_model_path}")
except Exception as e:
    print(f"ERROR loading heart disease model: {e}")
    # App can still run, but /predict/body endpoint will fail


# --- Mental Health Data (Keep as is) ---
label_mapping = { 0: "Normal", 1: "Depression", 2: "Suicidal", 3: "Anxiety", 4: "Bipolar", 5: "Stress", 6: "Personality Disorder" }

articles = {
  "Normal": [
    { "title": "Building Better Mental Health - HelpGuide.org", "url": "https://www.helpguide.org/mental-health/wellbeing/building-better-mental-health" },
    { "title": "Caring for Your Mental Health - NIMH", "url": "https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health" },
    { "title": "5 Steps to Mental Wellbeing - NHS", "url": "https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/five-steps-to-mental-wellbeing/" },
    { "title": "Concept of mental health and well-being - PMC", "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10911315/" }
  ],
  "Depression": [
    { "title": "Depression - APA", "url": "https://www.apa.org/topics/depression" },
    { "title": "Depression: Causes, Symptoms, Types & Treatment - Cleveland Clinic", "url": "https://my.clevelandclinic.org/health/diseases/9290-depression" },
    { "title": "How to cope with depression - NHS", "url": "https://www.nhs.uk/mental-health/self-help/tips-and-support/cope-with-depression/" },
    { "title": "What Is Depression? - American Psychiatric Association", "url": "https://www.psychiatry.org/patients-families/depression/what-is-depression" }
  ],
  "Suicidal": [
    { "title": "Digital Shareables on Suicide Prevention - NIMH", "url": "https://www.nimh.nih.gov/get-involved/digital-shareables/shareable-resources-on-suicide-prevention" },
    { "title": "5 Action Steps to Help Someone Having Thoughts of Suicide - NIMH", "url": "https://www.nimh.nih.gov/health/publications/5-action-steps-to-help-someone-having-thoughts-of-suicide" },
    { "title": "Suicide Prevention - Psychiatry.org", "url": "https://www.psychiatry.org/patients-families/suicide-prevention" }
  ],
  "Anxiety": [
    { "title": "How to manage fear and anxiety | Mental Health Foundation", "url": "https://www.mentalhealth.org.uk/explore-mental-health/publications/how-overcome-anxiety-and-fear" },
    { "title": "Anxiety: Symptoms, types, causes, prevention, and treatment - MedicalNewsToday", "url": "https://www.medicalnewstoday.com/articles/323454" },
    { "title": "Anxiety self-care | Types of mental health problems - Mind", "url": "https://www.mind.org.uk/information-support/types-of-mental-health-problems/anxiety-and-panic-attacks/self-care/" },
    { "title": "How to Cope with Anxiety: Actionable Tips - Healthline", "url": "https://www.healthline.com/health/mental-health/how-to-cope-with-anxiety" }
  ],
  "Bipolar": [
    { "title": "6 important facts to know about bipolar disorder - United Healthcare", "url": "https://www.uhc.com/news-articles/healthy-living/6-important-facts-to-know-about-bipolar-disorder" },
    { "title": "Bipolar disorder - NHS", "url": "https://www.nhs.uk/mental-health/conditions/bipolar-disorder/" },
    { "title": "5 Positives of Living with Bipolar Disorder - IBPF", "url": "https://ibpf.org/articles/5-positives-of-living-with-bipolar-disorder-besides-creativity/" },
    { "title": "Living with Bipolar Disorder: 7 Key Coping Skills - HelpGuide.org", "url": "https://www.helpguide.org/mental-health/bipolar-disorder/living-with-bipolar-disorder" }
  ],
  "Stress": [
    { "title": "Stress Management: Techniques to Deal with Stress - HelpGuide.org", "url": "https://www.helpguide.org/mental-health/stress/stress-management" },
    { "title": "5 Tips to Manage Stress - Mayo Clinic Health System", "url": "https://www.mayoclinichealthsystem.org/hometown-health/speaking-of-health/5-tips-to-manage-stress" },
    { "title": "Stress: Causes, symptoms, and management - MedicalNewsToday", "url": "https://www.medicalnewstoday.com/articles/145855" }
  ],
  "Personality Disorder": [
    { "title": "Personality Disorders: Types, Causes, Symptoms & Treatment - Cleveland Clinic", "url": "https://my.clevelandclinic.org/health/diseases/9636-personality-disorders-overview" },
    { "title": "Personality disorders - Symptoms and causes - Mayo Clinic", "url": "https://www.mayoclinic.org/diseases-conditions/personality-disorders/symptoms-causes/syc-20354463" },
    { "title": "Personality disorder: What are the different types? - MedicalNewsToday", "url": "https://www.medicalnewstoday.com/articles/192888" },
    { "title": "Understanding Personality Disorders: Types and Traits - Anxious Minds", "url": "https://www.anxiousminds.co.uk/understanding-personality-disorders-types/" }
  ]
}
playlists = {
    "Normal": "https://open.spotify.com/embed/playlist/4kOdiP5gbzocwxQ8s2UTOF?utm_source=generator&theme=0",
    "Depression": "https://open.spotify.com/embed/playlist/1EqqMWr1CO0sZWsoCt63mN?utm_source=generator&theme=0",
    "Suicidal": "https://open.spotify.com/embed/playlist/41nJ95vG1Ecp27HW20Ew3d?utm_source=generator&theme=0",
    "Anxiety": "https://open.spotify.com/embed/playlist/0eU3ubPAnqeSMi9K3YKVpC?utm_source=generator&theme=0",
    "Bipolar": "https://open.spotify.com/embed/playlist/2PXRXZW12lxxsy04HnEaDX?utm_source=generator&theme=0",
    "Stress": "https://open.spotify.com/embed/playlist/0eU3ubPAnqeSMi9K3YKVpC?utm_source=generator&theme=0", # Same as Anxiety? Check if intended
    "Personality Disorder": "https://open.spotify.com/embed/playlist/1XH9e1vyZN0KZ2ye976nCl?utm_source=generator&theme=0"
}

# --- API Routes ---

@app.route("/")
def index():
    return jsonify({"message": "ML Backend is running. Use /predict/mind or /predict/body endpoints."})

@app.route("/predict/mind", methods=["POST"])
def predict_mind():
    if not mind_model or not mind_vectorizer:
        print("Error: Mental health model or vectorizer not available.")
        return jsonify({"error": "Model not loaded properly"}), 500

    data = request.json
    if not data or "text" not in data:
         return jsonify({"error": "Missing 'text' in JSON payload"}), 400

    user_text = data.get("text", "").strip()
    if not user_text:
        return jsonify({"error": "Empty input text"}), 400

    try:
        sentences = [s.strip() for s in user_text.split('.') if s.strip()]
        if not sentences:
            sentences = [user_text] 

        sentence_probabilities = []
        for sentence in sentences:
            text_tfidf = mind_vectorizer.transform([sentence])
            probabilities = mind_model.predict_proba(text_tfidf)[0]
            sentence_probabilities.append(probabilities)

        avg_probabilities = np.mean(np.array(sentence_probabilities), axis=0)
        result_probs = {label_mapping[i]: round(prob * 100, 2) for i, prob in enumerate(avg_probabilities)}
        top_category = max(result_probs, key=result_probs.get)

        selected_articles = {}
        for category, probability in result_probs.items():
             num_articles = round(probability / 100 * 3)
             if articles.get(category):
                 selected_articles[category] = random.sample(articles[category], num_articles)
             else:
                 selected_articles[category] = []

        playlist_url = playlists.get(top_category, playlists.get("Normal", "")) # Fallback playlist

        return jsonify({
            "probabilities": result_probs,
            "top_category": top_category,
            "articles": selected_articles,
            "playlist": playlist_url
        })

    except Exception as e:
        print(f"Error during mind prediction: {e}")
        return jsonify({"error": "An error occurred during prediction."}), 500


@app.route('/predict/body', methods=['POST'])
def predict_body():
    # Check if model loaded and feature names are available
    if not body_model:
        print("Error: Heart disease model not available.")
        return jsonify({"error": "Heart disease model not loaded properly"}), 500
    if body_feature_names is None:
         print("Error: Heart disease model feature names not available.")
         return jsonify({"error": "Model configuration error (missing feature names)"}), 500

    # Get data from JSON payload (MODIFIED FROM request.form)
    data = request.json
    if not data:
        return jsonify({"error": "Missing JSON payload"}), 400

    try:
        # --- Feature Extraction (Heart Disease - from JSON) ---
        features = []
        missing_features = []
        type_errors = []

        for feature_name in body_feature_names:
            value = data.get(feature_name)
            if value is None or value == "": # Check for missing or empty string
                missing_features.append(feature_name)
                continue # Skip this feature for now

            try:
                # Convert to float, as models usually expect numeric types
                features.append(float(value))
            except (ValueError, TypeError):
                 type_errors.append(feature_name)

        # Handle errors before prediction
        error_messages = []
        if missing_features:
            error_messages.append(f"Missing required features: {', '.join(missing_features)}")
        if type_errors:
             error_messages.append(f"Invalid (non-numeric) type for features: {', '.join(type_errors)}")

        if error_messages:
            return jsonify({"error": ". ".join(error_messages)}), 400

        # Ensure the number of extracted features matches the model's expectation
        if len(features) != len(body_feature_names):
             return jsonify({"error": f"Incorrect number of features provided. Expected {len(body_feature_names)}, got {len(features)} after handling missing/errors."}), 400

        # --- Prediction Logic (Heart Disease) ---
        features_array = np.array([features])
        prediction = body_model.predict(features_array)[0]
        probability = body_model.predict_proba(features_array)[0][1] # Probability of class '1' (usually high risk)

        result = {
            'prediction': int(prediction),
            'probability': float(probability),
            'message': 'High risk of heart disease' if prediction == 1 else 'Low risk of heart disease'
        }
        return jsonify(result)

    except Exception as e:
        print(f"Error during body prediction: {e}")
        # Log the full error for debugging
        import traceback
        traceback.print_exc()
        return jsonify({"error": "An error occurred during prediction."}), 500


# --- Main Execution ---
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) # Enable debug for development