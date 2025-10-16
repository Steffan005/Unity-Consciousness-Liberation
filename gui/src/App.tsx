import { useState, useEffect } from "react";
import { Dashboard } from "./pages/Dashboard";
import { api } from "./lib/api";
import "./App.css";

function App() {
  useEffect(() => {
    // Run initial preflight check
    const checkPreflight = async () => {
      try {
        await api.isPreflightPassed();
      } catch (err) {
        console.error("Preflight check failed:", err);
      }
    };

    checkPreflight();
  }, []);

  return <Dashboard />;
}

export default App;
