import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import EditorPage from "./pages/EditorPage";
import LandingPage from "./pages/LandingPage";
import TeachingPage from "./pages/TeachingPage";
import Header from "./components/header/Header";
import "./App.css";
import { NotificationProvider } from "./context/NotificationContext";

// ✅ Wrapper to control header visibility
function AppContent() {
  const location = useLocation();

  // Hide Header only on /editor
  const hideHeader = location.pathname === "/editor";
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/health`);
        const data = await res.json();
        console.log("✅ Backend health:", data);
      } catch (err) {
        console.error("❌ Could not reach backend:", err);
      }finally{
        console.log("Backend in use:", import.meta.env.VITE_API_BASE_URL);
      }
    };

    checkHealth();
  }, []);

  return (
    <>
      {!hideHeader && <Header />} {/* ✅ Only show header if not on /editor */}
      {!hideHeader && <div style={{ height: "10vh" }} />} {/* spacing for header */}

      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/teaching" element={<TeachingPage />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <Router>
        <AppContent />
      </Router>
    </NotificationProvider>
  );
}
