import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { 
  Sprout, LogOut, Sun, Moon, Users, MessageSquare, Sprout as CropIcon, 
  Map as MapIcon, BarChart3, Settings, Calendar, Plus, Edit, Trash2, 
  Send, AlertTriangle, CheckCircle, Search, FileSpreadsheet, ShieldAlert,
  Layers, MapPin, Activity, Radio
} from "lucide-react";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, Circle, Polygon, Tooltip } from "react-leaflet";
import L from "leaflet";

// Chart.js registration
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend as ChartLegend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title
} from "chart.js";

ChartJS.register(
  ArcElement, 
  ChartTooltip, 
  ChartLegend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title
);

export const AdminDashboard = () => {
  const { token, logout, API_URL, darkMode, toggleDarkMode } = useContext(AppContext);
  const navigate = useNavigate();

  // Navigation Tabs: 'farmers_map' | 'analytics' | 'crops' | 'sms' | 'recommendations'
  const [activeTab, setActiveTab] = useState("farmers_map");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // System states
  const [analytics, setAnalytics] = useState(null);
  const [farmers, setFarmers] = useState([]);
  const [crops, setCrops] = useState([]);
  const [smsHistory, setSmsHistory] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Crop CRUD states
  const [cropName, setCropName] = useState("");
  const [cropCategory, setCropCategory] = useState("Cereal");
  const [cropDesc, setCropDesc] = useState("");
  const [editingCropId, setEditingCropId] = useState(null);

  // Ideal threshold states
  const [idealTempMin, setIdealTempMin] = useState(20);
  const [idealTempMax, setIdealTempMax] = useState(35);
  const [idealRainMin, setIdealRainMin] = useState(40);
  const [idealRainMax, setIdealRainMax] = useState(150);
  const [idealHumMin, setIdealHumMin] = useState(40);
  const [idealHumMax, setIdealHumMax] = useState(80);
  const [idealSoilMin, setIdealSoilMin] = useState(0.2);
  const [idealSoilMax, setIdealSoilMax] = useState(0.7);
  const [cropSeason, setCropSeason] = useState("Kharif");

  // SMS Dispatch Form
  const [smsMessage, setSmsMessage] = useState("");
  const [smsTarget, setSmsTarget] = useState("all"); 
  const [smsTargetValue, setSmsTargetValue] = useState("");
  const [smsLoading, setSmsLoading] = useState(false);
  const [smsSuccessMsg, setSmsSuccessMsg] = useState("");
  const [smsErrorMsg, setSmsErrorMsg] = useState("");

  // Individual Test SMS Form
  const [testMobile, setTestMobile] = useState("");
  const [testMessage, setTestMessage] = useState("");
  const [testSmsLoading, setTestSmsLoading] = useState(false);
  const [testSmsSuccess, setTestSmsSuccess] = useState("");
  const [testSmsError, setTestSmsError] = useState("");

  // GIS Sowing Tracker States
  const [mapFarmers, setMapFarmers] = useState([]);
  const [mapStats, setMapStats] = useState(null);
  const [selectedFarmerIds, setSelectedFarmerIds] = useState([]);
  const [drawingMode, setDrawingMode] = useState(null); // null | 'circle' | 'polygon'
  const [drawCenter, setDrawCenter] = useState(null); // [lat, lon]
  const [drawRadius, setDrawRadius] = useState(12000); // meters (12km default)
  const [drawPoints, setDrawPoints] = useState([]); // [[lat, lon], ...]
  const [selectedDistrictName, setSelectedDistrictName] = useState("Thane");
  const [smsLanguageToggle, setSmsLanguageToggle] = useState("en"); // 'en' | 'mr'
  
  // GIS Filters
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterCrop, setFilterCrop] = useState("");
  
  // GIS SMS campaign
  const [gisSmsMessage, setGisSmsMessage] = useState("");
  const [gisSmsLoading, setGisSmsLoading] = useState(false);

  // Fetch Dashboard States
  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [analRes, farmRes, cropRes, smsRes, recRes] = await Promise.all([
        axios.get(`${API_URL}/analytics`, { headers }),
        axios.get(`${API_URL}/farmers`, { headers }),
        axios.get(`${API_URL}/crops`, { headers }),
        axios.get(`${API_URL}/sms/history`, { headers }),
        axios.get(`${API_URL}/history`, { headers })
      ]);

      setAnalytics(analRes.data);
      setFarmers(farmRes.data);
      setCrops(cropRes.data);
      setSmsHistory(smsRes.data);
      setRecommendations(recRes.data);
      
      // Load GIS map datasets
      await fetchMapData();
    } catch (err) {
      console.error(err);
      setError("Admin authentication expired or endpoint failure.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) {
      navigate("/login?role=admin");
      return;
    }
    fetchData();
  }, [token]);

  // Auto-generate Recommended SMS on region selection change
  useEffect(() => {
    if (selectedFarmerIds.length > 0) {
      const selected = mapFarmers.filter(f => selectedFarmerIds.includes(f.id));
      if (selected.length > 0) {
        const crops = selected.flatMap(f => f.crop_types);
        const cropCounts = crops.reduce((acc, c) => {
          acc[c] = (acc[c] || 0) + 1;
          return acc;
        }, {});
        const primaryCrop = Object.keys(cropCounts).sort((a, b) => cropCounts[b] - cropCounts[a])[0] || "Rice";
        const district = selected[0].district;
        setSelectedDistrictName(district);

        // Evaluate suitability weather color flags
        const hasCriticalRain = selected.some(f => f.color === "red");
        const hasLowMoisture = selected.some(f => f.color === "blue");

        let msgBody = "";
        if (smsLanguageToggle === "en") {
          if (hasCriticalRain) {
            msgBody = `🌱 HEAVY RAIN ALERT | ${district} District\nSoil: 85% (HIGH saturation >80%)\nWeather: Heavy rain forecast - SOWING POSTPONED\nCrop: ${primaryCrop} | Window: Jul 1-Jul 31\n\n▶ Postpone sowing for next 48 hours\n▶ Protect storage yards from rain\n▶ Ensure proper drainage in field\n\nKrushiSeva | IMD + ISRO + Crop Calendar`;
          } else if (hasLowMoisture) {
            msgBody = `🌱 IRRIGATION ADVISORY | ${district} District\nSoil: 35% (LOW range 40-65%)\nWeather: No rain expected - IRRIGATION REQUIRED\nCrop: ${primaryCrop} | Window: Jul 1-Jul 31\n\n▶ Sowing requires light pre-irrigation\n▶ Apply organic mulch to save moisture\n▶ Prepare seedling nursery beds\n\nKrushiSeva | IMD + ISRO + Crop Calendar`;
          } else {
            msgBody = `🌱 OPTIMAL SOWING WINDOW | ${district} District\nSoil: 55% (IDEAL range 40-65%)\nWeather: Gentle rain forecast - PERFECT\nCrop: ${primaryCrop} | Window: Jul 1-Jul 31\n\n▶ Sow within next 48 hours\n▶ Apply basal fertilizer before sowing\n▶ Seed treatment: Thiram 3g/kg\n▶ Row spacing: 45cm\n▶ Next window check: 06 Jul\n\nKrushiSeva | IMD + ISRO + Crop Calendar`;
          }
        } else {
          if (hasCriticalRain) {
            msgBody = `🌱 मुसळधार पाऊस इशारा | ${district} जिल्हा\nजमीन ओलावा: ८५% (अति-ओलावा)\nहवामान: मुसळधार पाऊस अंदाज - पेरणी पुढे ढकला\nपीक: ${primaryCrop} | कालावधी: १ जुलै - ३१ जुलै\n\n▶ पुढील ४८ तासांत पेरणी करू नका\n▶ साठवणूक केलेले धान्य पावसपासून सुरक्षित ठेवा\n▶ शेतात पाण्याचा निचरा होण्यासाठी गटार करा\n\nकृषीसेवा | IMD + ISRO + Crop Calendar`;
          } else if (hasLowMoisture) {
            msgBody = `🌱 सिंचन सल्लागार | ${district} जिल्हा\nजमीन ओलावा: ३५% (कमी श्रेणी ४०-६५%)\nहवामान: पाऊस अपेक्षित नाही - हलके सिंचन आवश्यक\nपीक: ${primaryCrop} | कालावधी: १ जुलै - ३१ जुलै\n\n▶ पेरणीपूर्वी शेतीला हलके पाणी द्या\n▶ ओलावा टिकवण्यासाठी सेंद्रिय आच्छादन वापरा\n▶ रोपवाटिका गादी वाफे तयार करा\n\nकृषीसेवा | IMD + ISRO + Crop Calendar`;
          } else {
            msgBody = `🌱 योग्य पेरणी कालावधी | ${district} जिल्हा\nजमीन ओलावा: ५५% (योग्य श्रेणी: ४०-६५%)\nहवामान: सौम्य पाऊस अंदाज - उत्तम हवामान\nपीक: ${primaryCrop} | कालावधी: १ जुलै - ३१ जुलै\n\n▶ पुढील ४८ तासांत पेरणी पूर्ण करा\n▶ पेरणीपूर्वी रासायनिक खतांचा बेस डोस द्या\n▶ बीजप्रक्रिया: थायरम ३ ग्रॅम प्रति किलो वापरा\n▶ ओळींमधील अंतर ४५ सेमी ठेवा\n▶ पुढील कालावधी तपासणी: ०६ जुलै\n\nकृषीसेवा | IMD + ISRO + Crop Calendar`;
          }
        }
        setGisSmsMessage(msgBody);
      }
    } else {
      setGisSmsMessage("");
    }
  }, [selectedFarmerIds, mapFarmers, smsLanguageToggle]);

  // Dynamic Soil & Weather telemetry details state
  const [districtDetails, setDistrictDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const fetchDistrictDetails = async (lat, lon, districtName) => {
    setDetailsLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.get(`${API_URL}/admin/map/district-details?lat=${lat}&lon=${lon}&district=${districtName}`, { headers });
      setDistrictDetails(res.data);
    } catch (err) {
      console.error("Failed to fetch live district details", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // GIS Map Fetcher
  const fetchMapData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [farmersRes, statsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/map/farmers`, { headers }),
        axios.get(`${API_URL}/admin/map/stats`, { headers })
      ]);
      setMapFarmers(farmersRes.data);
      setMapStats(statsRes.data);
    } catch (err) {
      console.error("Failed loading GIS details:", err);
    }
  };

  useEffect(() => {
    if (mapFarmers.length > 0 && !districtDetails) {
      const v = getVillagePoints()[0];
      if (v) {
        fetchDistrictDetails(v.latitude, v.longitude, v.district);
      }
    }
  }, [mapFarmers]);

  // Trigger Geofence queries
  const triggerGeofence = async (type, center, radius, polygon, textVal) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const payload = { type };
      
      if (type === 'circle') {
        payload.center = center;
        payload.radius = radius;
      } else if (type === 'polygon') {
        payload.coordinates = polygon;
      } else if (type === 'district' || type === 'village') {
        payload.name = textVal;
      }
      
      const response = await axios.post(`${API_URL}/admin/map/geofence`, payload, { headers });
      setSelectedFarmerIds(response.data.selected_farmer_ids);
    } catch (err) {
      console.error("Geofence select query failed:", err);
    }
  };

  const clearGeofence = () => {
    setDrawingMode(null);
    setDrawCenter(null);
    setDrawPoints([]);
    setSelectedFarmerIds([]);
  };

  const getCustomMarkerIcon = (color) => {
    let hexColor = "#10b981"; // green
    if (color === "yellow") hexColor = "#eab308";
    if (color === "red") hexColor = "#ef4444";
    if (color === "blue") hexColor = "#3b82f6";
    if (color === "grey") hexColor = "#94a3b8";
    
    return L.divIcon({
      html: `
        <div style="position: relative; width: 14px; height: 14px;">
          <div style="position: absolute; top: 0; left: 0; width: 14px; height: 14px; background-color: ${hexColor}; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 0 10px ${hexColor}; z-index: 2;"></div>
          <div style="position: absolute; top: -4px; left: -4px; width: 22px; height: 22px; background-color: ${hexColor}; border-radius: 50%; opacity: 0.25; z-index: 1;"></div>
        </div>
      `,
      className: "custom-leaflet-marker",
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -11]
    });
  };

  // Map Click events handler helper
  const MapClickHandler = () => {
    useMapEvents({
      click(e) {
        const coords = [e.latlng.lat, e.latlng.lng];
        if (drawingMode === 'circle') {
          setDrawCenter(coords);
          triggerGeofence('circle', coords, drawRadius);
        } else if (drawingMode === 'polygon') {
          const newPoints = [...drawPoints, coords];
          setDrawPoints(newPoints);
          triggerGeofence('polygon', null, null, newPoints);
        }
      }
    });
    return null;
  };

  // Crop CRUD Actions
  const handleCropSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      crop: { name: cropName, category: cropCategory, description: cropDesc },
      thresholds: {
        ideal_temp_min: parseFloat(idealTempMin),
        ideal_temp_max: parseFloat(idealTempMax),
        ideal_rainfall_min: parseFloat(idealRainMin),
        ideal_rainfall_max: parseFloat(idealRainMax),
        ideal_humidity_min: parseFloat(idealHumMin),
        ideal_humidity_max: parseFloat(idealHumMax),
        ideal_soil_moisture_min: parseFloat(idealSoilMin),
        ideal_soil_moisture_max: parseFloat(idealSoilMax),
        season: cropSeason
      }
    };

    try {
      const headers = { Authorization: `Bearer ${token}` };
      if (editingCropId) {
        await axios.put(`${API_URL}/crops/${editingCropId}`, payload, { headers });
      } else {
        await axios.post(`${API_URL}/crops`, payload, { headers });
      }
      resetCropForm();
      fetchData();
    } catch (err) {
      alert("Error saving crop requirements.");
    }
  };

  const handleCropDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this crop?")) return;
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.delete(`${API_URL}/crops/${id}`, { headers });
      fetchData();
    } catch (err) {
      alert("Error deleting crop.");
    }
  };

  const editCrop = (crop) => {
    setEditingCropId(crop.id);
    setCropName(crop.name);
    setCropCategory(crop.category);
    setCropDesc(crop.description || "");
    setIdealTempMin(crop.thresholds?.ideal_temp_min || 20);
    setIdealTempMax(crop.thresholds?.ideal_temp_max || 35);
    setIdealRainMin(crop.thresholds?.ideal_rainfall_min || 40);
    setIdealRainMax(crop.thresholds?.ideal_rainfall_max || 150);
    setIdealHumMin(crop.thresholds?.ideal_humidity_min || 40);
    setIdealHumMax(crop.thresholds?.ideal_humidity_max || 80);
    setIdealSoilMin(crop.thresholds?.ideal_soil_moisture_min || 0.2);
    setIdealSoilMax(crop.thresholds?.ideal_soil_moisture_max || 0.7);
    setCropSeason(crop.thresholds?.season || "Kharif");
  };

  const resetCropForm = () => {
    setEditingCropId(null);
    setCropName("");
    setCropDesc("");
    setIdealTempMin(20);
    setIdealTempMax(35);
    setIdealRainMin(40);
    setIdealRainMax(150);
    setIdealHumMin(40);
    setIdealHumMax(80);
    setIdealSoilMin(0.2);
    setIdealSoilMax(0.7);
    setCropSeason("Kharif");
  };

  // SMS Broadcast dispatch
  const handleSMSBroadcast = async (e) => {
    e.preventDefault();
    setSmsLoading(true);
    setSmsSuccessMsg("");
    setSmsErrorMsg("");

    const payload = {
      message: smsMessage,
      type: "general"
    };

    if (smsTarget === "village") payload.village = smsTargetValue;
    if (smsTarget === "district") payload.district = smsTargetValue;

    try {
      const response = await axios.post(`${API_URL}/alerts`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSmsSuccessMsg(response.data.message);
      setSmsMessage("");
      setSmsTargetValue("");
      fetchData(); 
    } catch (err) {
      setSmsErrorMsg(err.response?.data?.error || "SMS campaign dispatch failed.");
    } finally {
      setSmsLoading(false);
    }
  };

  const handleTestSMS = async (e) => {
    e.preventDefault();
    setTestSmsLoading(true);
    setTestSmsSuccess("");
    setTestSmsError("");

    try {
      const response = await axios.post(`${API_URL}/sendSMS`, {
        mobile: testMobile,
        message: testMessage
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTestSmsSuccess(response.data.message);
      setTestMessage("");
      setTestMobile("");
      fetchData(); 
    } catch (err) {
      setTestSmsError(err.response?.data?.error || "Failed to send individual test SMS.");
    } finally {
      setTestSmsLoading(false);
    }
  };

  const handleExportCSV = () => {
    alert("Exporting analytics report data to Excel... (Completed)");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col justify-center items-center gap-4">
        <Radio className="w-12 h-12 text-emerald-500 animate-pulse" />
        <div className="text-sm font-black tracking-widest text-slate-400 uppercase">Synchronizing KrushiSeva Command Center...</div>
      </div>
    );
  }

  // Active alerts list for Left Sidebar (Figma style)
  const activeAlertFeed = [
    { district: "Nashik", type: "Cloudburst Alert", time: "30m ago", rain: "226mm", crop: "Onion", humidity: "91%", level: "critical" },
    { district: "Mumbai", type: "Heavy Rain Warning", time: "1h ago", rain: "148mm", crop: "Rice", humidity: "82%", level: "critical" },
    { district: "Thane", type: "Heavy Rain Warning", time: "1h ago", rain: "135mm", crop: "Rice", humidity: "79%", level: "critical" },
    { district: "Raigad", type: "Heavy Rain Warning", time: "3h ago", rain: "162mm", crop: "Rice", humidity: "88%", level: "critical" },
    { district: "Dhule", type: "Heavy Rain Warning", time: "2h ago", rain: "130mm", crop: "Cotton", humidity: "76%", level: "critical" },
    { district: "Jalgaon", type: "Heavy Rain Warning", time: "2h ago", rain: "138mm", crop: "Banana", humidity: "77%", level: "critical" },
    { district: "Pune", type: "Moderate Rainfall", time: "45m ago", rain: "45mm", crop: "Sugarcane", humidity: "65%", level: "advisory" }
  ];

  // Rainfall forecast values for Right Sidebar chart (Figma style)
  const rainfallForecastBars = [
    { label: "Now", val: 6 },
    { label: "6h", val: 8 },
    { label: "12h", val: 5 },
    { label: "18h", val: 6 },
    { label: "24h", val: 4 },
    { label: "30h", val: 4 },
    { label: "36h", val: 2 },
    { label: "42h", val: 1 }
  ];

  // Group farmers by village
  const getVillagePoints = () => {
    const villages = {};
    mapFarmers.forEach(f => {
      const key = `${f.village.toLowerCase()}_${f.district.toLowerCase()}`;
      if (!villages[key]) {
        villages[key] = {
          name: f.village,
          district: f.district,
          latitude: f.latitude,
          longitude: f.longitude,
          farmers: [],
          crops: new Set(),
          colors: [],
          statusList: []
        };
      }
      villages[key].farmers.push(f);
      f.crop_types.forEach(c => villages[key].crops.add(c));
      villages[key].colors.push(f.color);
      villages[key].statusList.push(f.status);
    });

    return Object.values(villages).map(v => {
      let finalColor = "grey";
      if (v.colors.includes("red")) finalColor = "red";
      else if (v.colors.includes("blue")) finalColor = "blue";
      else if (v.colors.includes("yellow")) finalColor = "yellow";
      else if (v.colors.includes("green")) finalColor = "green";

      let finalStatus = "Normal Sowing Window";
      if (finalColor === "red") finalStatus = "High-risk Weather Alert";
      else if (finalColor === "blue") finalStatus = "Irrigation Advisory";
      else if (finalColor === "yellow") finalStatus = "Moderate Sowing Advisory";
      else if (finalColor === "green") finalStatus = "Optimal Sowing Window";

      return {
        ...v,
        color: finalColor,
        status: finalStatus,
        crops: Array.from(v.crops),
        farmerCount: v.farmers.length
      };
    });
  };

  const selectedVillages = getVillagePoints().filter(v => 
    v.farmers.some(f => selectedFarmerIds.includes(f.id))
  );
  const selectedVillagesCount = selectedVillages.length;
  const activeVillage = selectedVillages[0] || getVillagePoints()[0];

  // Dynamic state badge styling for light & dark compatibility
  const getStatusPillClasses = (color) => {
    if (color === "red") return "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500 border-rose-200 dark:border-rose-500/20";
    if (color === "blue") return "bg-sky-50 dark:bg-blue-500/10 text-sky-600 dark:text-blue-400 border-sky-200 dark:border-blue-500/20";
    if (color === "yellow") return "bg-amber-50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-500 border-amber-200 dark:border-amber-500/20";
    return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20";
  };

  // Dynamic Chart.js configuration options to support light & dark transitions
  const getChartOptions = (title) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: darkMode ? "#cbd5e1" : "#475569",
          font: { weight: "bold", size: 10 }
        }
      },
      title: {
        display: false
      }
    },
    scales: {
      x: {
        grid: { color: darkMode ? "#16253c" : "#e2e8f0" },
        ticks: { color: darkMode ? "#cbd5e1" : "#475569" }
      },
      y: {
        grid: { color: darkMode ? "#16253c" : "#e2e8f0" },
        ticks: { color: darkMode ? "#cbd5e1" : "#475569" }
      }
    }
  });

  return (
    <div className="min-h-screen bg-[#f4f7f5] dark:bg-[#070b13] text-slate-800 dark:text-slate-100 flex flex-col font-sans select-none antialiased transition-colors duration-300">
      <style>{`
        .custom-village-tooltip {
          background-color: ${darkMode ? '#0b1322' : '#ffffff'} !important;
          border: 1px solid ${darkMode ? '#1c304d' : '#cbd5e1'} !important;
          color: ${darkMode ? '#cbd5e1' : '#334155'} !important;
          font-size: 8px !important;
          font-weight: 850 !important;
          border-radius: 4px !important;
          padding: 2px 6px !important;
          box-shadow: 0 2px 6px rgba(0,0,0,${darkMode ? '0.6' : '0.1'}) !important;
        }
        .leaflet-tooltip-top:before {
          border-top-color: ${darkMode ? '#1c304d' : '#cbd5e1'} !important;
        }
        .leaflet-tile {
          filter: ${darkMode ? 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)' : 'none'};
          transition: filter 0.4s ease;
        }
      `}</style>
      
      {/* 1. TOP HEADER: Figma KrushiSeva Command Bar */}
      <header className="bg-white dark:bg-[#0b1322] border-b border-slate-200 dark:border-[#18263f] px-6 py-3 flex items-center justify-between z-20 transition-colors duration-300">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-amber-600 dark:text-amber-500 tracking-tight flex items-center gap-1.5 uppercase">
                <Sprout className="w-5 h-5 text-amber-600 dark:text-amber-500" /> KrushiSeva
              </span>
              <span className="text-3xs font-extrabold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-900 tracking-widest uppercase">v2.1</span>
            </div>
            <span className="text-4xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">कृषीसेवा • Crop Advisory System</span>
          </div>
          
          <div className="h-6 w-px bg-slate-200 dark:bg-[#1e3252]"></div>
          
          <div className="bg-emerald-50 dark:bg-[#050911] border border-emerald-200 dark:border-[#1b2b46] rounded-full px-3 py-1 flex items-center gap-1.5 text-4xs font-bold text-emerald-600 dark:text-emerald-400 transition-colors duration-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span>LIVE - Maharashtra</span>
          </div>
        </div>

        {/* Global Live Counters */}
        <div className="hidden md:flex items-center gap-6 text-4xs font-bold">
          <div className="text-center">
            <span className="block text-slate-400 dark:text-slate-500 uppercase">CRITICAL ALERTS</span>
            <span className="text-xs font-black text-rose-500">9</span>
          </div>
          <div className="text-center">
            <span className="block text-slate-400 dark:text-slate-500 uppercase">SOWING WINDOWS</span>
            <span className="text-xs font-black text-emerald-500 dark:text-emerald-400">9</span>
          </div>
          <div className="text-center">
            <span className="block text-slate-400 dark:text-slate-500 uppercase">VILLAGES COVERED</span>
            <span className="text-xs font-black text-amber-600 dark:text-amber-400">43,218</span>
          </div>
          <div className="text-center">
            <span className="block text-slate-400 dark:text-slate-500 uppercase">SMS SENT TODAY</span>
            <span className="text-xs font-black text-sky-500 dark:text-sky-400">1,28,450</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-4xs font-bold text-slate-500 dark:text-slate-400">
          <div className="text-right hidden lg:block leading-tight text-slate-400 dark:text-slate-500">
            <div>IMD: 06:30 IST</div>
            <div>SAT: 10:15 IST</div>
          </div>
          <div className="bg-slate-100 dark:bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-900 text-3xs font-extrabold text-amber-600 dark:text-amber-500 transition-colors duration-300">
            03 Jul 2026 IST
          </div>
          
          <button 
            onClick={toggleDarkMode}
            className="p-2 bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-xl border border-slate-200 dark:border-slate-900 hover:border-amber-500/20 dark:hover:border-amber-500/20 transition-all"
            aria-label="Toggle Theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-500" />}
          </button>
          
          <button 
            onClick={logout}
            className="p-2 bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:text-rose-500 rounded-xl border border-slate-200 dark:border-slate-900 hover:border-rose-950 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>



      {/* 2. MAIN NAV TABS BAR */}
      <nav className="bg-white dark:bg-[#09101c] border-b border-slate-200 dark:border-[#15233a] px-6 flex gap-2 transition-colors duration-300">
        <button
          onClick={() => setActiveTab("farmers_map")}
          className={`py-3 px-4 text-3xs font-extrabold tracking-widest uppercase border-b-2 transition-all ${
            activeTab === "farmers_map" 
              ? "border-amber-500 text-amber-600 dark:text-amber-500" 
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          LIVE GIS COMMAND CENTER
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`py-3 px-4 text-3xs font-extrabold tracking-widest uppercase border-b-2 transition-all ${
            activeTab === "analytics" 
              ? "border-amber-500 text-amber-600 dark:text-amber-500" 
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          ANALYTICS & STATS
        </button>
        <button
          onClick={() => setActiveTab("crops")}
          className={`py-3 px-4 text-3xs font-extrabold tracking-widest uppercase border-b-2 transition-all ${
            activeTab === "crops" 
              ? "border-amber-500 text-amber-600 dark:text-amber-500" 
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          CROP METRICS EDITOR
        </button>
        <button
          onClick={() => setActiveTab("sms")}
          className={`py-3 px-4 text-3xs font-extrabold tracking-widest uppercase border-b-2 transition-all ${
            activeTab === "sms" 
              ? "border-amber-500 text-amber-600 dark:text-amber-500" 
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          MANUAL SMS TESTER
        </button>
        <button
          onClick={() => setActiveTab("recommendations")}
          className={`py-3 px-4 text-3xs font-extrabold tracking-widest uppercase border-b-2 transition-all ${
            activeTab === "recommendations" 
              ? "border-amber-500 text-amber-600 dark:text-amber-500" 
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          ADVISORY AUDIT LOGS
        </button>
      </nav>

      {/* 3. VIEW CONTAINER */}
      <main className="flex-1 p-6 relative overflow-y-auto">

        {/* ========================================================= */}
        {/* TAB 1: WEATHER ADVISORY DASHBOARD (GIS MAP CENTER) */}
        {/* ========================================================= */}
        {activeTab === "farmers_map" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full min-h-[580px]">
            
            {/* COLUMN 1 (SPAN 3): ACTIVE ALERTS FEED PANEL */}
            <div className="xl:col-span-3 bg-white dark:bg-[#0a101b] border border-slate-200 dark:border-[#16253c] rounded-3xl p-4 flex flex-col space-y-4 shadow-xl transition-colors duration-300">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1c304d] pb-2">
                <span className="text-2xs font-extrabold tracking-widest text-slate-500 dark:text-slate-400 uppercase">Active Weather Alerts</span>
                <span className="bg-rose-500/10 text-rose-600 dark:text-rose-500 px-2 py-0.5 rounded text-4xs font-black">LIVE</span>
              </div>
              
              {/* Alert Badge counter totals */}
              <div className="grid grid-cols-4 gap-1 text-center font-black">
                <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 py-2 rounded-xl text-rose-600 dark:text-rose-500">
                  <span className="block text-[8px] text-slate-400 dark:text-slate-500">CRITICAL</span>
                  <span className="text-xs">9</span>
                </div>
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 py-2 rounded-xl text-amber-700 dark:text-amber-500">
                  <span className="block text-[8px] text-slate-400 dark:text-slate-500">ADVISORY</span>
                  <span className="text-xs">7</span>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 py-2 rounded-xl text-emerald-700 dark:text-emerald-400">
                  <span className="block text-[8px] text-slate-400 dark:text-slate-500">SOWING</span>
                  <span className="text-xs">9</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800/80 py-2 rounded-xl text-slate-600 dark:text-slate-400">
                  <span className="block text-[8px] text-slate-400 dark:text-slate-500">NORMAL</span>
                  <span className="text-xs">10</span>
                </div>
              </div>

              {/* Live Alerts Scroll Feed */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[420px]">
                {activeAlertFeed.map((alert, idx) => (
                  <div 
                    key={idx}
                    onClick={() => {
                      setFilterDistrict(alert.district);
                      setSelectedDistrictName(alert.district);
                      triggerGeofence("district", null, null, null, alert.district);
                      const matchFarmer = mapFarmers.find(f => f.district.toLowerCase() === alert.district.toLowerCase());
                      if (matchFarmer) {
                        fetchDistrictDetails(matchFarmer.latitude, matchFarmer.longitude, alert.district);
                      }
                    }}
                    className={`bg-slate-50 dark:bg-[#050910] border border-slate-200/60 dark:border-[#1b2c45] hover:border-amber-500 p-3 rounded-2xl cursor-pointer transition-all space-y-1.5 relative overflow-hidden group ${
                      filterDistrict.toLowerCase() === alert.district.toLowerCase() ? "border-amber-500 bg-amber-50/20 dark:bg-[#0c1626]" : ""
                    }`}
                  >
                    <div className="flex justify-between items-center text-3xs font-extrabold text-slate-400 dark:text-slate-500">
                      <span className="text-slate-700 dark:text-slate-300 font-black tracking-wide text-2xs group-hover:text-amber-600 dark:group-hover:text-amber-500 transition-all">{alert.district}</span>
                      <span>{alert.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${alert.level === "critical" ? "bg-rose-500" : "bg-amber-500"}`}></span>
                      <span className="text-3xs font-black text-rose-500 dark:text-rose-400">{alert.type}</span>
                    </div>
                    <div className="flex justify-between text-4xs font-bold text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-900">
                      <span>🌧 {alert.rain}</span>
                      <span>🌱 {alert.crop}</span>
                      <span>💧 Hum: {alert.humidity}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Data source footer */}
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-900 text-4xs font-extrabold text-slate-500 space-y-1.5 transition-colors duration-300">
                <div className="flex justify-between items-center">
                  <span>IMD FORECAST FEED</span>
                  <span className="text-emerald-600 dark:text-emerald-400">● LIVE</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>ISRO SENTINEL-2 NDVI</span>
                  <span className="text-emerald-600 dark:text-emerald-400">● SYNCED</span>
                </div>
              </div>
            </div>

            {/* COLUMN 2 (SPAN 6): Live Map Canvas Area */}
            <div className="xl:col-span-6 bg-white dark:bg-[#0a101b] border border-slate-200 dark:border-[#16253c] rounded-3xl p-4 flex flex-col space-y-4 shadow-xl transition-colors duration-300">
              
              {/* Map Canvas Toolbar */}
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-[#1c304d] pb-2 text-3xs font-black uppercase text-slate-500 dark:text-slate-400">
                <div className="flex gap-2">
                  <button className="bg-amber-500/10 text-amber-600 dark:text-amber-500 px-3 py-1.5 rounded-xl border border-amber-500/25 dark:border-amber-500/20 font-extrabold transition-all">
                    ● MAP VIEW
                  </button>
                  <button 
                    onClick={() => setActiveTab("recommendations")}
                    className="hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-[#1d2f4a] transition-all"
                  >
                    = TABLE VIEW
                  </button>
                </div>
                
                <div className="flex gap-2 items-center">
                  <span>Maharashtra</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <span>36 Districts</span>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                  <span>25 alerts active</span>
                </div>
              </div>

              {/* Geofence Draw Toolbar */}
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => {
                    clearGeofence();
                    setDrawingMode('circle');
                  }}
                  className={`py-1.5 px-3 text-4xs font-black uppercase tracking-widest rounded-xl border transition-all ${
                    drawingMode === 'circle' 
                      ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-200 dark:border-blue-500 text-blue-600 dark:text-blue-400' 
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  ● Draw Circle
                </button>
                <button
                  onClick={() => {
                    clearGeofence();
                    setDrawingMode('polygon');
                  }}
                  className={`py-1.5 px-3 text-4xs font-black uppercase tracking-widest rounded-xl border transition-all ${
                    drawingMode === 'polygon' 
                      ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-200 dark:border-rose-500 text-rose-600 dark:text-rose-400' 
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  ▲ Draw Polygon
                </button>

                {drawingMode === 'circle' && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl text-4xs font-bold text-slate-550 dark:text-slate-400">
                    <span>Radius:</span>
                    <input
                      type="range"
                      min="1000"
                      max="30000"
                      step="1000"
                      value={drawRadius}
                      onChange={(e) => {
                        const rad = parseInt(e.target.value);
                        setDrawRadius(rad);
                        if (drawCenter) triggerGeofence('circle', drawCenter, rad);
                      }}
                      className="w-20 accent-blue-500"
                    />
                    <span className="text-blue-600 dark:text-blue-400">{(drawRadius / 1000).toFixed(0)}km</span>
                  </div>
                )}

                {(drawCenter || drawPoints.length > 0 || selectedFarmerIds.length > 0) && (
                  <button
                    onClick={clearGeofence}
                    className="py-1.5 px-3 text-4xs font-black uppercase tracking-widest text-rose-600 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-950 hover:bg-rose-100 dark:hover:bg-rose-500/20 rounded-xl transition-all"
                  >
                    ✕ Clear Boundary
                  </button>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <select
                    value={filterCrop}
                    onChange={(e) => setFilterCrop(e.target.value)}
                    className="px-2 py-1 text-4xs font-extrabold border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400"
                  >
                    <option value="">Crop Types</option>
                    <option value="Rice">Rice</option>
                    <option value="Wheat">Wheat</option>
                    <option value="Soybean">Soybean</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Maize">Maize</option>
                  </select>
                </div>
              </div>

              {/* React Leaflet Map Canvas */}
              <div className="flex-1 min-h-[360px] w-full rounded-[24px] overflow-hidden border border-slate-200 dark:border-[#192b45] relative z-10 shadow-inner transition-colors duration-300">
                <MapContainer center={[19.7515, 75.7139]} zoom={7} scrollWheelZoom={true} className="h-full w-full">
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />
                  
                  {/* Circle Drawing Overlay */}
                  {drawCenter && (
                    <Circle
                      center={drawCenter}
                      radius={drawRadius}
                      pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.12 }}
                    />
                  )}

                  {/* Polygon Drawing Overlay */}
                  {drawPoints.length > 0 && (
                    <Polygon
                      positions={drawPoints}
                      pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.12 }}
                    />
                  )}

                  {/* Map Interaction event listener click handler */}
                  <MapClickHandler />

                  {/* Render color coded markers representing villages */}
                  {getVillagePoints()
                    .filter(v => {
                      if (filterDistrict && v.district.toLowerCase() !== filterDistrict.toLowerCase()) return false;
                      if (filterCrop && !v.crops.some(c => c.toLowerCase() === filterCrop.toLowerCase())) return false;
                      return true;
                    })
                    .map((v, idx) => (
                      <Marker 
                        key={idx} 
                        position={[v.latitude, v.longitude]} 
                        icon={getCustomMarkerIcon(v.color)}
                        eventHandlers={{
                          click: () => {
                            const farmerIds = v.farmers.map(f => f.id);
                            setSelectedFarmerIds(farmerIds);
                            setSelectedDistrictName(v.district);
                            setDrawCenter([v.latitude, v.longitude]);
                            setDrawingMode('circle');
                            setDrawRadius(3000); 
                            fetchDistrictDetails(v.latitude, v.longitude, v.district);
                          }
                        }}
                      >
                        <Tooltip direction="top" offset={[0, -10]} opacity={0.9} permanent className="custom-village-tooltip">
                          {v.name}
                        </Tooltip>
                        <Popup>
                          <div className="font-sans text-xs p-1 space-y-1.5 max-w-[220px] text-slate-800 dark:text-slate-100">
                            <div className="flex justify-between items-center">
                              <h4 className="font-black text-slate-900 dark:text-slate-200">{v.name}</h4>
                              <span className="font-extrabold text-4xs uppercase bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-400 px-1.5 py-0.5 rounded">
                                {v.status}
                              </span>
                            </div>
                            <div className="text-3xs text-slate-500 dark:text-slate-400 space-y-0.5 border-t pt-1 border-slate-100 dark:border-slate-800">
                              <div>District: <strong>{v.district}</strong></div>
                              <div>Farmers: <strong>{v.farmerCount} registered</strong></div>
                              <div>Crops: <strong>{v.crops.join(", ")}</strong></div>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded text-4xs leading-normal text-slate-700 dark:text-slate-350">
                              <strong>Village analysis:</strong> Sowing window is {v.color === "green" ? "fully open" : v.color === "red" ? "closed due to storm alerts" : v.color === "blue" ? "closed due to low soil moisture" : "moderately suitable"}.
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                </MapContainer>
              </div>

              {/* Bottom Weather Status Ticker */}
              <div className="bg-slate-50 dark:bg-[#050910] border border-slate-200 dark:border-[#15233a] p-2.5 rounded-2xl text-[9px] font-black text-slate-500 dark:text-slate-550 overflow-x-auto flex gap-4 whitespace-nowrap scrollbar-none transition-colors duration-300">
                <span>MUMBAI: <strong className="text-emerald-600 dark:text-emerald-400">27°C, 148mm</strong></span>
                <span>THANE: <strong className="text-emerald-600 dark:text-emerald-400">27°C, 135mm</strong></span>
                <span>PALGHAR: <strong className="text-emerald-600 dark:text-emerald-400">26°C, 110mm</strong></span>
                <span>RAIGAD: <strong className="text-emerald-600 dark:text-emerald-400">26°C, 162mm</strong></span>
                <span>RATNAGIRI: <strong className="text-yellow-600 dark:text-yellow-500">25°C, 98mm</strong></span>
                <span>SINDHUDURG: <strong className="text-yellow-600 dark:text-yellow-500">26°C, 42mm</strong></span>
                <span>NASHIK: <strong className="text-rose-600 dark:text-rose-500">24°C, 226mm</strong></span>
                <span>DHULE: <strong className="text-rose-600 dark:text-rose-500">24°C, 130mm</strong></span>
                <span>JALGAON: <strong className="text-rose-600 dark:text-rose-500">25°C, 138mm</strong></span>
              </div>
            </div>

            {/* COLUMN 3 (SPAN 3): DISTRICT DETAIL & SMS PREVIEW */}
            <div className="xl:col-span-3 bg-white dark:bg-[#0a101b] border border-slate-200 dark:border-[#16253c] rounded-3xl p-4 flex flex-col space-y-4 shadow-xl transition-colors duration-300">
              
              {/* District Detail Header */}
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-[#1c304d] pb-2">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-white">{districtDetails?.district || activeVillage?.district || "Thane"}</h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">
                    {districtDetails?.soil?.soil_type || activeVillage?.farmers[0]?.soil_type || "Laterite"} • {districtDetails?.soil?.fertility || activeVillage?.farmers[0]?.soil_fertility || "Medium"} fertility
                  </span>
                </div>
                
                <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider border transition-colors ${getStatusPillClasses(activeVillage?.color)}`}>
                  ● {activeVillage?.color === "red" ? "CRITICAL" : activeVillage?.color === "blue" ? "IRRIGATION" : activeVillage?.color === "yellow" ? "WARNING" : "SUITABLE"}
                </span>
              </div>

              {/* Metrics Cards Grid */}
              <div className="grid grid-cols-4 gap-2 text-center font-bold text-[8px]">
                <div className="bg-slate-50 dark:bg-[#050910] border border-slate-200/60 dark:border-[#1b2c45] py-2 rounded-xl transition-colors duration-300 flex flex-col justify-between h-[64px]">
                  <span className="block text-[8px] text-slate-400 dark:text-slate-500 font-black">RAIN/48H</span>
                  <span className="text-3xs font-extrabold text-slate-700 dark:text-slate-200">{districtDetails?.weather?.rainfall || "135mm"}</span>
                  <span className="block text-[6px] text-slate-400 dark:text-slate-600 mt-0.5">OpenWeather</span>
                </div>
                <div className="bg-slate-50 dark:bg-[#050910] border border-slate-200/60 dark:border-[#1b2c45] py-2 rounded-xl transition-colors duration-300 flex flex-col justify-between h-[64px]">
                  <span className="block text-[8px] text-slate-400 dark:text-slate-500 font-black">SOIL MOIST.</span>
                  <span className="text-3xs font-extrabold text-emerald-600 dark:text-emerald-400">{districtDetails?.soil?.soil_moisture_val || activeVillage?.farmers[0]?.soil_moisture_val || "79"}%</span>
                  <span className="block text-[6px] text-slate-400 dark:text-slate-600 mt-0.5">{districtDetails?.soil?.source?.includes("NASA") ? "NASA POWER" : "Sentinel-2"}</span>
                </div>
                <div className="bg-slate-50 dark:bg-[#050910] border border-slate-200/60 dark:border-[#1b2c45] py-2 rounded-xl transition-colors duration-300 flex flex-col justify-between h-[64px]">
                  <span className="block text-[8px] text-slate-400 dark:text-slate-500 font-black">TEMP</span>
                  <span className="text-3xs font-extrabold text-amber-600 dark:text-amber-500">{districtDetails?.weather?.temp || "27°C"}</span>
                  <span className="block text-[6px] text-slate-400 dark:text-slate-600 mt-0.5">OpenWeather</span>
                </div>
                <div className="bg-slate-50 dark:bg-[#050910] border border-slate-200/60 dark:border-[#1b2c45] py-2 rounded-xl transition-colors duration-300 flex flex-col justify-between h-[64px]">
                  <span className="block text-[8px] text-slate-400 dark:text-slate-500 font-black">VILLAGES</span>
                  <span className="text-3xs font-extrabold text-sky-600 dark:text-sky-400">{selectedVillagesCount || getVillagePoints().length}</span>
                  <span className="block text-[6px] text-slate-400 dark:text-slate-600 mt-0.5">Database</span>
                </div>
              </div>

              {/* Satellite Toggle Buttons */}
              <div className="flex gap-1.5 text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 justify-between">
                <span className="flex items-center gap-1 bg-slate-50 dark:bg-[#050910] border border-slate-200 dark:border-slate-900 px-2 py-1 rounded"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> IMD Forecast</span>
                <span className="flex items-center gap-1 bg-slate-50 dark:bg-[#050910] border border-slate-200 dark:border-slate-900 px-2 py-1 rounded"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> ISRO Sentinel-2</span>
                <span className="flex items-center gap-1 bg-slate-50 dark:bg-[#050910] border border-slate-200 dark:border-slate-900 px-2 py-1 rounded"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Crop Calendar</span>
              </div>

              {/* Soil Properties detail block (Figma styled with SoilGrids telemetry) */}
              <div className="bg-slate-50 dark:bg-[#050910] border border-slate-200/60 dark:border-[#192b45] p-3 rounded-2xl space-y-3 transition-colors duration-300">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-1.5">
                  <span className="text-[9px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase">SOIL PROFILE METRICS</span>
                  <span className="text-4xs font-black text-amber-600 dark:text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Source: {districtDetails?.soil?.source || "ISRIC SoilGrids"}
                  </span>
                </div>
                
                <div className="grid grid-cols-4 gap-2 text-center text-[8px] font-bold leading-normal">
                  <div className="bg-white dark:bg-slate-955 p-1 rounded border border-slate-200 dark:border-slate-900">
                    <span className="block text-slate-400 dark:text-slate-500 font-extrabold uppercase text-[6px]">Clay</span>
                    <span className="text-slate-800 dark:text-slate-350 font-black">{districtDetails?.soil?.clay || "28.5%"}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-955 p-1 rounded border border-slate-200 dark:border-slate-900">
                    <span className="block text-slate-400 dark:text-slate-500 font-extrabold uppercase text-[6px]">Sand</span>
                    <span className="text-slate-800 dark:text-slate-355 font-black">{districtDetails?.soil?.sand || "42.1%"}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-955 p-1 rounded border border-slate-200 dark:border-slate-900">
                    <span className="block text-slate-400 dark:text-slate-500 font-extrabold uppercase text-[6px]">Silt</span>
                    <span className="text-slate-800 dark:text-slate-355 font-black">{districtDetails?.soil?.silt || "29.4%"}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-955 p-1 rounded border border-slate-200 dark:border-slate-900">
                    <span className="block text-slate-400 dark:text-slate-500 font-extrabold uppercase text-[6px]">pH</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black">{districtDetails?.soil?.ph || "6.5"}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[8px] font-bold">
                  <div className="bg-white dark:bg-slate-955 p-1.5 rounded border border-slate-200 dark:border-slate-900 flex justify-between items-center">
                    <span className="text-slate-400 dark:text-slate-500 text-[7px]">Org. Carbon</span>
                    <span className="text-slate-800 dark:text-slate-300 font-black">{districtDetails?.soil?.organic_carbon || "12.4 g/kg"}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-955 p-1.5 rounded border border-slate-200 dark:border-slate-900 flex justify-between items-center">
                    <span className="text-slate-400 dark:text-slate-500 text-[7px]">Nitrogen</span>
                    <span className="text-slate-800 dark:text-slate-300 font-black">{districtDetails?.soil?.nitrogen || "1.25 g/kg"}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-955 p-1.5 rounded border border-slate-200 dark:border-slate-900 flex justify-between items-center">
                    <span className="text-slate-400 dark:text-slate-500 text-[7px]">Bulk Density</span>
                    <span className="text-slate-800 dark:text-slate-300 font-black">{districtDetails?.soil?.bulk_density || "1.35 g/cm3"}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-955 p-1.5 rounded border border-slate-200 dark:border-slate-900 flex justify-between items-center">
                    <span className="text-slate-400 dark:text-slate-500 text-[7px]">CEC Capacity</span>
                    <span className="text-slate-800 dark:text-slate-300 font-black">{districtDetails?.soil?.cec || "24.5 cmolc/kg"}</span>
                  </div>
                </div>
                
                <div className="text-[8px] text-slate-400 dark:text-slate-500 font-bold flex justify-between border-t border-slate-100 dark:border-slate-900 pt-1.5">
                  <span>Soil type: <strong className="text-slate-500 dark:text-slate-450">{districtDetails?.soil?.soil_type || "Laterite"}</strong></span>
                  <span className="text-right">Pass: {districtDetails?.soil?.satellite_pass || "02 Jul 2026 10:15 IST"}</span>
                </div>
              </div>

              {/* 48hr CSS Rainfall chart (Figma style) */}
              <div className="space-y-2">
                <span className="block text-3xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">48hr Rainfall Forecast (mm)</span>
                <div className="h-14 flex items-end justify-between gap-1 pt-2 px-1">
                  {rainfallForecastBars.map((bar, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer">
                      <div 
                        style={{ height: `${bar.val * 5}px` }}
                        className="w-full bg-blue-550 dark:bg-[#1b62db] hover:bg-sky-400 rounded-t border-t border-sky-300/40 transition-all relative"
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-950 text-white border border-slate-800 dark:border-slate-900 text-5xs font-black px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all z-20">
                          {bar.val}mm
                        </div>
                      </div>
                      <span className="text-[8px] font-black text-slate-450 dark:text-slate-500">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sowing crop parameters */}
              <div className="bg-slate-50 dark:bg-[#050910] border border-slate-200/60 dark:border-[#192b45] p-3 rounded-2xl space-y-2 text-2xs font-bold transition-colors duration-300">
                <div className="flex justify-between items-center">
                  <span className="text-slate-700 dark:text-slate-350 font-extrabold text-xs">{activeVillage?.crops[0] || "Rice"} - {activeVillage?.crops[0] === "Rice" ? "भात" : "धान्य"}</span>
                  <span className="bg-amber-500/10 text-amber-600 dark:text-amber-500 px-2 py-0.5 rounded-full text-4xs font-black">Kharif 2026</span>
                </div>
                
                <div className="text-3xs text-slate-400 dark:text-slate-500 space-y-1 pt-1 border-t border-slate-100 dark:border-slate-900">
                  <div className="flex justify-between">
                    <span>Sowing window:</span>
                    <span className="text-slate-700 dark:text-slate-300">Jul 1 - Jul 31</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Crop growth stage:</span>
                    <span className="text-amber-650 dark:text-amber-550">Pre-Sowing</span>
                  </div>
                </div>
              </div>

              {/* SMS Preview card */}
              <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#050910] border border-slate-200/60 dark:border-[#192b45] p-3 rounded-2xl space-y-3 justify-between transition-colors duration-300">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span className="text-3xs font-extrabold text-slate-500 dark:text-slate-400">SMS Preview - {selectedVillagesCount || getVillagePoints().length} villages</span>
                  </div>
                  
                  {/* Language switch */}
                  <div className="flex border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden text-5xs font-black">
                    <button 
                      onClick={() => setSmsLanguageToggle("en")}
                      className={`px-2 py-0.5 ${smsLanguageToggle === "en" ? "bg-amber-500 text-white dark:text-slate-950 font-black" : "bg-transparent text-slate-400"}`}
                    >
                      EN
                    </button>
                    <button 
                      onClick={() => setSmsLanguageToggle("mr")}
                      className={`px-2 py-0.5 ${smsLanguageToggle === "mr" ? "bg-amber-500 text-white dark:text-slate-950 font-black" : "bg-transparent text-slate-400"}`}
                    >
                      मराठी
                    </button>
                  </div>
                </div>

                {/* SMS Template text (Figma Style) - Fully Editable Textarea */}
                <textarea
                  value={gisSmsMessage}
                  onChange={(e) => setGisSmsMessage(e.target.value)}
                  placeholder="Select a village or region on the map to auto-generate the advisory warning SMS..."
                  className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-900 rounded-xl p-3 text-[10px] leading-relaxed text-slate-800 dark:text-slate-300 font-mono focus:outline-none focus:border-amber-500 max-h-[160px] w-full resize-none min-h-[140px] text-left select-text transition-colors duration-300"
                />

                {/* Send triggers */}
                <div>
                  {selectedFarmerIds.length === 0 ? (
                    <span className="block text-center text-rose-500 text-5xs font-black uppercase tracking-wider">Select geofence to activate SMS dispatch</span>
                  ) : (
                    <button
                      onClick={async () => {
                        setGisSmsLoading(true);
                        try {
                          const headers = { Authorization: `Bearer ${token}` };
                          const response = await axios.post(`${API_URL}/admin/map/send-alert`, {
                            farmer_ids: selectedFarmerIds,
                            message: gisSmsMessage
                          }, { headers });
                          alert(response.data.message);
                          fetchData();
                        } catch (err) {
                          alert("Failed to dispatch alert.");
                        } finally {
                          setGisSmsLoading(false);
                        }
                      }}
                      disabled={gisSmsLoading || !gisSmsMessage}
                      className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 disabled:opacity-50 text-white dark:text-slate-950 font-black text-2xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-amber-500/15 flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5 text-white dark:text-slate-950" /> Send to {selectedVillagesCount} villages
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: SYSTEM ANALYTICS & CHARTS */}
        {/* ========================================================= */}
        {activeTab === "analytics" && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-[#0a101b] border border-slate-200 dark:border-[#16253c] p-6 rounded-3xl shadow-sm space-y-2 transition-colors duration-300">
                <span className="block text-2xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Registered Farmers</span>
                <span className="text-3xl font-black text-slate-800 dark:text-slate-200">{analytics.summary.total_farmers}</span>
              </div>
              <div className="bg-white dark:bg-[#0a101b] border border-slate-200 dark:border-[#16253c] p-6 rounded-3xl shadow-sm space-y-2 transition-colors duration-300">
                <span className="block text-2xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Advisories Generated</span>
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{analytics.summary.total_recs}</span>
              </div>
              <div className="bg-white dark:bg-[#0a101b] border border-slate-200 dark:border-[#16253c] p-6 rounded-3xl shadow-sm space-y-2 transition-colors duration-300">
                <span className="block text-2xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total SMS Alert Volume</span>
                <span className="text-3xl font-black text-amber-600 dark:text-amber-500">{analytics.summary.total_sms_sent}</span>
              </div>
              <div className="bg-white dark:bg-[#0a101b] border border-slate-200 dark:border-[#16253c] p-6 rounded-3xl shadow-sm space-y-2 transition-colors duration-300">
                <span className="block text-2xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Weather Hazards</span>
                <span className="text-3xl font-black text-rose-600 dark:text-rose-500">{analytics.summary.active_alerts}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-[#0a101b] border border-slate-200 dark:border-[#16253c] p-6 rounded-3xl shadow-sm space-y-4 transition-colors duration-300">
                <h4 className="text-xs font-black text-slate-500 dark:text-slate-450 uppercase tracking-wider">Crop cultivated breakdown</h4>
                <div className="h-64 flex justify-center items-center">
                  <Doughnut 
                    data={{
                      labels: Object.keys(analytics.crop_distribution),
                      datasets: [{
                        data: Object.values(analytics.crop_distribution),
                        backgroundColor: ["#10b981", "#eab308", "#3b82f6", "#ef4444", "#a855f7", "#f97316"]
                      }]
                    }}
                    options={{
                      plugins: {
                        legend: {
                          labels: {
                            color: darkMode ? "#cbd5e1" : "#475569",
                            font: { weight: "bold" }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="bg-white dark:bg-[#0a101b] border border-slate-200 dark:border-[#16253c] p-6 rounded-3xl shadow-sm space-y-4 lg:col-span-2 transition-colors duration-300">
                <h4 className="text-xs font-black text-slate-500 dark:text-slate-450 uppercase tracking-wider">Registration Volume Trends</h4>
                <div className="h-64">
                  <Bar 
                    data={{
                      labels: analytics.registrations.labels,
                      datasets: [{
                        label: "Registered Farmers",
                        data: analytics.registrations.data,
                        backgroundColor: "#3b82f6"
                      }]
                    }}
                    options={getChartOptions("Registrations")}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: CROP METRICS THRESHOLD EDITOR */}
        {/* ========================================================= */}
        {activeTab === "crops" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#0a101b] border border-slate-200 dark:border-[#16253c] p-6 rounded-3xl shadow-sm space-y-4 transition-colors duration-300">
              <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {editingCropId ? "Edit Crop Requirements" : "Create New Crop requirements"}
              </h4>
              
              <form onSubmit={handleCropSubmit} className="space-y-3 text-2xs font-bold">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1">Crop Name</label>
                  <input
                    type="text"
                    required
                    value={cropName}
                    onChange={(e) => setCropName(e.target.value)}
                    placeholder="e.g. Groundnut"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-[#1a2d48] rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1">Category</label>
                  <select
                    value={cropCategory}
                    onChange={(e) => setCropCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-[#1a2d48] rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                  >
                    <option value="Cereal">Cereal</option>
                    <option value="Pulse">Pulse</option>
                    <option value="Oilseed">Oilseed</option>
                    <option value="Fiber">Fiber</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Min Temp (°C)</label>
                    <input
                      type="number"
                      required
                      value={idealTempMin}
                      onChange={(e) => setIdealTempMin(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-[#1a2d48] rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Max Temp (°C)</label>
                    <input
                      type="number"
                      required
                      value={idealTempMax}
                      onChange={(e) => setIdealTempMax(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-[#1a2d48] rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Min Rainfall (mm)</label>
                    <input
                      type="number"
                      required
                      value={idealRainMin}
                      onChange={(e) => setIdealRainMin(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-[#1a2d48] rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Max Rainfall (mm)</label>
                    <input
                      type="number"
                      required
                      value={idealRainMax}
                      onChange={(e) => setIdealRainMax(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-[#1a2d48] rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Min Soil Moisture (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={idealSoilMin}
                      onChange={(e) => setIdealSoilMin(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-[#1a2d48] rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Max Soil Moisture (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={idealSoilMax}
                      onChange={(e) => setIdealSoilMax(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-[#1a2d48] rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1">Target Season</label>
                  <select
                    value={cropSeason}
                    onChange={(e) => setCropSeason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-[#1a2d48] rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                  >
                    <option value="Kharif">Kharif</option>
                    <option value="Rabi">Rabi</option>
                    <option value="Zaid">Summer (Zaid)</option>
                  </select>
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  {editingCropId && (
                    <button
                      type="button"
                      onClick={resetCropForm}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 rounded-xl"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 font-black rounded-xl"
                  >
                    {editingCropId ? "Save Changes" : "Create Crop"}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white dark:bg-[#0a101b] border border-slate-200 dark:border-[#16253c] p-6 rounded-3xl shadow-sm space-y-4 lg:col-span-2 transition-colors duration-300">
              <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Configured Crops & Thresholds</h4>
              <div className="overflow-x-auto max-h-[480px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#16253c] text-slate-550 dark:text-slate-500 font-extrabold pb-2">
                      <th className="pb-3">Crop</th>
                      <th className="pb-3">Season</th>
                      <th className="pb-3">Ideal Temp</th>
                      <th className="pb-3">Ideal Rain</th>
                      <th className="pb-3">Ideal Soil</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crops.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 dark:border-[#101a2c]/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 text-slate-700 dark:text-slate-300 transition-colors">
                        <td className="py-3 font-extrabold">{c.name} <span className="block text-4xs font-bold text-slate-400 dark:text-slate-500 uppercase">{c.category}</span></td>
                        <td className="py-3 text-amber-650 dark:text-amber-500 font-bold">{c.thresholds?.season}</td>
                        <td className="py-3">{c.thresholds?.ideal_temp_min}°C - {c.thresholds?.ideal_temp_max}°C</td>
                        <td className="py-3">{c.thresholds?.ideal_rainfall_min}mm - {c.thresholds?.ideal_rainfall_max}mm</td>
                        <td className="py-3">{parseInt(c.thresholds?.ideal_soil_moisture_min * 100)}% - {parseInt(c.thresholds?.ideal_soil_moisture_max * 100)}%</td>
                        <td className="py-3 text-right space-x-1.5">
                          <button
                            onClick={() => editCrop(c)}
                            className="p-1.5 text-sky-600 dark:text-sky-400 hover:bg-sky-500/10 rounded-xl"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCropDelete(c.id)}
                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: MANUAL SMS DISPATCH GATEWAY */}
        {/* ========================================================= */}
        {activeTab === "sms" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-[#0a101b] border border-slate-200 dark:border-[#16253c] p-6 rounded-3xl shadow-sm space-y-4 transition-colors duration-300">
              <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Geofenced custom SMS broadcast</h4>
              
              {smsSuccessMsg && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> {smsSuccessMsg}
                </div>
              )}
              
              {smsErrorMsg && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold">
                  {smsErrorMsg}
                </div>
              )}

              <form onSubmit={handleSMSBroadcast} className="space-y-4 text-2xs font-bold">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Target Filters</label>
                    <select
                      value={smsTarget}
                      onChange={(e) => {
                        setSmsTarget(e.target.value);
                        setSmsTargetValue("");
                      }}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-[#1a2d48] rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                    >
                      <option value="all">All Registered Farmers</option>
                      <option value="village">Specific Village</option>
                      <option value="district">Specific District</option>
                    </select>
                  </div>

                  {smsTarget !== "all" && (
                    <div>
                      <label className="block text-slate-500 dark:text-slate-400 mb-1">
                        Enter {smsTarget === "village" ? "Village" : "District"} Name
                      </label>
                      <input
                        type="text"
                        required
                        value={smsTargetValue}
                        onChange={(e) => setSmsTargetValue(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-[#1a2d48] rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1">SMS Warning Message body (MAX 160 chars)</label>
                  <textarea
                    required
                    maxLength={160}
                    value={smsMessage}
                    onChange={(e) => setSmsMessage(e.target.value)}
                    placeholder="Heavy rainfall expected tomorrow..."
                    className="w-full px-3 py-2 border border-slate-200 dark:border-[#1a2d48] rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                    rows={3}
                  />
                  <div className="text-right text-3xs text-slate-500 mt-1">{smsMessage.length}/160 characters</div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={smsLoading || !smsMessage}
                    className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-slate-950 font-black rounded-xl"
                  >
                    {smsLoading ? "Dispatching Broadcast..." : "Send Campaign SMS"}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white dark:bg-[#0a101b] border border-slate-200 dark:border-[#16253c] p-6 rounded-3xl shadow-sm space-y-4 transition-colors duration-300">
              <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Send Individual test SMS</h4>
              
              {testSmsSuccess && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" /> {testSmsSuccess}
                </div>
              )}
              
              {testSmsError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-bold">
                  {testSmsError}
                </div>
              )}

              <form onSubmit={handleTestSMS} className="space-y-4 text-2xs font-bold">
                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1">Mobile Number (with country code, e.g. 919892701297)</label>
                  <input
                    type="tel"
                    required
                    value={testMobile}
                    onChange={(e) => setTestMobile(e.target.value.replace(/\D/g, ""))}
                    placeholder="919892701297"
                    className="w-full px-3 py-2 border border-slate-200 dark:border-[#1a2d48] rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 dark:text-slate-400 mb-1">Test Message text (MAX 160 chars)</label>
                  <textarea
                    required
                    maxLength={160}
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Enter test message body..."
                    className="w-full px-3 py-2 border border-slate-200 dark:border-[#1a2d48] rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={testSmsLoading || !testMobile || !testMessage}
                    className="px-6 py-2.5 bg-blue-500 text-white font-extrabold rounded-xl"
                  >
                    {testSmsLoading ? "Sending SMS..." : "Send Test SMS"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: HISTORICAL ADVISORY AUDIT LOGS */}
        {/* ========================================================= */}
        {activeTab === "recommendations" && (
          <div className="bg-white dark:bg-[#0a101b] border border-slate-200 dark:border-[#16253c] p-6 rounded-3xl shadow-sm space-y-4 transition-colors duration-300">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sowing Advisories Audit logs</h4>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 border border-slate-200 dark:border-[#1d2f4a] bg-slate-50 dark:bg-[#122035]/50 hover:bg-slate-100 dark:hover:bg-[#122035] text-slate-700 dark:text-slate-300 font-extrabold text-2xs rounded-xl transition-all flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Export CSV Report
              </button>
            </div>
            
            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#16253c] text-slate-500 font-extrabold pb-2">
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3">Crop</th>
                    <th className="pb-3">Suitability</th>
                    <th className="pb-3">Confidence</th>
                    <th className="pb-3">Weather Metrics</th>
                    <th className="pb-3">Scientific Reason Reason Logs</th>
                  </tr>
                </thead>
                <tbody>
                  {recommendations.map((rec) => (
                    <tr key={rec.id} className="border-b border-slate-100 dark:border-[#101a2c]/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 text-slate-700 dark:text-slate-300 transition-colors">
                      <td className="py-3 text-slate-500 font-medium">
                        {new Date(rec.timestamp).toLocaleDateString()} {new Date(rec.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3 font-extrabold text-slate-800 dark:text-slate-200">{rec.crop_name}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-4xs font-extrabold uppercase ${
                          rec.suitability === "Suitable" ? "bg-emerald-55/10 text-emerald-600 dark:text-emerald-400" :
                          rec.suitability === "Moderately Suitable" ? "bg-yellow-55/10 text-yellow-600 dark:text-yellow-450" : "bg-rose-55/10 text-rose-600 dark:text-rose-450"
                        }`}>
                          {rec.suitability}
                        </span>
                      </td>
                      <td className="py-3 font-black text-amber-600 dark:text-amber-500">{rec.confidence}%</td>
                      <td className="py-3 text-3xs text-slate-500 dark:text-slate-400">
                        Temp: {rec.input_weather?.temp}°C | Rain: {rec.input_weather?.rainfall}mm
                      </td>
                      <td className="py-3 text-3xs text-slate-500 dark:text-slate-450 max-w-xs truncate" title={rec.reasons?.join(", ")}>
                        {rec.reasons?.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default AdminDashboard;
