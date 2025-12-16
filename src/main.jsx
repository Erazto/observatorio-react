import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Font Awesome desde node_modules
import "@fortawesome/fontawesome-free/css/all.min.css";

import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
