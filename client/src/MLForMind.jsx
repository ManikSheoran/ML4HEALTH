import { useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function MLForMind() {
  const [userText, setUserText] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const response = await fetch("http://localhost:5000/predict/mind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userText }),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch results. Please try again.");
      }
      const data = await response.json();
      setResult(data);
    } catch (error) {
      setError(error.message);
    }
    setLoading(false);
  };

  const chartData = result
    ? {
        labels: Object.keys(result.probabilities),
        datasets: [
          {
            label: "Probability (%)",
            data: Object.values(result.probabilities),
            backgroundColor: "#021526",
            borderColor: "#021526",
            borderWidth: 1,
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.raw}%`,
        },
      },
    },
    scales: {
      x: { ticks: { color: "#333" }, grid: { display: false } },
      y: {
        ticks: { color: "#333", beginAtZero: true },
        grid: { color: "rgba(0, 0, 0, 0.1)" },
      },
    },
  };

  const renderArticles = () => {
    if (!result || !result.articles) return null;
    const allArticles = Object.values(result.articles).flat();
    return (
      <div className="mt-4">
        <h3 className="mb-3 text-center">
          <strong>Suggested Articles</strong>
        </h3>
        <ul className="list-group">
          {allArticles.map((article, index) => (
            <li key={index} className="results list-group-item border-0">
              <a href={article.url} target="_blank" rel="noopener noreferrer">
                {article.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="container py-5">
      <div className="text-center mb-4">
        <h1 className="fw-bold">
          ML <span>for</span> Mind
        </h1>
        <p>Your AI-powered mental health companion</p>
      </div>
      <div className="mb-4 p-4 shadow rounded">
        <textarea
          rows="4"
          placeholder="Describe your feelings..."
          value={userText}
          onChange={(e) => setUserText(e.target.value)}
          className="form-control mb-3 border-0 shadow-sm"
        />
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn btn-primary btn-lg shadow px-5 w-100"
        >
          {loading ? "Analyzing..." : "Check Status"}
        </button>
        {error && <p className="text-danger mt-3">{error}</p>}
      </div>

      {result && (
        <div className="row mb-4">
          <div className="col-md-6 mt-2 mb-2 d-flex align-items-stretch">
            <div className="results p-4 shadow rounded w-100 d-flex flex-column">
              <h2 className="text-center mb-4 text-dark">Results</h2>
              <div className="flex-grow-1">
                <Bar data={chartData} options={chartOptions} />
              </div>
              <p className="response mt-3 text-center fs-5">
                <strong>Most Likely Mood:</strong> {result.top_category}
              </p>
              <div className="flex-grow-1">{renderArticles()}</div>
            </div>
          </div>
          <div className="col-md-6 mt-2 mb-2 d-flex align-items-stretch">
            <div className="results p-4 shadow rounded w-100 d-flex flex-column">
              <h2 className="fw-bold">
                Music <span>for</span> Mind
              </h2>
              {result.playlist && (
                <iframe
                  className="mt-4 rounded w-100 border-0 shadow-sm"
                  src={result.playlist}
                  height="352"
                  frameBorder="0"
                  allowFullScreen
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  title="Music Playlist"
                ></iframe>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
