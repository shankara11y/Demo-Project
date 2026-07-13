import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { Sprout, ArrowLeft, User, Phone, MapPin, Compass, CheckCircle2, Languages } from "lucide-react";

const CROPS_OPTIONS = ["Rice", "Wheat", "Soybean", "Cotton", "Maize", "Millets", "Groundnut"];

export const FarmerProfile = () => {
  const { token, API_URL, translate } = useContext(AppContext);
  const navigate = useNavigate();

  // Profile Form Fields
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [farmSize, setFarmSize] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [selectedCrops, setSelectedCrops] = useState([]);
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");
  const [state, setState] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${API_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const p = response.data;
        setName(p.name);
        setMobile(p.mobile);
        setFarmSize(p.farm_size || "");
        setPreferredLanguage(p.preferred_language || "en");
        setSelectedCrops(p.crop_types || []);
        setVillage(p.village || "");
        setDistrict(p.district || "");
        setState(p.state || "");
        setLatitude(p.latitude || "");
        setLongitude(p.longitude || "");
      } catch (err) {
        console.error(err);
        setError("Failed to fetch profile settings.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

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
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setDetecting(false);
      },
      (err) => {
        console.error(err);
        setError("GPS tracking permission denied.");
        setDetecting(false);
      }
    );
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError("");
    setSuccess("");

    if (selectedCrops.length === 0) {
      setError("Please select at least one crop type.");
      setUpdating(false);
      return;
    }

    const payload = {
      name,
      farm_size: parseFloat(farmSize) || 0.0,
      preferred_language: preferredLanguage,
      crop_types: selectedCrops,
      village,
      district,
      state,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null
    };

    try {
      await axios.put(`${API_URL}/profile`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess("Profile settings updated successfully!");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Failed to update profile parameters.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-slate-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 pb-12">
      
      {/* Header */}
      <header className="glass-panel sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link 
            to="/farmer/dashboard" 
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> {translate("dashboard")}
          </Link>
          <h2 className="font-extrabold text-base bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
            {translate("profile")} Settings
          </h2>
          <div className="w-16"></div> {/* Spacer */}
        </div>
      </header>

      {/* Form Container */}
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10">
          
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm font-bold">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              {success}
            </div>
          )}

          <form onSubmit={handleUpdate} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Full Name</label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-850 dark:text-white"
                  />
                </div>
              </div>

              {/* Mobile (read-only index) */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Registered Mobile</label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-300">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    disabled
                    value={mobile}
                    className="block w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-100 bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:border-slate-800 text-sm focus:outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Farm Size */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">{translate("farm_size")}</label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Compass className="w-4 h-4" />
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={farmSize}
                    onChange={(e) => setFarmSize(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-850 dark:text-white"
                  />
                </div>
              </div>

              {/* Preferred Language */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Preferred Language</label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Languages className="w-4 h-4" />
                  </div>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-850 dark:text-white"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिन्दी</option>
                    <option value="mr">मराठी</option>
                  </select>
                </div>
              </div>

            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Geographic Address */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">Geographic Address</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-400 mb-1">Village</label>
                  <input
                    type="text"
                    required
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="block w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-850 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-400 mb-1">District</label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="block w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-850 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-400 mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="block w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-850 dark:text-white"
                  />
                </div>
              </div>
            </div>

            {/* Coordinates geocoding details */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  GPS Coordinates
                </label>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={detecting}
                  className="text-xs font-extrabold text-primary-500 hover:text-primary-600 flex items-center gap-1 focus:outline-none"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {detecting ? "Locating..." : "Autofill GPS Coordinates"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Latitude"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="block w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-850 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Longitude"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="block w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-850 dark:text-white"
                />
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Crops list */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
                Preferred Crop Types
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CROPS_OPTIONS.map((crop) => (
                  <button
                    key={crop}
                    type="button"
                    onClick={() => handleCropCheckbox(crop)}
                    className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between ${
                      selectedCrops.includes(crop)
                        ? "border-primary-500 bg-primary-500/10 text-primary-700 dark:text-primary-400"
                        : "border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {crop}
                    {selectedCrops.includes(crop) && (
                      <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={updating}
                className="w-full flex justify-center py-3.5 px-4 rounded-2xl border border-transparent shadow-lg text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-primary-500/25 transition-all disabled:opacity-50"
              >
                {updating ? "Saving Changes..." : translate("save_profile")}
              </button>
            </div>

          </form>

        </div>
      </main>
    </div>
  );
};
export default FarmerProfile;
