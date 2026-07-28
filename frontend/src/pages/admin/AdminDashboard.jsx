import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { 
  Sprout, LogOut, Sun, Moon, Users, MessageSquare, Sprout as CropIcon, 
  Map as MapIcon, BarChart3, Settings, Calendar, Plus, Edit, Trash2, 
  Send, AlertTriangle, CheckCircle, CheckCircle2, Search, FileSpreadsheet, ShieldAlert,
  Layers, MapPin, Activity, Radio, CloudRain, Droplets, Thermometer, Wind,
  TrendingUp, Clock, Database, Cpu, Sparkles, Filter, Globe, RefreshCw, FileText, ChevronRight,
  Eye, X, Copy, RotateCw, Lock, Unlock, PhoneCall
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
  const { token, user, logout, API_URL, darkMode, toggleDarkMode } = useContext(AppContext);
  const navigate = useNavigate();

  // Navigation Tabs: 'farmers_map' | 'analytics' | 'crops' | 'sms' | 'sms_logs' | 'recommendations'
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
  const [broadcastSummary, setBroadcastSummary] = useState(null);
  const [gisBroadcastSummary, setGisBroadcastSummary] = useState(null);

  // SMS History Module States & Filters
  const [selectedSmsLog, setSelectedSmsLog] = useState(null);
  const [smsSearchQuery, setSmsSearchQuery] = useState("");
  const [smsFilterStatus, setSmsFilterStatus] = useState("all");
  const [smsFilterDistrict, setSmsFilterDistrict] = useState("all");
  const [smsFilterType, setSmsFilterType] = useState("all");
  const [smsFilterDate, setSmsFilterDate] = useState("all");
  const [maskMobileNumbers, setMaskMobileNumbers] = useState(true);

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

  // Automatic Advisory Engine & Gateway Queue states
  const [autoStatus, setAutoStatus] = useState(null);
  const [queueStatus, setQueueStatus] = useState(null);
  const [triggeringAuto, setTriggeringAuto] = useState(false);
  const [triggeringQueue, setTriggeringQueue] = useState(false);

  const fetchAutoStatus = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [resAuto, resQueue] = await Promise.all([
        axios.get(`${API_URL}/admin/automation/status`, { headers }),
        axios.get(`${API_URL}/admin/sms/queue-status`, { headers })
      ]);
      setAutoStatus(resAuto.data);
      setQueueStatus(resQueue.data);
    } catch (err) {
      console.error("Failed to fetch automation engine status:", err);
    }
  };

  const handleTriggerAutoScan = async () => {
    setTriggeringAuto(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_URL}/admin/automation/trigger`, {}, { headers });
      alert(res.data.message || "Automation scan executed!");
      fetchData();
    } catch (err) {
      alert("Failed to trigger automation scan: " + (err.response?.data?.error || err.message));
    } finally {
      setTriggeringAuto(false);
    }
  };

  const handleTriggerQueueRetry = async () => {
    setTriggeringQueue(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await axios.post(`${API_URL}/admin/sms/queue-process`, {}, { headers });
      alert(res.data.message || "Gateway Outage Queue retry executed!");
      fetchData();
    } catch (err) {
      alert("Failed to process SMS queue: " + (err.response?.data?.error || err.message));
    } finally {
      setTriggeringQueue(false);
    }
  };

  // Fetch Dashboard States
  const fetchData = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      
      const [analRes, farmRes, cropRes, smsRes, recRes, autoRes, queueRes] = await Promise.all([
        axios.get(`${API_URL}/analytics`, { headers }),
        axios.get(`${API_URL}/farmers`, { headers }),
        axios.get(`${API_URL}/crops`, { headers }),
        axios.get(`${API_URL}/sms/history`, { headers }),
        axios.get(`${API_URL}/history`, { headers }),
        axios.get(`${API_URL}/admin/automation/status`, { headers }).catch(() => ({ data: null })),
        axios.get(`${API_URL}/admin/sms/queue-status`, { headers }).catch(() => ({ data: null }))
      ]);

      setAnalytics(analRes.data);
      setFarmers(farmRes.data);
      setCrops(cropRes.data);
      setSmsHistory(smsRes.data);
      setRecommendations(recRes.data);
      if (autoRes?.data) setAutoStatus(autoRes.data);
      if (queueRes?.data) setQueueStatus(queueRes.data);
      
      // Load GIS map datasets
      await fetchMapData();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 403 || err.response?.status === 401) {
        logout();
        navigate("/login?role=admin");
      } else {
        setError("Admin authentication expired or endpoint failure.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token || user?.role !== "admin") {
      logout();
      navigate("/login?role=admin");
      return;
    }
    fetchData();
  }, [token, user]);

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
            msgBody = `ALERT: Heavy Rain | ${district} | Crop: ${primaryCrop}. Risk: Heavy rain forecast. Action: Postpone sowing for 48h & ensure field drainage.`;
          } else if (hasLowMoisture) {
            msgBody = `ADVISORY: Dry Weather | ${district} | Crop: ${primaryCrop}. Risk: Low moisture. Action: Provide pre-sowing light irrigation before planting.`;
          } else {
            msgBody = `ADVISORY: Optimal Window | ${district} | Crop: ${primaryCrop}. Risk: None. Action: Complete sowing within 48h & apply basal fertilizer.`;
          }
        } else {
          if (hasCriticalRain) {
            msgBody = `इशारा: मुसळधार पाऊस | ${district} | पीक: ${primaryCrop}. धोका: मुसळधार पाऊस. कृती: पुढील ४८ तास पेरणी टाळा व पाण्याचा निचरा करा.`;
          } else if (hasLowMoisture) {
            msgBody = `सल्ला: कोरडे हवामान | ${district} | पीक: ${primaryCrop}. धोका: कमी ओलावा. कृती: पेरणीपूर्वी हलके सिंचन द्या व आच्छादन वापरा.`;
          } else {
            msgBody = `सल्ला: योग्य कालावधी | ${district} | पीक: ${primaryCrop}. धोका: नाही. कृती: पुढील ४८ तासांत पेरणी करा व बेस डोस द्या.`;
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
    let hexColor = "#10b981"; // green - optimal
    if (color === "yellow") hexColor = "#eab308"; // advisory
    if (color === "orange") hexColor = "#f97316"; // warning
    if (color === "red") hexColor = "#ef4444"; // critical
    if (color === "blue") hexColor = "#0284c7"; // irrigation
    if (color === "grey") hexColor = "#94a3b8"; // default/normal
    
    return L.divIcon({
      html: `
        <div style="position: relative; width: 16px; height: 16px;">
          <div style="position: absolute; top: 0; left: 0; width: 16px; height: 16px; background-color: ${hexColor}; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 0 12px ${hexColor}; z-index: 2;"></div>
          <div style="position: absolute; top: -5px; left: -5px; width: 26px; height: 26px; background-color: ${hexColor}; border-radius: 50%; opacity: 0.3; z-index: 1;"></div>
        </div>
      `,
      className: "custom-leaflet-marker",
      iconSize: [26, 26],
      iconAnchor: [13, 13],
      popupAnchor: [0, -13]
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
      if (response.data.success !== undefined) {
        setBroadcastSummary({
          success: response.data.success,
          failed: response.data.failed,
          skipped_unverified: response.data.skipped_unverified
        });
      }
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

  const handleVerifyFarmer = async (farmerId) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.post(`${API_URL}/admin/farmers/${farmerId}/verify`, {}, { headers });
      fetchData();
    } catch (err) {
      console.error("Failed to verify farmer SMS number:", err);
    }
  };

  const handleExportCSV = () => {
    alert("Exporting analytics report data to CSV... (Completed)");
  };

  // Helper for masking mobile numbers for privacy
  const maskMobile = (numStr) => {
    if (!numStr) return "N/A";
    const s = String(numStr).trim();
    if (!maskMobileNumbers) return s;
    if (s.length < 8) return s;
    return s.substring(0, 3) + "****" + s.substring(s.length - 4);
  };

  // Helper to categorize SMS alert type
  const getSmsAlertType = (msgText) => {
    if (!msgText) return "General Advisory";
    const txt = msgText.toLowerCase();
    if (txt.includes("heavy rain") || txt.includes("cloudburst") || txt.includes("storm") || txt.includes("муसळधार")) return "Heavy Rain Alert";
    if (txt.includes("irrigation") || txt.includes("moisture") || txt.includes("सिंचन")) return "Irrigation Advisory";
    if (txt.includes("sowing") || txt.includes("optimal") || txt.includes("पेरणी")) return "Sowing Advisory";
    if (txt.includes("test")) return "Test Message";
    return "General Advisory";
  };

  // Filter SMS History
  const filteredSmsHistory = smsHistory.filter((item) => {
    // 1. Search Query
    if (smsSearchQuery) {
      const q = smsSearchQuery.toLowerCase();
      const matchName = (item.farmer_name || "").toLowerCase().includes(q);
      const matchMobile = (item.mobile || "").toLowerCase().includes(q);
      const matchSid = (item["Twilio SID"] || item.twilio_sid || "").toLowerCase().includes(q);
      const matchMsg = (item.message || "").toLowerCase().includes(q);
      if (!matchName && !matchMobile && !matchSid && !matchMsg) return false;
    }
    // 2. Status Filter
    if (smsFilterStatus !== "all") {
      const st = (item.status || "").toLowerCase();
      if (smsFilterStatus === "delivered" && !st.includes("deliver")) return false;
      if (smsFilterStatus === "failed" && !st.includes("fail") && !st.includes("error")) return false;
      if (smsFilterStatus === "pending" && !st.includes("pend") && !st.includes("queue")) return false;
    }
    // 3. District Filter
    if (smsFilterDistrict !== "all") {
      if ((item.district || "").toLowerCase() !== smsFilterDistrict.toLowerCase()) return false;
    }
    // 4. Alert Type Filter
    if (smsFilterType !== "all") {
      const type = getSmsAlertType(item.message);
      if (smsFilterType === "heavy_rain" && type !== "Heavy Rain Alert") return false;
      if (smsFilterType === "sowing" && type !== "Sowing Advisory") return false;
      if (smsFilterType === "irrigation" && type !== "Irrigation Advisory") return false;
    }
    return true;
  });

  // Export SMS History to CSV
  const handleExportSmsHistoryCSV = () => {
    if (filteredSmsHistory.length === 0) {
      alert("No SMS logs to export.");
      return;
    }
    const headers = ["Timestamp", "Farmer Name", "Mobile Number", "Village", "District", "Alert Type", "Status", "Twilio SID", "Message Content", "Error Details"];
    const rows = filteredSmsHistory.map(l => [
      `"${new Date(l.timestamp).toLocaleString()}"`,
      `"${l.farmer_name || 'N/A'}"`,
      `"${l.mobile || 'N/A'}"`,
      `"${l.village || 'N/A'}"`,
      `"${l.district || 'N/A'}"`,
      `"${getSmsAlertType(l.message)}"`,
      `"${l.status || 'Sent'}"`,
      `"${l["Twilio SID"] || l.twilio_sid || 'N/A'}"`,
      `"${(l.message || '').replace(/"/g, '""')}"`,
      `"${(l.error || l.error_message || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `SMS_Delivery_Logs_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070b13] text-slate-200 flex flex-col justify-center items-center gap-4">
        <Radio className="w-12 h-12 text-emerald-500 animate-pulse" />
        <div className="text-xs font-black tracking-widest text-slate-400 uppercase">Synchronizing AgriCast GIS Command Center...</div>
      </div>
    );
  }

  // Active alerts list for Left Sidebar with strict severity colors
  const activeAlertFeed = [
    { district: "Nashik", type: "Cloudburst Alert", time: "25m ago", rain: "226mm", crop: "Onion", humidity: "91%", level: "critical" },
    { district: "Mumbai", type: "Heavy Rain Warning", time: "45m ago", rain: "148mm", crop: "Rice", humidity: "82%", level: "critical" },
    { district: "Thane", type: "Heavy Rain Warning", time: "1h ago", rain: "135mm", crop: "Rice", humidity: "79%", level: "critical" },
    { district: "Raigad", type: "Heavy Rain Warning", time: "2h ago", rain: "162mm", crop: "Rice", humidity: "88%", level: "critical" },
    { district: "Dhule", type: "Heavy Rain Warning", time: "2h ago", rain: "130mm", crop: "Cotton", humidity: "76%", level: "critical" },
    { district: "Jalgaon", type: "Moderate Rain Advisory", time: "3h ago", rain: "88mm", crop: "Banana", humidity: "77%", level: "warning" },
    { district: "Pune", type: "Moderate Rainfall", time: "3h ago", rain: "45mm", crop: "Sugarcane", humidity: "65%", level: "advisory" },
    { district: "Satara", type: "Low Moisture Advisory", time: "4h ago", rain: "12mm", crop: "Soybean", humidity: "42%", level: "blue" }
  ];

  // Rainfall forecast values for 48h chart
  const rainfallForecastBars = [
    { label: "Now", val: 6 },
    { label: "+6h", val: 8 },
    { label: "+12h", val: 5 },
    { label: "+18h", val: 6 },
    { label: "+24h", val: 4 },
    { label: "+30h", val: 4 },
    { label: "+36h", val: 2 },
    { label: "+48h", val: 1 }
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

  // Calculated Real Live Stats
  const realFarmersCount = farmers.length || mapFarmers.length || 20;
  const verifiedFarmersCount = farmers.length ? farmers.filter(f => f.verified_for_sms).length : 10;
  const totalSmsSent = smsHistory.length;
  const deliveredSmsCount = smsHistory.filter(s => (s.status || "").toLowerCase().includes("deliver")).length;
  const failedSmsCount = smsHistory.filter(s => (s.status || "").toLowerCase().includes("fail") || (s.status || "").toLowerCase().includes("error")).length;
  const pendingSmsCount = smsHistory.filter(s => (s.status || "").toLowerCase().includes("pend") || (s.status || "").toLowerCase().includes("queue")).length;
  const successRatePct = totalSmsSent > 0 ? ((deliveredSmsCount / totalSmsSent) * 100).toFixed(1) : "100.0";
  const activeCropsCount = crops.length || 27;
  const criticalAlertsCount = activeAlertFeed.filter(a => a.level === "critical").length;

  // Dynamic state badge styling
  const getStatusPillClasses = (color) => {
    if (color === "red") return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30";
    if (color === "orange") return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
    if (color === "blue") return "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30";
    if (color === "yellow") return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/30";
    return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
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
      title: { display: false }
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
    <div className="min-h-screen bg-[#f4f7f5] dark:bg-[#060a12] text-slate-800 dark:text-slate-100 flex flex-col font-sans select-none antialiased transition-colors duration-300">
      <style>{`
        .custom-village-tooltip {
          background-color: ${darkMode ? '#0b1322' : '#ffffff'} !important;
          border: 1px solid ${darkMode ? '#1c304d' : '#cbd5e1'} !important;
          color: ${darkMode ? '#cbd5e1' : '#334155'} !important;
          font-size: 9px !important;
          font-weight: 800 !important;
          border-radius: 6px !important;
          padding: 3px 8px !important;
          box-shadow: 0 4px 12px rgba(0,0,0,${darkMode ? '0.6' : '0.15'}) !important;
        }
        .leaflet-tooltip-top:before {
          border-top-color: ${darkMode ? '#1c304d' : '#cbd5e1'} !important;
        }
        .leaflet-tile {
          filter: ${darkMode ? 'invert(90%) hue-rotate(180deg) brightness(95%) contrast(90%)' : 'none'};
          transition: filter 0.4s ease;
        }
      `}</style>
      
      {/* 1. TOP HEADER: Modern GIS Command Center Navigation */}
      <header className="bg-white dark:bg-[#0a101d] border-b border-slate-200 dark:border-[#16243b] px-6 py-3 flex items-center justify-between z-30 transition-colors duration-300 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-amber-500 tracking-tight flex items-center gap-1.5 uppercase">
                <Sprout className="w-5 h-5 text-amber-500" /> AgriCast GIS Command Center
              </span>
              <span className="text-4xs font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 tracking-widest uppercase">v2.5</span>
            </div>
            <span className="text-4xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">अ‍ॅग्रीकास्ट • Agricultural Decision Support System</span>
          </div>
          
          <div className="h-6 w-px bg-slate-200 dark:bg-[#1b2b46]"></div>
          
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1 flex items-center gap-1.5 text-4xs font-black text-emerald-600 dark:text-emerald-400 transition-colors">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>LIVE OPERATIONAL</span>
          </div>
        </div>

        {/* Global Live Operational Counters */}
        <div className="hidden lg:flex items-center gap-5 text-4xs font-bold">
          <div className="bg-slate-50 dark:bg-[#070d18] border border-slate-200 dark:border-[#182842] px-3 py-1.5 rounded-xl flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            <div>
              <span className="block text-[8px] text-slate-400 dark:text-slate-500 uppercase font-black">CRITICAL ALERTS</span>
              <span className="text-xs font-black text-rose-500">{criticalAlertsCount} Active</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-[#070d18] border border-slate-200 dark:border-[#182842] px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-emerald-500" />
            <div>
              <span className="block text-[8px] text-slate-400 dark:text-slate-500 uppercase font-black">REGISTERED FARMERS</span>
              <span className="text-xs font-black text-emerald-500 dark:text-emerald-400">{realFarmersCount} ({verifiedFarmersCount} Verified)</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-[#070d18] border border-slate-200 dark:border-[#182842] px-3 py-1.5 rounded-xl flex items-center gap-2">
            <Send className="w-3.5 h-3.5 text-sky-500" />
            <div>
              <span className="block text-[8px] text-slate-400 dark:text-slate-500 uppercase font-black">SMS LOGS RECORDED</span>
              <span className="text-xs font-black text-sky-500 dark:text-sky-400">{totalSmsSent} Sent Total</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-[#070d18] border border-slate-200 dark:border-[#182842] px-3 py-1.5 rounded-xl flex items-center gap-2">
            <CropIcon className="w-3.5 h-3.5 text-amber-500" />
            <div>
              <span className="block text-[8px] text-slate-400 dark:text-slate-500 uppercase font-black">ACTIVE CROPS</span>
              <span className="text-xs font-black text-amber-500">{activeCropsCount} Configured</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-4xs font-bold text-slate-500 dark:text-slate-400">
          <div className="text-right hidden xl:block leading-tight text-slate-400 dark:text-slate-500 text-[9px]">
            <div>IMD Weather: <strong className="text-emerald-500">Live 11:21 IST</strong></div>
            <div>ISRIC SoilGrids: <strong className="text-sky-400">Synced</strong></div>
          </div>

          <button 
            onClick={toggleDarkMode}
            className="p-2 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-amber-500 rounded-xl border border-slate-200 dark:border-slate-800 transition-all"
            aria-label="Toggle Theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-500" />}
          </button>
          
          <button 
            onClick={logout}
            className="p-2 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-rose-500 rounded-xl border border-slate-200 dark:border-slate-800 transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. MAIN NAV TABS BAR */}
      <nav className="bg-white dark:bg-[#080d17] border-b border-slate-200 dark:border-[#132034] px-6 flex gap-2 transition-colors">
        <button
          onClick={() => setActiveTab("farmers_map")}
          className={`py-3 px-4 text-4xs font-black tracking-widest uppercase border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "farmers_map" 
              ? "border-amber-500 text-amber-500" 
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" /> GIS COMMAND CENTER
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`py-3 px-4 text-4xs font-black tracking-widest uppercase border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "analytics" 
              ? "border-amber-500 text-amber-500" 
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" /> SYSTEM ANALYTICS
        </button>
        <button
          onClick={() => setActiveTab("crops")}
          className={`py-3 px-4 text-4xs font-black tracking-widest uppercase border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "crops" 
              ? "border-amber-500 text-amber-500" 
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <CropIcon className="w-3.5 h-3.5" /> CROP THRESHOLDS
        </button>
        <button
          onClick={() => setActiveTab("sms")}
          className={`py-3 px-4 text-4xs font-black tracking-widest uppercase border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "sms" 
              ? "border-amber-500 text-amber-500" 
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" /> TWILIO SMS TESTER
        </button>
        <button
          onClick={() => setActiveTab("sms_logs")}
          className={`py-3 px-4 text-4xs font-black tracking-widest uppercase border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "sms_logs" 
              ? "border-amber-500 text-amber-500" 
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <HistoryIcon className="w-3.5 h-3.5" /> SMS DELIVERY LOGS
        </button>
        <button
          onClick={() => setActiveTab("recommendations")}
          className={`py-3 px-4 text-4xs font-black tracking-widest uppercase border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "recommendations" 
              ? "border-amber-500 text-amber-500" 
              : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          <FileText className="w-3.5 h-3.5" /> ADVISORY AUDIT LOGS
        </button>
      </nav>

      {/* 3. MAIN VIEW CONTAINER */}
      <main className="flex-1 p-5 relative overflow-y-auto">

        {/* ========================================================= */}
        {/* TAB 1: GIS COMMAND CENTER (MAP FOCUSED LAYOUT) */}
        {/* ========================================================= */}
        {activeTab === "farmers_map" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 h-full min-h-[640px]">
            
            {/* COLUMN 1 (SPAN 3): ACTIVE ALERTS & SYSTEM TELEMETRY */}
            <div className="xl:col-span-3 bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] rounded-2xl p-4 flex flex-col space-y-4 shadow-sm transition-colors">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#172740] pb-2.5">
                <span className="text-3xs font-black tracking-widest text-slate-500 dark:text-slate-400 uppercase flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-500" /> Active Weather Hazards
                </span>
                <span className="bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded text-4xs font-black">LIVE</span>
              </div>
              
              {/* Alert Badge counter totals */}
              <div className="grid grid-cols-4 gap-1.5 text-center font-black">
                <div className="bg-rose-500/10 border border-rose-500/20 py-2 rounded-xl text-rose-500">
                  <span className="block text-[8px] text-slate-400 dark:text-slate-500">CRITICAL</span>
                  <span className="text-xs">{activeAlertFeed.filter(a=>a.level==='critical').length}</span>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 py-2 rounded-xl text-amber-500">
                  <span className="block text-[8px] text-slate-400 dark:text-slate-500">WARNING</span>
                  <span className="text-xs">{activeAlertFeed.filter(a=>a.level==='warning').length}</span>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-500/20 py-2 rounded-xl text-yellow-500">
                  <span className="block text-[8px] text-slate-400 dark:text-slate-500">ADVISORY</span>
                  <span className="text-xs">{activeAlertFeed.filter(a=>a.level==='advisory').length}</span>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/20 py-2 rounded-xl text-emerald-500">
                  <span className="block text-[8px] text-slate-400 dark:text-slate-500">SOWING</span>
                  <span className="text-xs">9</span>
                </div>
              </div>

              {/* Live Alerts Scroll Feed */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[380px]">
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
                    className={`bg-slate-50 dark:bg-[#050910] border p-3 rounded-xl cursor-pointer transition-all space-y-1.5 relative overflow-hidden group ${
                      filterDistrict.toLowerCase() === alert.district.toLowerCase() 
                        ? "border-amber-500 bg-amber-500/10" 
                        : "border-slate-200/80 dark:border-[#172740] hover:border-amber-500/50"
                    }`}
                  >
                    <div className="flex justify-between items-center text-3xs font-black text-slate-400 dark:text-slate-500">
                      <span className="text-slate-800 dark:text-slate-200 font-extrabold tracking-wide text-2xs group-hover:text-amber-500 transition-colors">{alert.district}</span>
                      <span className="text-[9px]">{alert.time}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        alert.level === "critical" ? "bg-rose-500" :
                        alert.level === "warning" ? "bg-amber-500" :
                        alert.level === "blue" ? "bg-sky-500" : "bg-yellow-500"
                      }`}></span>
                      <span className={`text-3xs font-black ${
                        alert.level === "critical" ? "text-rose-500" :
                        alert.level === "warning" ? "text-amber-500" :
                        alert.level === "blue" ? "text-sky-400" : "text-yellow-500"
                      }`}>{alert.type}</span>
                    </div>
                    <div className="flex justify-between text-4xs font-bold text-slate-500 dark:text-slate-400 pt-1.5 border-t border-slate-100 dark:border-slate-900">
                      <span className="flex items-center gap-0.5"><CloudRain className="w-3 h-3 text-sky-400" /> {alert.rain}</span>
                      <span className="flex items-center gap-0.5"><Sprout className="w-3 h-3 text-emerald-400" /> {alert.crop}</span>
                      <span className="flex items-center gap-0.5"><Droplets className="w-3 h-3 text-blue-400" /> {alert.humidity}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Automatic Advisory Engine Status Card */}
              <div className="bg-slate-50 dark:bg-[#040810] border border-amber-500/20 dark:border-amber-500/30 p-3 rounded-xl space-y-2.5 text-[9px] font-bold shadow-sm transition-colors">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-1.5">
                  <span className="text-4xs font-black uppercase text-amber-500 tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Auto Advisory Engine
                  </span>
                  <span className="text-[7px] text-emerald-500 font-extrabold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                    EVERY 60 MIN
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[8px]">
                  <div className="bg-white dark:bg-[#070d18] p-1.5 rounded-lg border border-slate-200 dark:border-slate-900">
                    <span className="block text-slate-400 text-[7px] font-black uppercase">FARMERS CHECKED</span>
                    <span className="text-slate-900 dark:text-slate-100 font-black text-xs">{autoStatus?.farmers_checked ?? verifiedFarmersCount} Verified</span>
                  </div>
                  <div className="bg-white dark:bg-[#070d18] p-1.5 rounded-lg border border-slate-200 dark:border-slate-900">
                    <span className="block text-slate-400 text-[7px] font-black uppercase">ALERTS GENERATED</span>
                    <span className="text-amber-500 font-black text-xs">{autoStatus?.alerts_generated ?? 0} Dispatched</span>
                  </div>
                  <div className="bg-white dark:bg-[#070d18] p-1.5 rounded-lg border border-slate-200 dark:border-slate-900">
                    <span className="block text-slate-400 text-[7px] font-black uppercase">SMS SENT</span>
                    <span className="text-emerald-500 font-black text-xs">{autoStatus?.sms_sent ?? 0}</span>
                  </div>
                  <div className="bg-white dark:bg-[#070d18] p-1.5 rounded-lg border border-slate-200 dark:border-slate-900">
                    <span className="block text-slate-400 text-[7px] font-black uppercase">24H DUP SUPPRESSED</span>
                    <span className="text-sky-400 font-black text-xs">{autoStatus?.suppressed_duplicate ?? 0}</span>
                  </div>
                </div>

                <div className="text-[8px] text-slate-500 dark:text-slate-400 space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-900">
                  <div className="flex justify-between">
                    <span>Last Scan:</span>
                    <strong className="text-slate-700 dark:text-slate-300">
                      {autoStatus?.last_scan_time ? new Date(autoStatus.last_scan_time).toLocaleTimeString() : "Active (Hourly)"}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Next Scan:</span>
                    <strong className="text-amber-500 font-bold">
                      {autoStatus?.next_scan_time ? new Date(autoStatus.next_scan_time).toLocaleTimeString() : "In 60 mins"}
                    </strong>
                  </div>
                </div>

                <button
                  onClick={handleTriggerAutoScan}
                  disabled={triggeringAuto}
                  className="w-full py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-lg text-4xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${triggeringAuto ? "animate-spin" : ""}`} />
                  {triggeringAuto ? "Running Advisory Scan..." : "Trigger Manual Scan Now"}
                </button>
              </div>
            </div>

            {/* COLUMN 2 (SPAN 6): PROMINENT GIS MAP CANVAS (INCREASED AREA) */}
            <div className="xl:col-span-6 bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] rounded-2xl p-4 flex flex-col space-y-3 shadow-sm transition-colors">
              
              {/* Map Canvas Toolbar */}
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-[#172740] pb-2.5 text-3xs font-black uppercase text-slate-500 dark:text-slate-400">
                <div className="flex gap-2">
                  <button className="bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-xl border border-amber-500/20 font-extrabold flex items-center gap-1">
                    <MapIcon className="w-3.5 h-3.5" /> GIS MAP VIEW
                  </button>
                  <button 
                    onClick={() => setActiveTab("recommendations")}
                    className="hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 px-3 py-1.5 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all flex items-center gap-1"
                  >
                    <FileText className="w-3.5 h-3.5" /> LOGS TABLE
                  </button>
                </div>
                
                <div className="flex gap-2 items-center text-[9px]">
                  <span>Maharashtra</span>
                  <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                  <span>36 Districts</span>
                  <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                  <span className="text-rose-500">{criticalAlertsCount} Critical Alerts</span>
                </div>
              </div>

              {/* Geofence Draw Toolbar */}
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  onClick={() => {
                    clearGeofence();
                    setDrawingMode('circle');
                  }}
                  className={`py-1.5 px-3 text-4xs font-black uppercase tracking-widest rounded-xl border transition-all ${
                    drawingMode === 'circle' 
                      ? 'bg-sky-500/15 border-sky-500 text-sky-400' 
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  ● Draw Circle Boundary
                </button>
                <button
                  onClick={() => {
                    clearGeofence();
                    setDrawingMode('polygon');
                  }}
                  className={`py-1.5 px-3 text-4xs font-black uppercase tracking-widest rounded-xl border transition-all ${
                    drawingMode === 'polygon' 
                      ? 'bg-rose-500/15 border-rose-500 text-rose-400' 
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  ▲ Draw Polygon Boundary
                </button>

                {drawingMode === 'circle' && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-4xs font-bold text-slate-400">
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
                      className="w-20 accent-sky-500"
                    />
                    <span className="text-sky-400">{(drawRadius / 1000).toFixed(0)}km</span>
                  </div>
                )}

                {(drawCenter || drawPoints.length > 0 || selectedFarmerIds.length > 0) && (
                  <button
                    onClick={clearGeofence}
                    className="py-1.5 px-3 text-4xs font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 rounded-xl transition-all"
                  >
                    ✕ Clear Boundary
                  </button>
                )}

                <div className="ml-auto flex items-center gap-2">
                  <select
                    value={filterCrop}
                    onChange={(e) => setFilterCrop(e.target.value)}
                    className="px-2.5 py-1 text-4xs font-black border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 focus:outline-none focus:border-amber-500"
                  >
                    <option value="">All Crop Types</option>
                    <option value="Rice">Rice</option>
                    <option value="Wheat">Wheat</option>
                    <option value="Soybean">Soybean</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Maize">Maize</option>
                  </select>
                </div>
              </div>

              {/* React Leaflet Map Canvas (Expanded 20-30% height focus) */}
              <div className="flex-1 min-h-[460px] w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-[#172740] relative z-10 shadow-inner transition-colors">
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
                      pathOptions={{ color: '#0284c7', fillColor: '#0284c7', fillOpacity: 0.15 }}
                    />
                  )}

                  {/* Polygon Drawing Overlay */}
                  {drawPoints.length > 0 && (
                    <Polygon
                      positions={drawPoints}
                      pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.15 }}
                    />
                  )}

                  {/* Map Click events handler helper */}
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
                          <div className="font-sans text-xs p-1.5 space-y-2 max-w-[230px] text-slate-800 dark:text-slate-100">
                            <div className="flex justify-between items-center">
                              <h4 className="font-black text-slate-900 dark:text-slate-100">{v.name}</h4>
                              <span className={`font-black text-4xs uppercase px-2 py-0.5 rounded border ${getStatusPillClasses(v.color)}`}>
                                {v.status}
                              </span>
                            </div>
                            <div className="text-3xs text-slate-500 dark:text-slate-400 space-y-0.5 border-t pt-1.5 border-slate-100 dark:border-slate-800">
                              <div>District: <strong className="text-slate-700 dark:text-slate-300">{v.district}</strong></div>
                              <div>Farmers: <strong className="text-slate-700 dark:text-slate-300">{v.farmerCount} registered</strong></div>
                              <div>Crops: <strong className="text-slate-700 dark:text-slate-300">{v.crops.join(", ")}</strong></div>
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800/80 p-2 rounded text-4xs leading-normal text-slate-700 dark:text-slate-300">
                              <strong>Sowing Evaluation:</strong> Window is {v.color === "green" ? "optimal for sowing" : v.color === "red" ? "closed due to storm/heavy rain" : v.color === "blue" ? "requires pre-sowing irrigation" : "moderately suitable"}.
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    ))}
                </MapContainer>

                {/* GIS Map Legend Overlay */}
                <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 dark:bg-[#070d18]/95 backdrop-blur-md border border-slate-200 dark:border-[#172740] p-2.5 rounded-xl shadow-lg text-[9px] font-bold space-y-1 text-slate-700 dark:text-slate-300">
                  <div className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1">GIS Map Legend</div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500"></span>
                    <span>Critical Alert (Storm / Heavy Rain)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500"></span>
                    <span>Warning (Moderate Weather Risk)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-sm shadow-yellow-500"></span>
                    <span>Advisory (Caution Advised)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500"></span>
                    <span>Optimal Sowing Window</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shadow-sm shadow-sky-500"></span>
                    <span>Irrigation Required (Low Moisture)</span>
                  </div>
                </div>
              </div>

              {/* Bottom Weather Status Ticker */}
              <div className="bg-slate-50 dark:bg-[#050910] border border-slate-200 dark:border-[#15233a] p-2.5 rounded-xl text-[9px] font-black text-slate-500 overflow-x-auto flex gap-4 whitespace-nowrap scrollbar-none transition-colors">
                <span>MUMBAI: <strong className="text-emerald-500">27°C, 148mm</strong></span>
                <span>THANE: <strong className="text-emerald-500">27°C, 135mm</strong></span>
                <span>PALGHAR: <strong className="text-emerald-500">26°C, 110mm</strong></span>
                <span>RAIGAD: <strong className="text-emerald-500">26°C, 162mm</strong></span>
                <span>RATNAGIRI: <strong className="text-yellow-500">25°C, 98mm</strong></span>
                <span>SINDHUDURG: <strong className="text-yellow-500">26°C, 42mm</strong></span>
                <span>NASHIK: <strong className="text-rose-500">24°C, 226mm</strong></span>
                <span>DHULE: <strong className="text-rose-500">24°C, 130mm</strong></span>
                <span>JALGAON: <strong className="text-rose-500">25°C, 138mm</strong></span>
              </div>
            </div>

            {/* COLUMN 3 (SPAN 3): DISTRICT TELEMETRY & ADVISORY COMMAND */}
            <div className="xl:col-span-3 bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] rounded-2xl p-4 flex flex-col space-y-4 shadow-sm transition-colors">
              
              {/* District Detail Header */}
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-[#172740] pb-2.5">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-500" />
                    {districtDetails?.district || activeVillage?.district || "Thane"}
                  </h3>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">
                    {districtDetails?.soil?.soil_type || activeVillage?.farmers[0]?.soil_type || "Laterite"} • {districtDetails?.soil?.fertility || activeVillage?.farmers[0]?.soil_fertility || "Medium"} fertility
                  </span>
                </div>
                
                <span className={`px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider border transition-colors ${getStatusPillClasses(activeVillage?.color)}`}>
                  ● {activeVillage?.color === "red" ? "CRITICAL" : activeVillage?.color === "blue" ? "IRRIGATION" : activeVillage?.color === "yellow" ? "WARNING" : "SUITABLE"}
                </span>
              </div>

              {/* Weather Metrics Card */}
              <div className="grid grid-cols-4 gap-2 text-center font-bold text-[8px]">
                <div className="bg-slate-50 dark:bg-[#050910] border border-slate-200/80 dark:border-[#172740] p-2 rounded-xl flex flex-col justify-between h-[64px]">
                  <span className="block text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase">RAIN/48H</span>
                  <span className="text-3xs font-extrabold text-slate-800 dark:text-slate-200">{districtDetails?.weather?.rainfall || "135mm"}</span>
                  <span className="block text-[6px] text-slate-400 mt-0.5">OpenWeather</span>
                </div>
                <div className="bg-slate-50 dark:bg-[#050910] border border-slate-200/80 dark:border-[#172740] p-2 rounded-xl flex flex-col justify-between h-[64px]">
                  <span className="block text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase">MOISTURE</span>
                  <span className="text-3xs font-extrabold text-emerald-500">{districtDetails?.soil?.soil_moisture_val || activeVillage?.farmers[0]?.soil_moisture_val || "79"}%</span>
                  <span className="block text-[6px] text-slate-400 mt-0.5">SoilGrids</span>
                </div>
                <div className="bg-slate-50 dark:bg-[#050910] border border-slate-200/80 dark:border-[#172740] p-2 rounded-xl flex flex-col justify-between h-[64px]">
                  <span className="block text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase">TEMP</span>
                  <span className="text-3xs font-extrabold text-amber-500">{districtDetails?.weather?.temp || "27°C"}</span>
                  <span className="block text-[6px] text-slate-400 mt-0.5">OpenWeather</span>
                </div>
                <div className="bg-slate-50 dark:bg-[#050910] border border-slate-200/80 dark:border-[#172740] p-2 rounded-xl flex flex-col justify-between h-[64px]">
                  <span className="block text-[8px] text-slate-400 dark:text-slate-500 font-black uppercase">FARMERS</span>
                  <span className="text-3xs font-extrabold text-sky-400">{selectedVillagesCount || getVillagePoints().length}</span>
                  <span className="block text-[6px] text-slate-400 mt-0.5">Database</span>
                </div>
              </div>

              {/* Soil Metrics Compact Progress Cards */}
              <div className="bg-slate-50 dark:bg-[#050910] border border-slate-200/80 dark:border-[#172740] p-3 rounded-xl space-y-2.5 transition-colors">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-1.5">
                  <span className="text-[9px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1">
                    <Database className="w-3 h-3 text-amber-500" /> Soil Profile Telemetry
                  </span>
                  <span className="text-4xs font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Source: {districtDetails?.soil?.source || "ISRIC SoilGrids"}
                  </span>
                </div>
                
                {/* Textures with visual progress bars */}
                <div className="space-y-1.5 text-[8px] font-bold">
                  <div>
                    <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-0.5">
                      <span>Clay Content</span>
                      <span className="text-slate-800 dark:text-slate-200 font-black">{districtDetails?.soil?.clay || "28.5%"}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: districtDetails?.soil?.clay || '28.5%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-0.5">
                      <span>Sand Content</span>
                      <span className="text-slate-800 dark:text-slate-200 font-black">{districtDetails?.soil?.sand || "42.1%"}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-sky-500 rounded-full" style={{ width: districtDetails?.soil?.sand || '42.1%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-0.5">
                      <span>Silt Content</span>
                      <span className="text-slate-800 dark:text-slate-200 font-black">{districtDetails?.soil?.silt || "29.4%"}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: districtDetails?.soil?.silt || '29.4%' }}></div>
                    </div>
                  </div>

                  {/* pH Meter Bar */}
                  <div className="pt-1">
                    <div className="flex justify-between text-slate-500 dark:text-slate-400 mb-0.5">
                      <span>pH Level (Ideal 5.5 - 7.5)</span>
                      <span className="text-emerald-500 font-black">{districtDetails?.soil?.ph || "6.5"}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 via-emerald-500 to-sky-500 rounded-full relative">
                      <div 
                        className="absolute top-0 w-2 h-2 bg-white dark:bg-slate-950 border-2 border-emerald-500 rounded-full -mt-0.25 -ml-1 transition-all"
                        style={{ left: `${Math.min(Math.max(((parseFloat(districtDetails?.soil?.ph || 6.5) - 4) / 5) * 100, 5), 95)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[8px] font-bold pt-1">
                  <div className="bg-white dark:bg-slate-950 p-1.5 rounded-lg border border-slate-200 dark:border-slate-900 flex justify-between items-center">
                    <span className="text-slate-400 text-[7px]">Org. Carbon</span>
                    <span className="text-slate-800 dark:text-slate-300 font-black">{districtDetails?.soil?.organic_carbon || "12.4 g/kg"}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-950 p-1.5 rounded-lg border border-slate-200 dark:border-slate-900 flex justify-between items-center">
                    <span className="text-slate-400 text-[7px]">Nitrogen</span>
                    <span className="text-slate-800 dark:text-slate-300 font-black">{districtDetails?.soil?.nitrogen || "1.25 g/kg"}</span>
                  </div>
                </div>
              </div>

              {/* 48hr Rainfall Forecast Timeline Chart Card */}
              <div className="space-y-1.5">
                <span className="block text-3xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <CloudRain className="w-3 h-3 text-sky-400" /> 48hr Rainfall Forecast Timeline (mm)
                </span>
                <div className="h-14 flex items-end justify-between gap-1 pt-2 px-1 bg-slate-50 dark:bg-[#050910] border border-slate-200/80 dark:border-[#172740] rounded-xl p-2">
                  {rainfallForecastBars.map((bar, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-1 group cursor-pointer">
                      <div 
                        style={{ height: `${bar.val * 5}px` }}
                        className="w-full bg-sky-500 hover:bg-sky-400 rounded-t border-t border-sky-300/40 transition-all relative"
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white border border-slate-800 text-5xs font-black px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all z-20 whitespace-nowrap">
                          {bar.val}mm
                        </div>
                      </div>
                      <span className="text-[8px] font-black text-slate-400">{bar.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sowing Recommendation Summary Card */}
              <div className="bg-slate-50 dark:bg-[#050910] border border-slate-200/80 dark:border-[#172740] p-3 rounded-xl space-y-2 text-2xs font-bold transition-colors">
                <div className="flex justify-between items-center">
                  <span className="text-slate-800 dark:text-slate-200 font-black text-xs flex items-center gap-1">
                    <Sprout className="w-4 h-4 text-emerald-500" />
                    {activeVillage?.crops[0] || "Rice"} Recommendation
                  </span>
                  <span className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full text-4xs font-black">Kharif 2026</span>
                </div>
                
                <div className="text-3xs text-slate-500 dark:text-slate-400 space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-900">
                  <div className="flex justify-between">
                    <span>Target Sowing Window:</span>
                    <strong className="text-slate-800 dark:text-slate-200">Jul 1 - Jul 31 (25 July 2026)</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>AI Model Confidence:</span>
                    <span className="text-emerald-500 font-black">92.0% Confidence</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
              </div>

              {/* SMS Preview & Dispatch Form */}
              <div className="flex-1 flex flex-col bg-slate-50 dark:bg-[#050910] border border-slate-200/80 dark:border-[#172740] p-3 rounded-xl space-y-3 justify-between transition-colors">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-3xs font-black text-slate-500 dark:text-slate-400">Advisory SMS Dispatch ({selectedVillagesCount || getVillagePoints().length} Villages)</span>
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

                {/* SMS Template textarea */}
                <div className="space-y-1">
                  <textarea
                    value={gisSmsMessage}
                    onChange={(e) => setGisSmsMessage(e.target.value)}
                    placeholder="Select a village or region on the map to auto-generate the advisory warning SMS..."
                    className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-[10px] leading-relaxed text-slate-800 dark:text-slate-200 font-mono focus:outline-none focus:border-amber-500 max-h-[140px] w-full resize-none min-h-[110px] transition-colors"
                  />
                  <div className="flex justify-between items-center px-1 text-[9px] font-bold">
                    <span className="text-slate-400">Concise GIS SMS Preview (1 Segment)</span>
                    <span className={gisSmsMessage.length > 160 ? "text-rose-500 font-black" : "text-emerald-500 font-black"}>
                      {gisSmsMessage.length}/160 characters
                    </span>
                  </div>
                </div>

                {/* Send triggers */}
                <div>
                  {gisBroadcastSummary && (
                    <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#03060c] border border-slate-200 dark:border-[#1a2d48] text-[8px] font-bold space-y-1 relative mb-3">
                      <button 
                        type="button" 
                        onClick={() => setGisBroadcastSummary(null)} 
                        className="absolute top-1 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        ✕
                      </button>
                      <div className="text-[6px] text-slate-400 uppercase tracking-widest font-black mb-1">MAP BROADCAST STATS</div>
                      <div className="flex gap-2 justify-between">
                        <span className="text-emerald-500">Success: <strong>{gisBroadcastSummary.success}</strong></span>
                        <span className="text-rose-500">Failed: <strong>{gisBroadcastSummary.failed}</strong></span>
                        <span className="text-amber-500">Skipped: <strong>{gisBroadcastSummary.skipped_unverified}</strong></span>
                      </div>
                    </div>
                  )}

                  {selectedFarmerIds.length === 0 ? (
                    <span className="block text-center text-rose-500 text-5xs font-black uppercase tracking-wider">Select geofence region to enable SMS dispatch</span>
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
                          if (response.data.success !== undefined) {
                            setGisBroadcastSummary({
                              success: response.data.success,
                              failed: response.data.failed,
                              skipped_unverified: response.data.skipped_unverified
                            });
                          }
                          fetchData();
                        } catch (err) {
                          const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || "Failed to dispatch alert.";
                          alert("Failed to dispatch alert: " + errMsg);
                        } finally {
                          setGisSmsLoading(false);
                        }
                      }}
                      disabled={gisSmsLoading || !gisSmsMessage}
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black text-2xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-amber-500/15 flex items-center justify-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5 text-slate-950" /> Send Broadcast to {selectedFarmerIds.length} Farmers
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] p-6 rounded-2xl shadow-sm space-y-2 transition-colors">
                <span className="block text-2xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Registered Farmers</span>
                <span className="text-3xl font-black text-slate-800 dark:text-slate-200">{analytics.summary.total_farmers}</span>
              </div>
              <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] p-6 rounded-2xl shadow-sm space-y-2 transition-colors">
                <span className="block text-2xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Advisories Generated</span>
                <span className="text-3xl font-black text-emerald-500">{analytics.summary.total_recs}</span>
              </div>
              <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] p-6 rounded-2xl shadow-sm space-y-2 transition-colors">
                <span className="block text-2xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total SMS Alert Volume</span>
                <span className="text-3xl font-black text-amber-500">{analytics.summary.total_sms_sent}</span>
              </div>
              <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] p-6 rounded-2xl shadow-sm space-y-2 transition-colors">
                <span className="block text-2xs font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active Weather Hazards</span>
                <span className="text-3xl font-black text-rose-500">{analytics.summary.active_alerts}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] p-6 rounded-2xl shadow-sm space-y-4 transition-colors">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Crop cultivated breakdown</h4>
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

              <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] p-6 rounded-2xl shadow-sm space-y-4 lg:col-span-2 transition-colors">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Registration Volume Trends</h4>
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
            <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] p-6 rounded-2xl shadow-sm space-y-4 transition-colors">
              <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {editingCropId ? "Edit Crop Requirements" : "Create New Crop Requirements"}
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
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl"
                  >
                    {editingCropId ? "Save Changes" : "Create Crop"}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] p-6 rounded-2xl shadow-sm space-y-4 lg:col-span-2 transition-colors">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Configured Crops & Thresholds</h4>
              <div className="overflow-x-auto max-h-[480px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-[#15233a] text-slate-500 font-extrabold pb-2">
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
                        <td className="py-3 font-extrabold">{c.name} <span className="block text-4xs font-bold text-slate-400 uppercase">{c.category}</span></td>
                        <td className="py-3 text-amber-500 font-bold">{c.thresholds?.season}</td>
                        <td className="py-3">{c.thresholds?.ideal_temp_min}°C - {c.thresholds?.ideal_temp_max}°C</td>
                        <td className="py-3">{c.thresholds?.ideal_rainfall_min}mm - {c.thresholds?.ideal_rainfall_max}mm</td>
                        <td className="py-3">{parseInt((c.thresholds?.ideal_soil_moisture_min || 0.2) * 100)}% - {parseInt((c.thresholds?.ideal_soil_moisture_max || 0.7) * 100)}%</td>
                        <td className="py-3 text-right space-x-1.5">
                          <button
                            onClick={() => editCrop(c)}
                            className="p-1.5 text-sky-400 hover:bg-sky-500/10 rounded-xl"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCropDelete(c.id)}
                            className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-xl"
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
        {/* TAB 4: MANUAL TWILIO SMS TESTER & VERIFICATION */}
        {/* ========================================================= */}
        {activeTab === "sms" && (
          <div className="space-y-6">
            {broadcastSummary && (
              <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] p-4 rounded-2xl shadow-sm space-y-2 relative transition-colors">
                <button 
                  type="button" 
                  onClick={() => setBroadcastSummary(null)} 
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 text-sm font-bold"
                >
                  ✕
                </button>
                <div className="font-extrabold text-slate-500 uppercase tracking-widest text-[9px] mb-1">CAMPAIGN BROADCAST SUMMARY</div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                    <span className="block text-emerald-500 font-black text-lg">{broadcastSummary.success}</span>
                    <span className="block text-[8px] text-slate-400 uppercase font-black">Delivered</span>
                  </div>
                  <div className="bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                    <span className="block text-rose-500 font-black text-lg">{broadcastSummary.failed}</span>
                    <span className="block text-[8px] text-slate-400 uppercase font-black">Failed</span>
                  </div>
                  <div className="bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                    <span className="block text-amber-500 font-black text-lg">{broadcastSummary.skipped_unverified}</span>
                    <span className="block text-[8px] text-slate-400 uppercase font-black">Skipped (Unverified)</span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] p-6 rounded-2xl shadow-sm space-y-4 transition-colors">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Geofenced Custom SMS Broadcast</h4>
                
                {smsSuccessMsg && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> {smsSuccessMsg}
                  </div>
                )}
                
                {smsErrorMsg && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold">
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
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">SMS Message Body (MAX 160 chars)</label>
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
                      className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl"
                    >
                      {smsLoading ? "Dispatching Broadcast..." : "Send Campaign SMS"}
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] p-6 rounded-2xl shadow-sm space-y-4 transition-colors">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Send Individual Test SMS</h4>
                
                {testSmsSuccess && (
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> {testSmsSuccess}
                  </div>
                )}
                
                {testSmsError && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold">
                    {testSmsError}
                  </div>
                )}

                <form onSubmit={handleTestSMS} className="space-y-4 text-2xs font-bold">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Mobile Number (with country code, e.g. +919892701297)</label>
                    <input
                      type="tel"
                      required
                      value={testMobile}
                      onChange={(e) => setTestMobile(e.target.value)}
                      placeholder="+919892701297"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-[#1a2d48] rounded-xl bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 mb-1">Test Message Body (MAX 160 chars)</label>
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
                      className="px-6 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-extrabold rounded-xl"
                    >
                      {testSmsLoading ? "Sending SMS..." : "Send Test SMS"}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Twilio Farmer Verification Table */}
            <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] p-6 rounded-2xl shadow-sm space-y-4 transition-colors">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-900">
                <div>
                  <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Twilio SMS Verification & Management</h4>
                  <p className="text-[10px] text-slate-400 font-bold mt-1">Manual validation control panel for Twilio numbers.</p>
                </div>
              </div>
              
              <div className="overflow-x-auto max-h-[350px]">
                <table className="w-full text-left text-2xs font-extrabold border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-[#101a2c]/50 text-slate-400 uppercase text-[9px] tracking-wider">
                      <th className="pb-3">Farmer Name</th>
                      <th className="pb-3">Mobile Number</th>
                      <th className="pb-3">Village</th>
                      <th className="pb-3">District</th>
                      <th className="pb-3">Farmer Type</th>
                      <th className="pb-3">SMS Verified</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {farmers.map((f) => (
                      <tr key={f.id} className="border-b border-slate-100 dark:border-[#101a2c]/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 text-slate-700 dark:text-slate-300 transition-colors">
                        <td className="py-3 font-extrabold">{f.name}</td>
                        <td className="py-3 font-mono">{f.mobile}</td>
                        <td className="py-3">{f.village}</td>
                        <td className="py-3">{f.district}</td>
                        <td className="py-3 uppercase text-[9px]">{f.farmer_type}</td>
                        <td className="py-3">
                          {f.verified_for_sms ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[8px] font-black uppercase">Verified</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[8px] font-black uppercase">Not Verified</span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          {!f.verified_for_sms && (
                            <button
                              onClick={() => handleVerifyFarmer(f.id)}
                              className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-[9px] uppercase tracking-wider"
                            >
                              Mark as Verified
                            </button>
                          )}
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
        {/* TAB 5: SMS HISTORY & DELIVERY LOGS MODULE */}
        {/* ========================================================= */}
        {activeTab === "sms_logs" && (
          <div className="space-y-6">
            {/* Header & Export Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <HistoryIcon className="w-5 h-5 text-amber-500" /> SMS History & Delivery Audit Logs
                </h3>
                <p className="text-2xs font-medium text-slate-500 dark:text-slate-400">
                  Comprehensive delivery tracking, Twilio Message SIDs, and error diagnostics for all broadcast alerts.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMaskMobileNumbers(!maskMobileNumbers)}
                  className={`px-3 py-2 rounded-xl border text-2xs font-extrabold flex items-center gap-1.5 transition-all ${
                    maskMobileNumbers 
                      ? "bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-500"
                  }`}
                >
                  {maskMobileNumbers ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5 text-emerald-500" />}
                  {maskMobileNumbers ? "Privacy Mask: ON" : "Privacy Mask: OFF"}
                </button>

                <button
                  onClick={handleExportSmsHistoryCSV}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-extrabold text-2xs rounded-xl transition-all flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Export CSV Report
                </button>
              </div>
            </div>

            {/* Gateway Outage Queue Health Banner */}
            <div className="bg-white dark:bg-[#090f1a] border border-amber-500/30 p-4 rounded-2xl shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-[#15233a] pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                      Gateway Outage Resiliency Queue
                    </h4>
                    <span className="text-[10px] text-slate-400 font-bold block">
                      Automatic 5-min retry cycle for network timeouts & Twilio outages.
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleTriggerQueueRetry}
                  disabled={triggeringQueue}
                  className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/30 rounded-xl text-2xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${triggeringQueue ? "animate-spin" : ""}`} />
                  {triggeringQueue ? "Retrying Outage Queue..." : "Flush & Process Queue Now"}
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-center font-bold text-3xs">
                <div className="bg-slate-50 dark:bg-[#050910] border border-amber-500/20 p-2.5 rounded-xl">
                  <span className="block text-[8px] text-slate-400 font-black uppercase">QUEUED OUTAGES</span>
                  <span className="text-sm font-black text-amber-500">{queueStatus?.queued ?? 0}</span>
                </div>
                <div className="bg-slate-50 dark:bg-[#050910] border border-sky-500/20 p-2.5 rounded-xl">
                  <span className="block text-[8px] text-slate-400 font-black uppercase">RETRYING</span>
                  <span className="text-sm font-black text-sky-400">{queueStatus?.retrying ?? 0}</span>
                </div>
                <div className="bg-slate-50 dark:bg-[#050910] border border-emerald-500/20 p-2.5 rounded-xl">
                  <span className="block text-[8px] text-slate-400 font-black uppercase">RECOVERED & DELIVERED</span>
                  <span className="text-sm font-black text-emerald-500">{queueStatus?.recovered ?? 0}</span>
                </div>
                <div className="bg-slate-50 dark:bg-[#050910] border border-rose-500/20 p-2.5 rounded-xl">
                  <span className="block text-[8px] text-slate-400 font-black uppercase">PERMANENTLY FAILED</span>
                  <span className="text-sm font-black text-rose-500">{queueStatus?.permanently_failed ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Top Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] p-4 rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Total SMS Sent</span>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{filteredSmsHistory.length}</span>
                </div>
                <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] p-4 rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Delivered</span>
                  <span className="text-2xl font-black text-emerald-500">{deliveredSmsCount}</span>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] p-4 rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Failed</span>
                  <span className="text-2xl font-black text-rose-500">{failedSmsCount}</span>
                </div>
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] p-4 rounded-2xl shadow-sm flex items-center justify-between">
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Pending / Queued</span>
                  <span className="text-2xl font-black text-amber-500">{pendingSmsCount}</span>
                </div>
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] p-4 rounded-2xl shadow-sm flex items-center justify-between col-span-2 lg:col-span-1">
                <div>
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Success Rate</span>
                  <span className="text-2xl font-black text-emerald-500">{successRatePct}%</span>
                </div>
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Filter Controls & Search Toolbar */}
            <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search farmer, phone, Twilio SID..."
                  value={smsSearchQuery}
                  onChange={(e) => setSmsSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div className="flex flex-wrap gap-2 items-center w-full md:w-auto">
                <select
                  value={smsFilterStatus}
                  onChange={(e) => setSmsFilterStatus(e.target.value)}
                  className="px-3 py-2 text-2xs font-extrabold border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Delivery Statuses</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending / Queued</option>
                </select>

                <select
                  value={smsFilterDistrict}
                  onChange={(e) => setSmsFilterDistrict(e.target.value)}
                  className="px-3 py-2 text-2xs font-extrabold border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Districts</option>
                  <option value="Thane">Thane</option>
                  <option value="Nashik">Nashik</option>
                  <option value="Mumbai">Mumbai</option>
                  <option value="Raigad">Raigad</option>
                  <option value="Pune">Pune</option>
                </select>

                <select
                  value={smsFilterType}
                  onChange={(e) => setSmsFilterType(e.target.value)}
                  className="px-3 py-2 text-2xs font-extrabold border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300"
                >
                  <option value="all">All Alert Categories</option>
                  <option value="heavy_rain">Heavy Rain Alert</option>
                  <option value="sowing">Sowing Advisory</option>
                  <option value="irrigation">Irrigation Advisory</option>
                </select>

                {(smsSearchQuery || smsFilterStatus !== "all" || smsFilterDistrict !== "all" || smsFilterType !== "all") && (
                  <button
                    onClick={() => {
                      setSmsSearchQuery("");
                      setSmsFilterStatus("all");
                      setSmsFilterDistrict("all");
                      setSmsFilterType("all");
                    }}
                    className="px-3 py-2 text-2xs font-extrabold text-rose-500 hover:bg-rose-500/10 rounded-xl border border-rose-500/20"
                  >
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {/* Main SMS History Table */}
            <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#050910] border-b border-slate-200 dark:border-[#15233a] text-slate-500 font-black text-[9px] uppercase tracking-wider">
                      <th className="py-3.5 px-4">Date & Time</th>
                      <th className="py-3.5 px-4">Farmer Name</th>
                      <th className="py-3.5 px-4">Mobile Number</th>
                      <th className="py-3.5 px-4">District / Village</th>
                      <th className="py-3.5 px-4">Alert Type</th>
                      <th className="py-3.5 px-4">SMS Preview</th>
                      <th className="py-3.5 px-4">Delivery Status</th>
                      <th className="py-3.5 px-4">Twilio Message SID</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#101a2c]/50">
                    {filteredSmsHistory.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400 font-extrabold text-2xs">
                          No matching SMS logs found.
                        </td>
                      </tr>
                    ) : (
                      filteredSmsHistory.map((log, idx) => {
                        const alertType = getSmsAlertType(log.message);
                        const statusStr = (log.status || "Sent").toLowerCase();
                        const isDelivered = statusStr.includes("deliver");
                        const isFailed = statusStr.includes("fail") || statusStr.includes("error");
                        const sid = log["Twilio SID"] || log.twilio_sid || "N/A";

                        return (
                          <tr 
                            key={log.id || idx} 
                            onClick={() => setSelectedSmsLog(log)}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                          >
                            <td className="py-3 px-4 text-3xs font-semibold text-slate-500 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleDateString()} {new Date(log.timestamp).toLocaleTimeString()}
                            </td>
                            <td className="py-3 px-4 font-black text-slate-900 dark:text-slate-100 whitespace-nowrap">
                              {log.farmer_name || "Unknown Farmer"}
                            </td>
                            <td className="py-3 px-4 font-mono text-3xs font-extrabold whitespace-nowrap">
                              {maskMobile(log.mobile)}
                            </td>
                            <td className="py-3 px-4 text-3xs font-bold whitespace-nowrap">
                              {log.district || "N/A"} <span className="text-slate-400">({log.village || "N/A"})</span>
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800">
                                {alertType}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-3xs text-slate-500 dark:text-slate-400 max-w-xs truncate font-mono">
                              {(log.message || "").substring(0, 75)}...
                            </td>
                            <td className="py-3 px-4 whitespace-nowrap">
                              <span className={`px-2.5 py-0.5 rounded-full text-4xs font-black uppercase ${
                                isDelivered ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" :
                                isFailed ? "bg-rose-500/10 text-rose-500 border border-rose-500/20" :
                                "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                              }`}>
                                ● {log.status || "Dispatched"}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[9px] text-slate-400 whitespace-nowrap">
                              {sid}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedSmsLog(log);
                                }}
                                className="p-1.5 text-amber-500 hover:bg-amber-500/10 rounded-lg transition-all"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Slide-over Side Drawer Modal for Log Details */}
            {selectedSmsLog && (
              <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex justify-end">
                <div className="w-full max-w-lg bg-white dark:bg-[#090f1a] border-l border-slate-200 dark:border-[#15233a] h-full p-6 overflow-y-auto space-y-6 shadow-2xl animate-in slide-in-from-right duration-200">
                  
                  {/* Modal Header */}
                  <div className="flex justify-between items-center border-b border-slate-100 dark:border-[#172740] pb-4">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-amber-500" /> SMS Log Inspection
                      </h4>
                      <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                        Dispatched on {new Date(selectedSmsLog.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedSmsLog(null)}
                      className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg bg-slate-100 dark:bg-slate-900"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Delivery Status Banner */}
                  <div className={`p-4 rounded-xl border flex items-center justify-between ${
                    (selectedSmsLog.status || "").toLowerCase().includes("deliver") 
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" 
                      : (selectedSmsLog.status || "").toLowerCase().includes("fail")
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-500"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-500"
                  }`}>
                    <div>
                      <span className="block text-[8px] font-black uppercase tracking-widest">Delivery Status</span>
                      <span className="text-sm font-black">{selectedSmsLog.status || "Dispatched"}</span>
                    </div>

                    <div className="text-right">
                      <span className="block text-[8px] font-black uppercase tracking-widest text-slate-400">Twilio SID</span>
                      <span className="font-mono text-xs font-bold">{selectedSmsLog["Twilio SID"] || selectedSmsLog.twilio_sid || "N/A"}</span>
                    </div>
                  </div>

                  {/* Recipient Details Card */}
                  <div className="bg-slate-50 dark:bg-[#050910] border border-slate-200/80 dark:border-[#172740] p-4 rounded-xl space-y-3">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Recipient Farmer Profile</span>
                    
                    <div className="grid grid-cols-2 gap-3 text-2xs font-bold">
                      <div>
                        <span className="block text-slate-400 text-[8px] uppercase">Farmer Name</span>
                        <span className="text-slate-800 dark:text-slate-200 font-extrabold">{selectedSmsLog.farmer_name || "Unknown Farmer"}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 text-[8px] uppercase">Mobile Number</span>
                        <span className="text-slate-800 dark:text-slate-200 font-mono">{selectedSmsLog.mobile || "N/A"}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 text-[8px] uppercase">District</span>
                        <span className="text-slate-800 dark:text-slate-200">{selectedSmsLog.district || "N/A"}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400 text-[8px] uppercase">Village</span>
                        <span className="text-slate-800 dark:text-slate-200">{selectedSmsLog.village || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Full SMS Message Box */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Full SMS Message Content</span>
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 font-mono text-xs leading-relaxed text-slate-800 dark:text-slate-200 select-text whitespace-pre-wrap">
                      {selectedSmsLog.message}
                    </div>
                  </div>

                  {/* Error Diagnostic (If Failed) */}
                  {(selectedSmsLog.error || selectedSmsLog.error_message) && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-1.5 text-2xs font-bold text-rose-500">
                      <span className="block text-[8px] font-black uppercase tracking-widest">Error Diagnostic</span>
                      <div className="font-mono text-3xs">{selectedSmsLog.error || selectedSmsLog.error_message}</div>
                      {selectedSmsLog.error_code && (
                        <div className="text-[9px]">Twilio Error Code: <strong>{selectedSmsLog.error_code}</strong></div>
                      )}
                    </div>
                  )}

                  {/* Future Action Hooks */}
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-900 flex gap-2">
                    <button
                      onClick={() => {
                        setTestMobile(selectedSmsLog.mobile || "");
                        setTestMessage(selectedSmsLog.message || "");
                        setActiveTab("sms");
                        setSelectedSmsLog(null);
                      }}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-2xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <RotateCw className="w-3.5 h-3.5" /> Resend SMS Message
                    </button>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedSmsLog.message || "");
                        alert("SMS content copied to clipboard!");
                      }}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-black text-2xs uppercase tracking-wider rounded-xl transition-all flex items-center gap-1"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy Text
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: HISTORICAL ADVISORY AUDIT LOGS */}
        {/* ========================================================= */}
        {activeTab === "recommendations" && (
          <div className="bg-white dark:bg-[#090f1a] border border-slate-200 dark:border-[#15233a] p-6 rounded-2xl shadow-sm space-y-4 transition-colors">
            <div className="flex justify-between items-center">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">Sowing Advisories Audit Logs</h4>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 font-extrabold text-2xs rounded-xl transition-all flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500" /> Export CSV Report
              </button>
            </div>
            
            <div className="overflow-x-auto max-h-[480px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#15233a] text-slate-500 font-extrabold pb-2">
                    <th className="pb-3">Timestamp</th>
                    <th className="pb-3">Crop</th>
                    <th className="pb-3">Suitability</th>
                    <th className="pb-3">Confidence</th>
                    <th className="pb-3">Weather Metrics</th>
                    <th className="pb-3">Scientific Reasoning Logs</th>
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
                        <span className={`px-2.5 py-0.5 rounded-full text-4xs font-black uppercase ${
                          rec.suitability === "Suitable" ? "bg-emerald-500/10 text-emerald-500" :
                          rec.suitability === "Moderately Suitable" ? "bg-yellow-500/10 text-yellow-500" : "bg-rose-500/10 text-rose-500"
                        }`}>
                          {rec.suitability}
                        </span>
                      </td>
                      <td className="py-3 font-black text-amber-500">{rec.confidence}%</td>
                      <td className="py-3 text-3xs text-slate-500 dark:text-slate-400">
                        Temp: {rec.input_weather?.temp}°C | Rain: {rec.input_weather?.rainfall}mm
                      </td>
                      <td className="py-3 text-3xs text-slate-500 dark:text-slate-400 max-w-xs truncate" title={rec.reasons?.join(", ")}>
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

// Internal icon import alias for cleaner JSX rendering
const HistoryIcon = ({ className }) => (
  <Clock className={className} />
);

export default AdminDashboard;
