import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { Sprout, ArrowLeft, User, Phone, MapPin, Compass, CheckCircle2, Languages, Search } from "lucide-react";

const CROPS_OPTIONS = [
  "Rice", "Wheat", "Soybean", "Cotton", "Maize", "Millets", "Groundnut",
  "Bajra (Pearl Millet)", "Jowar (Sorghum)", "Ragi (Finger Millet)", "Barley",
  "Tur / Arhar (Pigeon Pea)", "Chana (Chickpea)", "Moong (Green Gram)", "Urad (Black Gram)", "Masoor (Lentil)",
  "Mustard (Sarson)", "Sunflower", "Sesame (Til)", "Sugarcane", "Jute",
  "Onion", "Tomato", "Potato", "Chilli", "Turmeric (Haldi)", "Banana"
];

export const FarmerProfile = () => {
  const { token, API_URL, translate, changeLanguage } = useContext(AppContext);
  const { t } = useTranslation();
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
  const [cropSearchQuery, setCropSearchQuery] = useState("");

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
        setError(t("fetch_profile_failed"));
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
      setError(t("geo_not_supported"));
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
        setError(t("gps_denied"));
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
      setError(t("select_one_crop_err"));
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
      changeLanguage(preferredLanguage);
      setSuccess(t("profile_updated_success"));
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || t("update_profile_failed"));
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center">
        <div className="w-10 h-10 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-bold text-slate-400">{t("loading_settings")}</p>
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
            <ArrowLeft className="w-4 h-4" /> {t("dashboard")}
          </Link>
          <h2 className="font-extrabold text-base bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
            {t("profile_settings_title")}
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
                <label className="block text-xs font-bold text-slate-400 mb-1">{t("full_name")}</label>
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
                <label className="block text-xs font-bold text-slate-400 mb-1">{t("registered_mobile")}</label>
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
                <label className="block text-xs font-bold text-slate-400 mb-1">{t("farm_size")}</label>
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
                <label className="block text-xs font-bold text-slate-400 mb-1">{t("preferred_language")}</label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Languages className="w-4 h-4" />
                  </div>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value)}
                    className="block w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-850 dark:text-white cursor-pointer"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी</option>
                    <option value="mr">मराठी</option>
                  </select>
                </div>
              </div>

            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Geographic Address */}
            <div className="space-y-4">
              <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">{t("geographic_address")}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-2xs font-bold text-slate-400 mb-1">{t("village")}</label>
                  <input
                    type="text"
                    required
                    value={village}
                    onChange={(e) => setVillage(e.target.value)}
                    className="block w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-850 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-400 mb-1">{t("district")}</label>
                  <input
                    type="text"
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="block w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-850 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-400 mb-1">{t("state")}</label>
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
                  {t("gps_coordinates")}
                </label>
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={detecting}
                  className="text-xs font-extrabold text-primary-500 hover:text-primary-600 flex items-center gap-1 focus:outline-none"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  {detecting ? t("locating") : t("autofill_gps")}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder={t("latitude_placeholder")}
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="block w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-850 dark:text-white"
                />
                <input
                  type="text"
                  placeholder={t("longitude_placeholder")}
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="block w-full px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-slate-850 dark:text-white"
                />
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* Preferred Crops Selection with Search & Fixed Scrollable Container */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  {t("preferred_crops")}
                  <span className="px-2.5 py-0.5 rounded-full text-2xs bg-primary-500/10 text-primary-600 dark:text-primary-400 font-extrabold">
                    {selectedCrops.length} Selected
                  </span>
                </label>
                {selectedCrops.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedCrops([])}
                    className="text-2xs font-extrabold text-rose-500 hover:underline self-end sm:self-auto"
                  >
                    Clear Selection
                  </button>
                )}
              </div>

              {/* Search input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Search 27+ Indian crops (e.g. Bajra, Turmeric, Tomato)..."
                  value={cropSearchQuery}
                  onChange={(e) => setCropSearchQuery(e.target.value)}
                  className="block w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-800 dark:text-white"
                />
              </div>

              {/* Vertically scrollable crop list container with fixed max height */}
              <div className="max-h-56 overflow-y-auto p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2 scrollbar-thin">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {CROPS_OPTIONS.filter((c) =>
                    c.toLowerCase().includes(cropSearchQuery.toLowerCase())
                  ).map((crop) => {
                    const isSelected = selectedCrops.includes(crop);
                    return (
                      <button
                        key={crop}
                        type="button"
                        onClick={() => handleCropCheckbox(crop)}
                        className={`px-3 py-2 rounded-xl border text-xs font-bold transition-all text-left flex items-center justify-between ${
                          isSelected
                            ? "border-primary-500 bg-primary-500/15 text-primary-700 dark:text-primary-300 shadow-sm"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:border-slate-300"
                        }`}
                      >
                        <span className="truncate">{crop}</span>
                        <span className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center shrink-0 ml-1.5 ${
                          isSelected
                            ? "bg-primary-500 border-primary-500 text-white"
                            : "border-slate-300 dark:border-slate-600"
                        }`}>
                          {isSelected && <span className="text-[9px]">✓</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {CROPS_OPTIONS.filter((c) =>
                  c.toLowerCase().includes(cropSearchQuery.toLowerCase())
                ).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">
                    No matching crops found for "{cropSearchQuery}"
                  </p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={updating}
                className="w-full flex justify-center py-3.5 px-4 rounded-2xl border border-transparent shadow-lg text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-primary-500/25 transition-all disabled:opacity-50"
              >
                {updating ? t("saving_changes") : t("save_profile")}
              </button>
            </div>

          </form>

        </div>
      </main>
    </div>
  );
};
export default FarmerProfile;
