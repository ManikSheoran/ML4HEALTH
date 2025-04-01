import { useState, useEffect } from "react";
import { Doughnut, Radar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

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

export default function MLForBody() {
  const initialFormData = {
    age: "",
    gender: "",
    chestpain: "",
    restingBP: "",
    serumcholestrol: "",
    fastingbloodsugar: "",
    restingrelectro: "",
    maxheartrate: "",
    exerciseangia: "",
    oldpeak: "",
    slope: "",
    noofmajorvessels: "",
  };
  const [formData, setFormData] = useState(initialFormData);
  const [patientId, setPatientId] = useState("");

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const submissionData = Object.keys(formData).reduce((acc, key) => {
      const value = formData[key];

      if (value !== "" && !isNaN(value) && typeof value === "string") {
        acc[key] = value.includes(".")
          ? parseFloat(value)
          : parseInt(value, 10);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});

    try {
      const API_ENDPOINT = "http://localhost:5000/predict/body";

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },

        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        let errorMessage =
          "Prediction failed. Please check inputs or try again.";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {}
        throw new Error(errorMessage);
      }

      const data = await response.json();

      setResult(data);
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
      console.error("Prediction Error:", err);
    } finally {
      setLoading(false);
    }
  };

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
          <h5 className="mb-2">Priority Actions:</h5>
          <ul className="list-unstyled ps-3 ">
            <li>✓ Schedule an appointment with a cardiologist.</li>
            <li>✓ Discuss medication options with your provider.</li>
            <li>✓ Consider cardiac rehabilitation if recommended.</li>
            <li>✓ Make immediate lifestyle changes to reduce risk factors.</li>
          </ul>
        </div>
      );
    } else {
      suggestionsHTML.push(
        <p key="risk-msg" className=" fw-bold mb-3">
          Your assessment indicates a lower risk ({riskPercentage}%) for heart
          disease. Continue with preventive measures.
        </p>,
        <div key="preventive-actions" className="mb-4">
          <h5 className="mb-2">Preventive Actions:</h5>
          <ul className="list-unstyled ps-3 ">
            <li>✓ Maintain your current heart-healthy practices.</li>
            <li>✓ Continue with regular health check-ups.</li>
            <li>✓ Stay physically active and maintain a healthy weight.</li>
          </ul>
        </div>
      );
    }

    suggestionsHTML.push(
      <div key="general-recs" className="mb-4">
        <h5 className="mb-2">General Heart Health Recommendations:</h5>
        <ul className="list-unstyled ps-3 ">
          {generalSuggestions.map((s, i) => (
            <li key={i}>• {s}</li>
          ))}
        </ul>
      </div>
    );

    if (specificSuggestions.length > 0) {
      suggestionsHTML.push(
        <div key="specific-recs">
          <h5 className="mb-2">
            Specific Recommendations Based on Your Profile:
          </h5>
          <ul className="list-unstyled ps-3 ">
            {specificSuggestions.map((s, i) => (
              <li key={i}>• {s}</li>
            ))}
          </ul>
        </div>
      );
    }

    return (
      <div className="mt-4 p-4 box rounded shadow-sm">
        <h3 className="mb-3 text-center">
          Personalized Health Recommendations
        </h3>
        {suggestionsHTML}
      </div>
    );
  };

  const riskChartData = result
    ? {
        labels: ["Risk %", "Safe %"],
        datasets: [
          {
            data: [result.probability * 100, (1 - result.probability) * 100],
            backgroundColor: [
              "rgba(217, 83, 79, 0.7)",
              "rgba(92, 184, 92, 0.7)",
            ],
            borderColor: ["#", "rgba(92, 184, 92, 1)"],
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
    cutout: "60%",
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

  const factorsChartData = result
    ? (() => {
        const getSafeFloat = (val) =>
          val === "" || isNaN(parseFloat(val)) ? 0 : parseFloat(val);

        const age = getSafeFloat(formData.age);
        const restingBP = getSafeFloat(formData.restingBP);
        const serumcholestrol = getSafeFloat(formData.serumcholestrol);
        const maxheartrate = getSafeFloat(formData.maxheartrate);

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
          },
        };

        const normalize = (value, key) => {
          const ref = references[key];
          if (value < ref.min) value = ref.min;
          if (value > ref.max) value = ref.max;
          let normalized = ((value - ref.min) / (ref.max - ref.min)) * 100;

          if (key === "maxheartrate") {
            normalized = 100 - normalized;
          }
          return normalized;
        };
        const normalizeOptimal = (key) => {
          const ref = references[key];

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
              backgroundColor: "rgba(54, 162, 235, 0.2)",
              borderColor: "rgba(54, 162, 235, 1)",
              pointBackgroundColor: "rgba(54, 162, 235, 1)",
              pointBorderColor: "#fff",
            },
            {
              label: "Optimal Zone Midpoint (Normalized)",
              data: optimalData,
              backgroundColor: "rgba(75, 192, 192, 0.2)",
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
        angleLines: { display: true },
        suggestedMin: 0,
        suggestedMax: 100,
        ticks: { display: false },
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
        callbacks: {},
      },
    },
  };

  return (
    <div className="container py-5">
      {}
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

      {}
      <form
        onSubmit={handleSubmit}
        className="mb-5 p-4 shadow rounded bg-white"
      >
        <h2 className="mb-4">Patient Information</h2>
        {}
        <div className="row g-3">
          {}
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

          {}
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

          {}
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
              <option value="4">4: Asymptomatic</option> {}
            </select>
          </div>

          {}
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

          {}
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

          {}
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

          {}
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

          {}
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

          {}
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

          {}
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

          {}
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

          {}
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

          {}
          {}
        </div>{" "}
        <div className="mt-4 text-center">
          <button
            type="submit"
            className="btn btn-primary btn-lg shadow px-5 w-100"
            disabled={loading}
          >
            {loading ? "Analyzing..." : "Predict Risk"}
          </button>
          {error && <p className="text-danger mt-3">{error}</p>}
        </div>
      </form>

      {}
      {result && !loading && (
        <div className="p-4 shadow rounded bg-white mb-5">
          <h2 className=" mb-4 text-center">Prediction Results</h2>
          {patientId && (
            <p className="text-center ">Reference Patient ID: {patientId}</p>
          )}

          <p
            className={`text-center fs-4 mb-4 fw-bold ${
              result.prediction === 1 ? "text-danger" : ""
            }`}
          >
            {result.message} {}
          </p>

          {}
          <div className="row mb-4">
            {}
            <div className="col-md-6 mb-4 mb-md-0 d-flex flex-column align-items-center">
              <h4 className="text-center  mb-3">Risk Probability</h4>
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

            {}
            <div className="col-md-6 d-flex flex-column align-items-center">
              <h4 className="text-center  mb-3">Key Metrics</h4>
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

          {}
          {renderHealthSuggestions()}
        </div>
      )}

      {}
      <div className="text-center mt-4">
        <p className="small ">
          <strong>Disclaimer:</strong> This prediction tool is for informational
          purposes only and does not constitute medical advice. Consult a
          qualified healthcare professional for any health concerns or before
          making any decisions related to your health or treatment.
        </p>
      </div>
    </div>
  );
}
