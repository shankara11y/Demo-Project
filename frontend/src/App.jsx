import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import FarmerDashboard from "./pages/farmer/FarmerDashboard";
import CropRecommendation from "./pages/farmer/CropRecommendation";
import FarmerProfile from "./pages/farmer/FarmerProfile";
import AdminDashboard from "./pages/admin/AdminDashboard";

export const App = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Farmer Dashboard Protected Routes */}
        <Route path="/farmer/dashboard" element={<FarmerDashboard />} />
        <Route path="/farmer/recommendations" element={<CropRecommendation />} />
        <Route path="/farmer/profile" element={<FarmerProfile />} />

        {/* Admin Dashboard Protected Routes */}
        <Route path="/admin/dashboard" element={<AdminDashboard />} />

        {/* Fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};
export default App;
