from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import random
import nltk

# Force re-download of 'punkt' to ensure all related files are available
nltk.download('punkt', force=True)

from nltk.tokenize import sent_tokenize
import numpy as np

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS

# Load trained model & vectorizer
try:
    model = joblib.load("models/mental_health_model.pkl")
    vectorizer = joblib.load("models/tfidf_vectorizer.pkl")
except Exception as e:
    print(f"Error loading model/vectorizer: {e}")
    model, vectorizer = None, None

# Define label mapping
label_mapping = {
    0: "Normal",
    1: "Depression",
    2: "Suicidal",
    3: "Anxiety",
    4: "Bipolar",
    5: "Stress",
    6: "Personality Disorder",
}

# Example articles for each category
articles = {
  "Normal": [
    {
      "title": "Building Better Mental Health - HelpGuide.org",
      "url": "https://www.helpguide.org/mental-health/wellbeing/building-better-mental-health"
    },
    {
      "title": "Caring for Your Mental Health - National Institute of Mental Health (NIMH)",
      "url": "https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health"
    },
    {
      "title": "5 Steps to Mental Wellbeing - NHS",
      "url": "https://www.nhs.uk/mental-health/self-help/guides-tools-and-activities/five-steps-to-mental-wellbeing/"
    },
    {
      "title": "Concept of mental health and mental well-being, it's determinants and coping strategies - PMC (NCBI)",
      "url": "https://pmc.ncbi.nlm.nih.gov/articles/PMC10911315/"
    }
  ],
  "Depression": [
    {
      "title": "Depression - American Psychological Association",
      "url": "https://www.apa.org/topics/depression"
    },
    {
      "title": "Depression: Causes, Symptoms, Types & Treatment - Cleveland Clinic",
      "url": "https://my.clevelandclinic.org/health/diseases/9290-depression"
    },
    {
      "title": "How to cope with depression - NHS",
      "url": "https://www.nhs.uk/mental-health/self-help/tips-and-support/cope-with-depression/"
    },
    {
      "title": "What Is Depression? - American Psychiatric Association",
      "url": "https://www.psychiatry.org/patients-families/depression/what-is-depression"
    }
  ],
  "Suicidal": [
    {
      "title": "Digital Shareables on Suicide Prevention - National Institute of Mental Health (NIMH)",
      "url": "https://www.nimh.nih.gov/get-involved/digital-shareables/shareable-resources-on-suicide-prevention"
    },
    {
      "title": "5 Action Steps to Help Someone Having Thoughts of Suicide - National Institute of Mental Health (NIMH)",
      "url": "https://www.nimh.nih.gov/health/publications/5-action-steps-to-help-someone-having-thoughts-of-suicide"
    },
    {
      "title": "Suicide Prevention - Psychiatry.org",
      "url": "https://www.psychiatry.org/patients-families/suicide-prevention"
    }
  ],
  "Anxiety": [
    {
      "title": "How to manage fear and anxiety | Mental Health Foundation",
      "url": "https://www.mentalhealth.org.uk/explore-mental-health/publications/how-overcome-anxiety-and-fear"
    },
    {
      "title": "Anxiety: Symptoms, types, causes, prevention, and treatment - MedicalNewsToday",
      "url": "https://www.medicalnewstoday.com/articles/323454"
    },
    {
      "title": "Anxiety self-care | Types of mental health problems - Mind",
      "url": "https://www.mind.org.uk/information-support/types-of-mental-health-problems/anxiety-and-panic-attacks/self-care/"
    },
    {
      "title": "How to Cope with Anxiety: Actionable Tips - Healthline",
      "url": "https://www.healthline.com/health/mental-health/how-to-cope-with-anxiety"
    }
  ],
  "Bipolar": [
    {
      "title": "6 important facts to know about bipolar disorder - United Healthcare",
      "url": "https://www.uhc.com/news-articles/healthy-living/6-important-facts-to-know-about-bipolar-disorder"
    },
    {
      "title": "Bipolar disorder - NHS",
      "url": "https://www.nhs.uk/mental-health/conditions/bipolar-disorder/"
    },
    {
      "title": "5 Positives of Living with Bipolar Disorder (Besides Creativity) - IBPF",
      "url": "https://ibpf.org/articles/5-positives-of-living-with-bipolar-disorder-besides-creativity/"
    },
    {
      "title": "Living with Bipolar Disorder: 7 Key Coping Skills - HelpGuide.org",
      "url": "https://www.helpguide.org/mental-health/bipolar-disorder/living-with-bipolar-disorder"
    }
  ],
  "Stress": [
    {
      "title": "Stress Management: Techniques to Deal with Stress - HelpGuide.org",
      "url": "https://www.helpguide.org/mental-health/stress/stress-management"
    },
    {
      "title": "5 Tips to Manage Stress - Mayo Clinic Health System",
      "url": "https://www.mayoclinichealthsystem.org/hometown-health/speaking-of-health/5-tips-to-manage-stress"
    },
    {
      "title": "Stress: Causes, symptoms, and management - MedicalNewsToday",
      "url": "https://www.medicalnewstoday.com/articles/145855"
    }
  ],
  "Personality Disorder": [
    {
      "title": "Personality Disorders: Types, Causes, Symptoms & Treatment - Cleveland Clinic",
      "url": "https://my.clevelandclinic.org/health/diseases/9636-personality-disorders-overview"
    },
    {
      "title": "Personality disorders - Symptoms and causes - Mayo Clinic",
      "url": "https://www.mayoclinic.org/diseases-conditions/personality-disorders/symptoms-causes/syc-20354463"
    },
    {
      "title": "Personality disorder: What are the different types? - MedicalNewsToday",
      "url": "https://www.medicalnewstoday.com/articles/192888"
    },
    {
      "title": "Understanding Personality Disorders: Types and Traits - Anxious Minds",
      "url": "https://www.anxiousminds.co.uk/understanding-personality-disorders-types/"
    }
  ]
}

