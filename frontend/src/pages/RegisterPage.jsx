import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { Sprout, Phone, Lock, User, MapPin, Compass, Info, ArrowLeft, Languages } from "lucide-react";

const CROPS_OPTIONS = ["Rice", "Wheat", "Soybean", "Cotton", "Maize", "Millets", "Groundnut"];

export const RegisterPage = () => {
  const { API_URL } = useContext(AppContext);
  const navigate = useNavigate();

  // Fields
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [farmerType, setFarmerType] = useState("smartphone"); // 'smartphone' | 'keypad'
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [farmSize, setFarmSize] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [selectedCrops, setSelectedCrops] = useState([]);
  
  const [detecting, setDetecting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleCropCheckbox = (crop) => {
    if (selectedCrops.includes(crop)) {
      setSelectedCrops(selectedCrops.filter((c) => c !== crop));
    } else {
      setSelectedCrops([...selectedCrops, crop]);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setDetecting(true);
    setError("");
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setDetecting(false);
      },
      (err) => {
        console.error(err);
        setError("Unable to retrieve GPS coordinates. Village center coordinates will be geocoded automatically on submit.");
        setDetecting(false);
      },
      { timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    if (selectedCrops.length === 0) {
      setError("Please select at least one crop type.");
      setLoading(false);
      return;
    }

    const payload = {
      name,
      mobile,
      password: farmerType === "smartphone" ? password : "",
      aadhaar,
      farmer_type: farmerType,
      preferred_language: preferredLanguage,
      farm_size: farmSize ? parseFloat(farmSize) : 0,
      village,
      district,
      state,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      crop_types: selectedCrops
    };

    try {
      const response = await axios.post(`${API_URL}/register`, payload);
      setSuccess("Registration successful! Redirecting to login...");
      setTimeout(() => {
        navigate(farmerType === "smartphone" ? "/login" : "/");
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Registration failed. Check details and retry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      
      {/* Back button */}
      <div className="absolute top-4 left-4">
        <Link 
          to="/" 
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Home
        </Link>
      </div>

      <div className="max-w-2xl mx-auto">
        
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="bg-primary-500 text-white p-3 rounded-2xl shadow-lg shadow-primary-500/20">
              <Sprout className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
            Farmer Registration Portal
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Join AgriCast to receive village-level sowing advisories.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 relative overflow-hidden">
          
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-bold">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-bold">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Farmer Type toggle */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                What type of phone do you use?
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFarmerType("smartphone")}
                  className={`p-4 rounded-2xl border text-center font-bold text-sm transition-all flex flex-col items-center gap-1.5 ${
                    farmerType === "smartphone"
                      ? "border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-400 shadow-md"
                      : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Compass className="w-5 h-5" />
                  Smartphone Farmer
                </button>
                
                <button
                  type="button"
                  onClick={() => setFarmerType("keypad")}
                  className={`p-4 rounded-2xl border text-center font-bold text-sm transition-all flex flex-col items-center gap-1.5 ${
                    farmerType === "keypad"
                      ? "border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-400 shadow-md"
                      : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <Phone className="w-5 h-5" />
                  Keypad Farmer (SMS Only)
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                {farmerType === "keypad" 
                  ? "You will receive sowing advisories via regular text SMS only. No login needed." 
                  : "You can log in to view the interactive map, weather charts, and suitability indicators."}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Name */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sanjay Patil"
                    className="block w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent placeholder-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Mobile Number (for SMS)
                </label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                    placeholder="9876543210"
                    className="block w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent placeholder-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Password (if smartphone) */}
              {farmerType === "smartphone" && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Create Password
                  </label>
                  <div className="relative rounded-2xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-5 h-5" />
                    </div>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="block w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent placeholder-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Aadhaar */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Aadhaar Card Number (Optional)
                </label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Info className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    maxLength={12}
                    value={aadhaar}
                    onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456789012"
                    className="block w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent placeholder-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Farm Size */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Farm Size (Acres)
                </label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Compass className="w-5 h-5" />
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={farmSize}
                    onChange={(e) => setFarmSize(e.target.value)}
                    placeholder="4.5"
                    className="block w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent placeholder-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {/* Preferred Language */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Preferred Advisory Language
                </label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Languages className="w-5 h-5" />
                  </div>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="block w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent text-slate-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिन्दी (Hindi)</option>
                    <option value="mr">मराठी (Marathi)</option>
                  </select>
                </div>
              </div>

            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Address */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">Geographic Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  required
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="Village Name"
                  className="block w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent placeholder-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
                <input
                  type="text"
                  required
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="District"
                  className="block w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent placeholder-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
                <input
                  type="text"
                  required
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="block w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent placeholder-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Coordinates geocoding details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  GPS Coordinates (Optional)
                </label>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={detecting}
                  className="text-xs font-extrabold text-primary-500 hover:text-primary-600 flex items-center gap-1 focus:outline-none"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {detecting ? "Detecting GPS..." : "Detect Location"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Latitude (e.g. 19.0760)"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="block w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent placeholder-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
                <input
                  type="text"
                  placeholder="Longitude (e.g. 72.8777)"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="block w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent placeholder-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Preferred Crops */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                Preferred Crops you cultivate:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CROPS_OPTIONS.map((crop) => (
                  <button
                    key={crop}
                    type="button"
                    onClick={() => handleCropCheckbox(crop)}
                    className={`px-4 py-2.5 rounded-2xl border text-sm font-bold transition-all text-left flex items-center justify-between ${
                      selectedCrops.includes(crop)
                        ? "border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-400"
                        : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {crop}
                    {selectedCrops.includes(crop) && (
                      <span className="w-2.5 h-2.5 rounded-full bg-primary-500"></span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 rounded-2xl border border-transparent shadow-lg text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-primary-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Registering Account..." : "Register Farm"}
              </button>
            </div>

          </form>

          <div className="mt-6 text-center">
            <span className="text-sm text-slate-500">Already registered? </span>
            <Link to="/login" className="text-sm font-bold text-primary-500 hover:text-primary-600">
              Sign In
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
};
export default RegisterPage;
