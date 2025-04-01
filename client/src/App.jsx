import { Routes, Route, Link } from "react-router-dom";
import MLForMind from "./MLForMind";
import MLForBody from "./MLForBody";

export default function App() {
  return (
    <div>
      {/* Navigation Bar */}
      <nav
        className="navbar navbar-expand-lg"
        style={{ backgroundColor: "#021526" }}
      >
        <div className="container">
          <Link className="navbar-brand" to="/" style={{ color: "#6EACDA" }}>
            ML <span>for</span> Health
          </Link>
          <div className="collapse navbar-collapse">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <Link className="nav-link" to="/" style={{ color: "#E2E2B6" }}>
                  ML <span>for</span> Mind
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  className="nav-link"
                  to="/body"
                  style={{ color: "#E2E2B6" }}
                >
                  ML <span>for</span> Body
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* Define Routes */}
      <Routes>
        <Route path="/" element={<MLForMind />} />
        <Route path="/body" element={<MLForBody />} />
      </Routes>
    </div>
  );
}