# Spotify playlists for each mood
playlists = {
    "Normal": "https://open.spotify.com/embed/playlist/4kOdiP5gbzocwxQ8s2UTOF?utm_source=generator&theme=0",
    "Depression": "https://open.spotify.com/embed/playlist/1EqqMWr1CO0sZWsoCt63mN?utm_source=generator&theme=0",
    "Suicidal": "https://open.spotify.com/embed/playlist/41nJ95vG1Ecp27HW20Ew3d?utm_source=generator&theme=0",
    "Anxiety": "https://open.spotify.com/embed/playlist/0eU3ubPAnqeSMi9K3YKVpC?utm_source=generator&theme=0",
    "Bipolar": "https://open.spotify.com/embed/playlist/2PXRXZW12lxxsy04HnEaDX?utm_source=generator&theme=0",
    "Stress": "https://open.spotify.com/embed/playlist/0eU3ubPAnqeSMi9K3YKVpC?utm_source=generator&theme=0",
    "Personality Disorder": "https://open.spotify.com/embed/playlist/1XH9e1vyZN0KZ2ye976nCl?utm_source=generator&theme=0"
}

@app.route("/predict", methods=["POST"])
def predict():
    if not model or not vectorizer:
        return jsonify({"error": "Model not loaded properly"}), 500

    data = request.json
    user_text = data.get("text", "").strip()

    if not user_text:
        return jsonify({"error": "Empty input text"}), 400

    # Tokenize paragraph into sentences using a simple split
    sentences = user_text.split('.')
    sentences = [sentence.strip() for sentence in sentences if sentence.strip()]  # Remove empty sentences

    if not sentences:
        return jsonify({"error": "No valid sentences detected"}), 400

    # Store probabilities for each sentence
    sentence_probabilities = []

    for sentence in sentences:
        # Transform each sentence
        text_tfidf = vectorizer.transform([sentence])

        # Predict probabilities
        probabilities = model.predict_proba(text_tfidf)[0]  # Probability for each class

        # Append sentence probabilities
        sentence_probabilities.append(probabilities)

    # Convert to NumPy array for easier averaging
    sentence_probabilities = np.array(sentence_probabilities)

    # Calculate **average** probability for each class across sentences
    avg_probabilities = np.mean(sentence_probabilities, axis=0)

    # Convert averaged probabilities into a readable format
    result = {label_mapping[i]: round(prob * 100, 2) for i, prob in enumerate(avg_probabilities)}

    # Get the **highest predicted category**
    top_category = max(result, key=result.get)

    # Select articles for each category based on probabilities
    selected_articles = {}
    for category, probability in result.items():
        num_articles = round(probability / 100 * 3)
        selected_articles[category] = random.sample(articles[category], num_articles)  # Randomly select articles

    # Get the Spotify playlist for the top category
    playlist_url = playlists.get(top_category, "")

    return jsonify(
        {
            "probabilities": result,
            "top_category": top_category,
            "articles": selected_articles,  # Include selected articles for each category
            "playlist": playlist_url  # Include the Spotify playlist URL
        }
    )


if __name__ == "__main__":
    app.run(debug=True)
