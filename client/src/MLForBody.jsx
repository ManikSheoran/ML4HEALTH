import { useState, useEffect } from "react";
import { Doughnut, Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale, // Needed for Radar Chart
  ArcElement, // Needed for Doughnut Chart
  Title,
  Tooltip,
  Legend,
  Filler, // Often needed for Radar chart fill
} from "chart.js";

// Register necessary Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// --- Component Start ---
export default function MLForBody() {
  // State for form inputs
  const initialFormData = {
    age: "",
    gender: "", // Use '1' for Male, '0' for Female
    chestpain: "", // Use 1, 2, 3, 4
    restingBP: "",
    serumcholestrol: "",
    fastingbloodsugar: "", // Use '1' for Yes, '0' for No
    restingrelectro: "", // Use 0, 1, 2
    maxheartrate: "",
    exerciseangia: "", // Use '1' for Yes, '0' for No
    oldpeak: "",
    slope: "", // Use 1, 2, 3
    noofmajorvessels: "", // Use 0, 1, 2, 3
    // Note: 'thal' (Thalassemia) was in your JS mappings but not in the HTML form.
    // Add it here if your model requires it. Example: thal: ''
  };
  const [formData, setFormData] = useState(initialFormData);
  const [patientId, setPatientId] = useState(""); // For reference only

  // State for API interaction and results
  const [result, setResult] = useState(null); // Stores { prediction, probability, message }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --- Handlers ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handlePatientIdChange = (e) => {
    setPatientId(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission
    setLoading(true);
    setResult(null);
    setError(null);

    // Convert relevant fields to numbers if necessary (depends on backend)
    // Many APIs handle string numbers, but explicit conversion is safer.
    const submissionData = Object.keys(formData).reduce((acc, key) => {
      const value = formData[key];
      // Only convert non-empty strings that represent numbers
      if (value !== "" && !isNaN(value) && typeof value === "string") {
        // Check if it's a float (like oldpeak)
        acc[key] = value.includes(".")
          ? parseFloat(value)
          : parseInt(value, 10);
      } else {
        acc[key] = value; // Keep as is (empty string or already a number)
      }
      return acc;
    }, {});

    try {
      // *** IMPORTANT: Replace with your actual API endpoint ***
      const API_ENDPOINT =
        process.env.REACT_APP_BODY_API_URL ||
        "http://localhost:5000/predict_body"; // Example

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Send the core form data, NOT the patientId
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        let errorMessage =
          "Prediction failed. Please check inputs or try again.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          // Response wasn't JSON or errored during parsing
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      // Assuming API returns { prediction: 0 or 1, probability: float, message: string }
      setResult(data);
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
      console.error("Prediction Error:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- Helper Functions for Rendering Results ---

  // Generate Health Suggestions (adapted from your JS)
  const renderHealthSuggestions = () => {
    if (!result) return null;

    const { prediction, probability } = result;
    const riskLevel = prediction === 1 ? "high" : "low";
    const riskPercentage = (probability * 100).toFixed(1);

    let suggestionsHTML = [];

    const generalSuggestions = [
      "Maintain a heart-healthy diet rich in fruits, vegetables, whole grains, and lean proteins.",
      "Aim for at least 150 minutes of moderate exercise per week.",
      "Monitor and manage your blood pressure and cholesterol levels.",
      "Avoid smoking and limit alcohol consumption.",
      "Manage stress through relaxation techniques, adequate sleep, and social connections.",
    ];

    const specificSuggestions = [];
    // Use parseFloat for comparisons to handle potential string inputs if not converted earlier
    const age = parseFloat(formData.age);
    const chol = parseFloat(formData.serumcholestrol);
    const bp = parseFloat(formData.restingBP);
    const maxhr = parseFloat(formData.maxheartrate);

    if (!isNaN(age) && age > 50)
      specificSuggestions.push(
        "Consider regular heart check-ups as age is a significant risk factor."
      );
    if (!isNaN(chol) && chol > 200)
      specificSuggestions.push(
        "Your cholesterol level is elevated. Consider dietary changes and consult your doctor about management options."
      );
    if (!isNaN(bp) && bp > 130)
      specificSuggestions.push(
        "Your blood pressure reading is above optimal levels. Regular monitoring and lifestyle modifications are recommended."
      );
    if (!isNaN(maxhr) && maxhr < 150)
      specificSuggestions.push(
        "Your maximum heart rate during exercise is lower than average. Gradual, supervised exercise may help improve cardiac fitness."
      );

    if (riskLevel === "high") {
      suggestionsHTML.push(
        <p key="risk-msg" className="text-danger fw-bold mb-3">
          Your assessment indicates a higher risk ({riskPercentage}%) for heart
          disease. Please consult with a healthcare provider promptly.
        </p>,
        <div key="priority-actions" className="mb-4">
          <h5 className="text-dark mb-2">Priority Actions:</h5>
          <ul className="list-unstyled ps-3 text-secondary">
            <li>✓ Schedule an appointment with a cardiologist.</li>
            <li>✓ Discuss medication options with your provider.</li>
            <li>✓ Consider cardiac rehabilitation if recommended.</li>
            <li>✓ Make immediate lifestyle changes to reduce risk factors.</li>
          </ul>
        </div>
      );
    } else {
      suggestionsHTML.push(
        <p key="risk-msg" className="text-success fw-bold mb-3">
          Your assessment indicates a lower risk ({riskPercentage}%) for heart
          disease. Continue with preventive measures.
        </p>,
        <div key="preventive-actions" className="mb-4">
          <h5 className="text-dark mb-2">Preventive Actions:</h5>
          <ul className="list-unstyled ps-3 text-secondary">
            <li>✓ Maintain your current heart-healthy practices.</li>
            <li>✓ Continue with regular health check-ups.</li>
            <li>✓ Stay physically active and maintain a healthy weight.</li>
          </ul>
        </div>
      );
    }

    suggestionsHTML.push(
      <div key="general-recs" className="mb-4">
        <h5 className="text-dark mb-2">
          General Heart Health Recommendations:
        </h5>
        <ul className="list-unstyled ps-3 text-secondary">
          {generalSuggestions.map((s, i) => (
            <li key={i}>• {s}</li>
          ))}
        </ul>
      </div>
    );

    if (specificSuggestions.length > 0) {
      suggestionsHTML.push(
        <div key="specific-recs">
          <h5 className="text-dark mb-2">
            Specific Recommendations Based on Your Profile:
          </h5>
          <ul className="list-unstyled ps-3 text-secondary">
            {specificSuggestions.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>
      );
    }

    return (
      <div className="mt-4 p-4 bg-light rounded shadow-sm">
        <h3 className="text-primary mb-3 text-center">
          Personalized Health Recommendations
        </h3>
        {suggestionsHTML}
      </div>
    );
  };

  // --- Chart Data and Options ---

  // Doughnut Chart (Risk Probability)
  const riskChartData = result
    ? {
        labels: ["Risk %", "Safe %"],
        datasets: [
          {
            data: [result.probability * 100, (1 - result.probability) * 100],
            backgroundColor: [
              "rgba(217, 83, 79, 0.7)",
              "rgba(92, 184, 92, 0.7)",
            ], // Red (danger), Green (success)
            borderColor: ["rgba(217, 83, 79, 1)", "rgba(92, 184, 92, 1)"],
            borderWidth: 1,
          },
        ],
      }
    : null;

  const riskChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    circumference: 180,
    rotation: -90,
    cutout: "60%", // Makes it a doughnut
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: `Risk Probability: ${(result?.probability * 100 || 0).toFixed(
          1
        )}%`,
        position: "top",
        font: { size: 16 },
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${context.raw.toFixed(1)}%`,
        },
      },
    },
  };

  // Radar Chart (Key Health Factors) - Adapted from your JS
  const factorsChartData = result
    ? (() => {
        // Use parseFloat safely
        const getSafeFloat = (val) =>
          val === "" || isNaN(parseFloat(val)) ? 0 : parseFloat(val);

        const age = getSafeFloat(formData.age);
        const restingBP = getSafeFloat(formData.restingBP);
        const serumcholestrol = getSafeFloat(formData.serumcholestrol);
        const maxheartrate = getSafeFloat(formData.maxheartrate);

        // Reference values (adjust these based on medical guidelines or your model's baseline)
        const references = {
          age: {
            min: 20,
            max: 80,
            optimalLow: 30,
            optimalHigh: 55,
            label: "Age",
          },
          restingBP: {
            min: 90,
            max: 180,
            optimalLow: 110,
            optimalHigh: 130,
            label: "Resting BP",
          },
          serumcholestrol: {
            min: 100,
            max: 350,
            optimalLow: 150,
            optimalHigh: 200,
            label: "Cholesterol",
          },
          maxheartrate: {
            min: 70,
            max: 210,
            optimalLow: 140,
            optimalHigh: 180,
            label: "Max Heart Rate",
          }, // Lower is not always better here, higher generally fitter
        };

        // Normalize: map value to 0-100 scale relative to min/max. Invert scale if lower is worse.
        const normalize = (value, key) => {
          const ref = references[key];
          if (value < ref.min) value = ref.min;
          if (value > ref.max) value = ref.max;
          let normalized = ((value - ref.min) / (ref.max - ref.min)) * 100;
          // Invert for Max Heart Rate where higher is generally better within range
          if (key === "maxheartrate") {
            normalized = 100 - normalized; // Now 100 is 'worst' (lowest HR), 0 is 'best' (highest HR)
          }
          return normalized; // Higher score means 'further from optimal low' or 'closer to max'
        };
        const normalizeOptimal = (key) => {
          const ref = references[key];
          // Represent optimal range midpoint, normalized
          const midOptimal = (ref.optimalLow + ref.optimalHigh) / 2;
          return normalize(midOptimal, key);
        };

        const factors = Object.keys(references);
        const labels = factors.map((f) => references[f].label);
        const userData = factors.map((f) =>
          normalize(getSafeFloat(formData[f]), f)
        );
        const optimalData = factors.map((f) => normalizeOptimal(f));

        return {
          labels: labels,
          datasets: [
            {
              label: "Your Metric (Normalized)",
              data: userData,
              backgroundColor: "rgba(54, 162, 235, 0.2)", // Blue
              borderColor: "rgba(54, 162, 235, 1)",
              pointBackgroundColor: "rgba(54, 162, 235, 1)",
              pointBorderColor: "#fff",
            },
            {
              label: "Optimal Zone Midpoint (Normalized)",
              data: optimalData,
              backgroundColor: "rgba(75, 192, 192, 0.2)", // Green
              borderColor: "rgba(75, 192, 192, 1)",
              pointBackgroundColor: "rgba(75, 192, 192, 1)",
              pointBorderColor: "#fff",
            },
          ],
        };
      })()
    : null;

  const factorsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        // Radial axis
        angleLines: { display: true },
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: { display: false }, // Hide numerical ticks on radial axis if desired
        pointLabels: { font: { size: 13 } },
      },
    },
    plugins: {
      legend: { position: "bottom" },
      title: {
        display: true,
        text: "Key Health Metrics (Normalized)",
        font: { size: 16 },
      },
      tooltip: {
        callbacks: {
          // Optional: Add context or interpretation to tooltips
          // label: function(context) { return `${context.dataset.label}: ${context.formattedValue}`; }
        },
      },
    },
  };

  // --- JSX Render ---
  return (
    <div className="container py-5">
      {/* Header */}
      <div className="text-center mb-5">
        <h1 className="fw-bold">
          ML <span>for</span> Body
        </h1>
        <p className="">Heart Disease Risk Assessment Tool</p>
        <p className="small text-warning">
          Note: This tool provides an estimate only and is not a substitute for
          professional medical advice.
        </p>
      </div>

      {/* Form Section */}
      <form
        onSubmit={handleSubmit}
        className="mb-5 p-4 shadow rounded bg-white"
      >
        <h2 className="text-primary mb-4">Patient Information</h2>
        {/* Input Fields in a Grid */}
        <div className="row g-3">
          {/* Age */}
          <div className="col-md-4">
            <label htmlFor="age" className="form-label">
              Age
            </label>
            <input
              type="number"
              id="age"
              name="age"
              value={formData.age}
              onChange={handleChange}
              className="form-control"
              required
              min="1"
            />
          </div>

          {/* Gender */}
          <div className="col-md-4">
            <label htmlFor="gender" className="form-label">
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">Select...</option>
              <option value="1">Male</option>
              <option value="0">Female</option>
            </select>
          </div>

          {/* Chest Pain Type */}
          <div className="col-md-4">
            <label htmlFor="chestpain" className="form-label">
              Chest Pain Type
            </label>
            <select
              id="chestpain"
              name="chestpain"
              value={formData.chestpain}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">Select...</option>
              <option value="1">1: Typical Angina</option>
              <option value="2">2: Atypical Angina</option>
              <option value="3">3: Non-anginal Pain</option>
              <option value="4">4: Asymptomatic</option>{" "}
              {/* Values seem off in HTML? Check model reqs. Assuming 1-4 based on HTML */}
            </select>
          </div>

          {/* Resting BP */}
          <div className="col-md-4">
            <label htmlFor="restingBP" className="form-label">
              Resting BP (mm Hg)
            </label>
            <input
              type="number"
              id="restingBP"
              name="restingBP"
              value={formData.restingBP}
              onChange={handleChange}
              className="form-control"
              required
              min="0"
            />
          </div>

          {/* Serum Cholesterol */}
          <div className="col-md-4">
            <label htmlFor="serumcholestrol" className="form-label">
              Serum Cholesterol (mg/dl)
            </label>
            <input
              type="number"
              id="serumcholestrol"
              name="serumcholestrol"
              value={formData.serumcholestrol}
              onChange={handleChange}
              className="form-control"
              required
              min="0"
            />
          </div>

          {/* Fasting Blood Sugar */}
          <div className="col-md-4">
            <label htmlFor="fastingbloodsugar" className="form-label">
              Fasting Blood Sugar {">"} 120 mg/dl
            </label>
            <select
              id="fastingbloodsugar"
              name="fastingbloodsugar"
              value={formData.fastingbloodsugar}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">Select...</option>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </div>

          {/* Resting ECG */}
          <div className="col-md-4">
            <label htmlFor="restingrelectro" className="form-label">
              Resting ECG Results
            </label>
            <select
              id="restingrelectro"
              name="restingrelectro"
              value={formData.restingrelectro}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">Select...</option>
              <option value="0">0: Normal</option>
              <option value="1">1: ST-T Wave Abnormality</option>
              <option value="2">2: Left Ventricular Hypertrophy</option>
            </select>
          </div>

          {/* Max Heart Rate */}
          <div className="col-md-4">
            <label htmlFor="maxheartrate" className="form-label">
              Max Heart Rate Achieved
            </label>
            <input
              type="number"
              id="maxheartrate"
              name="maxheartrate"
              value={formData.maxheartrate}
              onChange={handleChange}
              className="form-control"
              required
              min="0"
            />
          </div>

          {/* Exercise Induced Angina */}
          <div className="col-md-4">
            <label htmlFor="exerciseangia" className="form-label">
              Exercise Induced Angina
            </label>
            <select
              id="exerciseangia"
              name="exerciseangia"
              value={formData.exerciseangia}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">Select...</option>
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </div>

          {/* Oldpeak */}
          <div className="col-md-4">
            <label htmlFor="oldpeak" className="form-label">
              ST Depression (Oldpeak)
            </label>
            <input
              type="number"
              id="oldpeak"
              name="oldpeak"
              value={formData.oldpeak}
              onChange={handleChange}
              className="form-control"
              required
              step="0.1"
              min="0"
            />
          </div>

          {/* Slope */}
          <div className="col-md-4">
            <label htmlFor="slope" className="form-label">
              Slope of Peak Exercise ST
            </label>
            <select
              id="slope"
              name="slope"
              value={formData.slope}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">Select...</option>
              <option value="1">1: Upsloping</option>
              <option value="2">2: Flat</option>
              <option value="3">3: Downsloping</option>
            </select>
          </div>

          {/* Number of Major Vessels */}
          <div className="col-md-4">
            <label htmlFor="noofmajorvessels" className="form-label">
              Major Vessels Colored (0-3)
            </label>
            <select
              id="noofmajorvessels"
              name="noofmajorvessels"
              value={formData.noofmajorvessels}
              onChange={handleChange}
              className="form-select"
              required
            >
              <option value="">Select...</option>
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
            </select>
          </div>

          {/* Add 'thal' dropdown here if needed by your model */}
          {/* <div className="col-md-4"> ... Thal ... </div> */}
        </div>{" "}
        {/* End row g-3 */}
        {/* Submission Button and Error */}
        <div className="mt-4 text-center">
          <button
            type="submit"
            className="btn btn-primary btn-lg shadow px-5"
            disabled={loading}
          >
            {loading ? "Analyzing..." : "Predict Risk"}
          </button>
          {error && <p className="text-danger mt-3">{error}</p>}
        </div>
      </form>

      {/* Results Section */}
      {result && !loading && (
        <div className="p-4 shadow rounded bg-white mb-5">
          <h2 className="text-primary mb-4 text-center">Prediction Results</h2>
          {patientId && (
            <p className="text-center ">Reference Patient ID: {patientId}</p>
          )}

          <p
            className={`text-center fs-4 mb-4 fw-bold ${
              result.prediction === 1 ? "text-danger" : "text-success"
            }`}
          >
            {result.message} {/* Use message from API */}
          </p>

          {/* Charts Side-by-Side */}
          <div className="row mb-4">
            {/* Risk Chart */}
            <div className="col-md-6 mb-4 mb-md-0 d-flex flex-column align-items-center">
              <h4 className="text-center text-secondary mb-3">
                Risk Probability
              </h4>
              <div
                style={{
                  position: "relative",
                  height: "250px",
                  width: "250px",
                }}
              >
                {riskChartData && (
                  <Doughnut data={riskChartData} options={riskChartOptions} />
                )}
              </div>
            </div>

            {/* Factors Chart */}
            <div className="col-md-6 d-flex flex-column align-items-center">
              <h4 className="text-center text-secondary mb-3">Key Metrics</h4>
              <div
                style={{
                  position: "relative",
                  height: "300px",
                  width: "100%",
                  maxWidth: "400px",
                }}
              >
                {factorsChartData && (
                  <Radar
                    data={factorsChartData}
                    options={factorsChartOptions}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Health Suggestions */}
          {renderHealthSuggestions()}
        </div>
      )}

      {/* Disclaimer Footer */}
      <div className="text-center mt-4">
        <p className="small ">
          <strong>Disclaimer:</strong> This prediction tool is for informational
          purposes only and does not constitute medical advice. Consult a
          qualified healthcare professional for any health concerns or before
          making any decisions related to your health or treatment.
        </p>
      </div>
    </div> // End container
  );
}
