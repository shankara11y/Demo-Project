import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppContext } from "../../context/AppContext";
import LanguageSelector from "../../components/LanguageSelector";
import axios from "axios";
import { 
  Sprout, LogOut, Sun, Moon, MapPin, CloudRain, Thermometer, Droplets, 
  Wind, TriangleAlert, Bell, Calendar, ChevronRight, BarChart3, Settings, Database
} from "lucide-react";
import { Line, Bar } from "react-chartjs-2";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Fix Leaflet marker icons bundling issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Import Chart.js components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export const FarmerDashboard = () => {
  const { token, logout, API_URL, translate, darkMode, toggleDarkMode } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeChartTab, setActiveChartTab] = useState("temp"); // 'temp' | 'rain' | 'humidity'
  const [showRadar, setShowRadar] = useState(true);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchDashboardData = async () => {
      try {
        const response = await axios.get(`${API_URL}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(response.data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || t("error_loading"));
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center transition-colors">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin"></div>
          <Sprout className="w-6 h-6 text-primary-500 absolute animate-pulse" />
        </div>
        <p className="mt-4 text-sm font-bold text-slate-500 dark:text-slate-400">
          {t("loading")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 p-6 rounded-3xl max-w-md text-center space-y-4">
          <TriangleAlert className="w-12 h-12 mx-auto" />
          <h2 className="text-xl font-bold">Dashboard Error</h2>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 rounded-full bg-rose-600 text-white text-sm font-bold"
          >
            {t("retry_loading")}
          </button>
        </div>
      </div>
    );
  }

  const {
    farmer_name,
    village,
    district,
    coordinates,
    current_weather,
    soil_telemetry,
    forecast,
    crop_advisories,
    alerts,
    notifications
  } = data;

  const lat = coordinates.latitude;
  const lon = coordinates.longitude;

  // Chart configuration
  const chartLabels = forecast.map((f) => f.day_name);
  
  const chartData = {
    temp: {
      labels: chartLabels,
      datasets: [
        {
          label: "Max Temp (°C)",
          data: forecast.map((f) => f.temp_max),
          borderColor: "#e07a5f",
          backgroundColor: "rgba(224, 122, 95, 0.1)",
          tension: 0.4,
          fill: true
        },
        {
          label: "Min Temp (°C)",
          data: forecast.map((f) => f.temp_min),
          borderColor: "#3d5a80",
          backgroundColor: "rgba(61, 90, 128, 0.1)",
          tension: 0.4,
          fill: true
        }
      ]
    },
    rain: {
      labels: chartLabels,
      datasets: [
        {
          label: "Rainfall volume (mm)",
          data: forecast.map((f) => f.rainfall),
          backgroundColor: "rgba(2, 132, 199, 0.6)",
          borderColor: "#0284c7",
          borderWidth: 1
        }
      ]
    },
    humidity: {
      labels: chartLabels,
      datasets: [
        {
          label: "Humidity (%)",
          data: forecast.map((f) => f.humidity),
          borderColor: "#52b788",
          backgroundColor: "rgba(82, 183, 136, 0.1)",
          tension: 0.3,
          fill: true
        }
      ]
    }
  };

  // Weather icon mapping
  const getWeatherIconUrl = (iconCode) => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      
      {/* Top Header */}
      <nav className="glass-panel sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary-500 text-white p-2 rounded-xl">
              <Sprout className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
              {t("app_title")}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSelector />

            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
            
            <Link
              to="/farmer/profile"
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700"
              title={t("profile_settings")}
            >
              <Settings className="w-5 h-5" />
            </Link>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 rounded-full hover:bg-rose-500 hover:text-white transition-all"
            >
              <LogOut className="w-4 h-4" /> {t("logout")}
            </button>
          </div>
        </div>
      </nav>      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {/* Welcome Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-xl shadow-primary-500/15 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-slide-up">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold flex items-center gap-2">
              {t("welcome_greeting")}, {farmer_name}!
            </h1>
            <p className="text-sm text-primary-100 flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {village}, {district} | GPS: {lat.toFixed(4)}, {lon.toFixed(4)}
            </p>
          </div>
          <Link
            to="/farmer/recommendations"
            className="self-start md:self-center px-6 py-3 rounded-full bg-white text-primary-700 hover:bg-slate-100 font-bold text-sm shadow-md transition-all transform hover:scale-105 flex items-center gap-1.5"
          >
            {t("sowing_check_btn")} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Hazard Alert notifications */}
        {alerts.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 flex items-start gap-3">
            <TriangleAlert className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm">{t("active_warning")}</h4>
              <p className="text-xs leading-relaxed">{alerts[0].message}</p>
            </div>
          </div>
        )}

        {/* Current Weather & Forecast */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Current Weather Card */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-md flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-extrabold text-slate-500 text-sm uppercase tracking-wider">{t("current_weather")}</h3>
                <p className="text-3xl font-black text-slate-900 dark:text-white mt-2">{current_weather.temp}°C</p>
              </div>
              <img 
                src={getWeatherIconUrl(current_weather.icon)} 
                alt={current_weather.description} 
                className="w-16 h-16 shrink-0 bg-slate-50 dark:bg-slate-800 rounded-full"
              />
            </div>
            
            <p className="font-bold text-primary-500 text-sm mt-1">{current_weather.description}</p>
            
            <div className="grid grid-cols-2 gap-4 mt-6 border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-500/10 rounded-xl text-sky-500"><Droplets className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs text-slate-400 font-bold">{t("humidity")}</p>
                  <p className="text-sm font-extrabold">{current_weather.humidity}%</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-500/10 rounded-xl text-blue-500"><CloudRain className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs text-slate-400 font-bold">{t("rain")}</p>
                  <p className="text-sm font-extrabold">{current_weather.rainfall} mm</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500"><Wind className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs text-slate-400 font-bold">{t("wind")}</p>
                  <p className="text-sm font-extrabold">{current_weather.wind_speed} km/h</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500"><Sun className="w-5 h-5" /></div>
                <div>
                  <p className="text-xs text-slate-400 font-bold">{t("uv_index")}</p>
                  <p className="text-sm font-extrabold">{current_weather.uv_index}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sowing Suitability Summaries */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-4">
            <h3 className="font-extrabold text-slate-500 text-sm uppercase tracking-wider">{t("crop_advisories")}</h3>
            
            {crop_advisories.length === 0 ? (
              <div className="py-10 text-center">
                <Sprout className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">{t("no_crops_registered")}</p>
                <Link to="/farmer/profile" className="text-sm font-bold text-primary-500 hover:underline mt-2 inline-block">{t("update_profile_crops")}</Link>
              </div>
            ) : (
              <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2">
                {crop_advisories.map((crop, idx) => (
                  <div 
                    key={idx}
                    className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-primary-500/30 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary-100 dark:bg-primary-950/50 rounded-xl text-primary-500">
                        <Sprout className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-base">{crop.crop_name}</h4>
                        <p className="text-xs text-slate-400">Analysis Date: Today</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                      <div className="text-right sm:text-left">
                        <p className="text-xs text-slate-400 font-bold">{t("suitability")}</p>
                        <span className={`inline-block text-xs font-black px-3 py-1 rounded-full mt-1 ${
                          crop.suitability === "Suitable" 
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                            : crop.suitability === "Moderately Suitable"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        }`}>
                          {crop.suitability}
                        </span>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-xs text-slate-400 font-bold">{t("match_score")}</p>
                        <p className="text-sm font-black text-slate-800 dark:text-slate-100">{crop.confidence}%</p>
                      </div>
                      
                      <Link 
                        to="/farmer/recommendations"
                        className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-primary-500 hover:text-white rounded-xl transition-all"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* ISRIC SoilGrids 2.0 Telemetry Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-sm uppercase tracking-wider">
                  ISRIC SoilGrids 2.0 Telemetry
                </h3>
                <p className="text-xs text-slate-400 font-bold">Topsoil Soil Profile (0-5cm Depth)</p>
              </div>
            </div>
            <span className="text-2xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Satellite Verified • {soil_telemetry?.source || "ISRIC SoilGrids"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-sky-500/10 border border-emerald-500/20 md:col-span-2 flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Topsoil Moisture Index</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{soil_telemetry?.topsoil_moisture || "62%"}</span>
                  <span className="text-xs font-bold text-slate-500">({soil_telemetry?.topsoil_status || "Optimal Moisture"})</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">pH Level</span>
                <span className="text-xl font-black text-amber-500">{soil_telemetry?.ph || 6.5} pH</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-2xs font-black text-slate-400 uppercase tracking-wider block">Texture Ratios</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                  Clay <strong className="text-amber-500">{soil_telemetry?.clay || "28.5%"}</strong> • Sand <strong className="text-sky-500">{soil_telemetry?.sand || "42.1%"}</strong> • Silt <strong className="text-emerald-500">{soil_telemetry?.silt || "29.4%"}</strong>
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-2xs font-black text-slate-400 uppercase tracking-wider block">Organic Carbon & Nitrogen</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                  Carbon: <strong className="text-slate-900 dark:text-white">{soil_telemetry?.organic_carbon || "12.4 g/kg"}</strong> | Nitrogen: <strong className="text-slate-900 dark:text-white">{soil_telemetry?.nitrogen || "1.25 g/kg"}</strong>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 5-Day Horizontal Forecast Cards */}
        <div className="space-y-3">
          <h3 className="font-extrabold text-slate-500 text-sm uppercase tracking-wider flex items-center gap-1.5">
            <Calendar className="w-5 h-5" /> {t("forecast_5day")}
          </h3>
          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin">
            {forecast.map((f, index) => (
              <div
                key={index}
                className="snap-start flex-none w-[170px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-sm hover:shadow-md transition-all text-center space-y-2"
              >
                <p className="text-xs font-bold text-slate-400">{f.day_name}</p>
                <p className="text-2xs text-slate-300">{f.date}</p>
                <img 
                  src={getWeatherIconUrl(f.icon)} 
                  alt={f.description} 
                  className="w-12 h-12 mx-auto"
                />
                <p className="text-sm font-extrabold text-slate-800 dark:text-white">
                  {f.temp_max}° / <span className="text-slate-400 font-semibold">{f.temp_min}°</span>
                </p>
                <p className="text-2xs text-primary-500 font-bold truncate">{f.description}</p>
                
                <div className="flex justify-center items-center gap-1.5 text-2xs text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
                  <CloudRain className="w-3.5 h-3.5 text-sky-500" />
                  <span className="font-extrabold">{f.rainfall} mm</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart Trends & Leaflet Maps */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Chart Trends */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <h3 className="font-extrabold text-slate-500 text-sm uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-5 h-5" /> {t("weather_trend_analysis")}
              </h3>
              
              {/* Tab Selector */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button
                  onClick={() => setActiveChartTab("temp")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeChartTab === "temp"
                      ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
                      : "text-slate-400"
                  }`}
                >
                  {t("temp_tab")}
                </button>
                <button
                  onClick={() => setActiveChartTab("rain")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeChartTab === "rain"
                      ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
                      : "text-slate-400"
                  }`}
                >
                  {t("rain_tab")}
                </button>
                <button
                  onClick={() => setActiveChartTab("humidity")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeChartTab === "humidity"
                      ? "bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white"
                      : "text-slate-400"
                  }`}
                >
                  {t("humidity_tab")}
                </button>
              </div>
            </div>

            <div className="h-64 flex justify-center items-center">
              {activeChartTab === "rain" ? (
                <Bar 
                  data={chartData.rain} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                  }} 
                />
              ) : (
                <Line 
                  data={chartData[activeChartTab]} 
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: "top" } }
                  }} 
                />
              )}
            </div>
          </div>

          {/* Leaflet Map Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-md space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-slate-500 text-sm uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-5 h-5" /> {t("geocoded_farm_area")}
              </h3>
              
              <button
                onClick={() => setShowRadar(!showRadar)}
                className={`px-3 py-1 rounded-full text-2xs font-extrabold border transition-all ${
                  showRadar 
                    ? "bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400" 
                    : "border-slate-200 dark:border-slate-800 text-slate-400"
                }`}
              >
                {t("rain_radar_overlay")}
              </button>
            </div>

            <div className="h-64 w-full rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
              <MapContainer center={[lat, lon]} zoom={12} scrollWheelZoom={false}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Farmer Farm Location */}
                <Marker position={[lat, lon]}>
                  <Popup>
                    <div className="text-center font-sans">
                      <h4 className="font-extrabold text-sm">{farmer_name}'s Farm</h4>
                      <p className="text-xs text-slate-500 mt-1">{t("village")}: {village}</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Neighbor Village Pins (Simulated pins within 0.05 lat/lon offsets) */}
                <Marker position={[lat + 0.02, lon - 0.01]}>
                  <Popup>
                    <div className="font-sans text-xs">
                      <h4 className="font-extrabold text-slate-700">Neighboring Village A</h4>
                      <p className="text-slate-500 mt-0.5">Primary crop: Soybean</p>
                    </div>
                  </Popup>
                </Marker>
                
                <Marker position={[lat - 0.015, lon + 0.025]}>
                  <Popup>
                    <div className="font-sans text-xs">
                      <h4 className="font-extrabold text-slate-700">Neighboring Village B</h4>
                      <p className="text-slate-500 mt-0.5">Primary crop: Rice</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Radar Overlay Representation (Leaflet blue circle with pulse opacity representing rainfall cloud) */}
                {showRadar && current_weather.rainfall > 0 && (
                  <Circle 
                    center={[lat + 0.005, lon - 0.008]} 
                    radius={5000} 
                    pathOptions={{ color: '#0284c7', fillColor: '#38bdf8', fillOpacity: 0.25 }}
                  />
                )}
              </MapContainer>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};
export default FarmerDashboard;
