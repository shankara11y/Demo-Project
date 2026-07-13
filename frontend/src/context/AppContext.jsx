import React, { createContext, useState, useEffect } from "react";

export const AppContext = createContext();

const DICTIONARY = {
  en: {
    title: "AgriCast Sowing Advisory System",
    hero_title: "Hyperlocal Sowing Decisions Guided by AI",
    hero_subtitle: "Empowering Indian farmers with village-level weather insights and automated sowing recommendation alerts.",
    login: "Login",
    register: "Register",
    logout: "Logout",
    dashboard: "Dashboard",
    profile: "Profile",
    crops: "Manage Crops",
    sms: "SMS Gateway",
    analytics: "Analytics",
    admin: "Admin Control Panel",
    language: "Language",
    language_en: "English",
    language_hi: "हिन्दी",
    language_mr: "मराठी",
    farmer: "Farmer Portal",
    admin_login_btn: "Admin Access",
    get_started: "Get Started",
    how_it_works: "How AgriCast Works",
    current_weather: "Current Weather",
    forecast_5day: "5-Day Sowing Forecast",
    temp: "Temperature",
    humidity: "Humidity",
    rain: "Rainfall",
    wind: "Wind Speed",
    suitability: "Sowing Suitability",
    confidence: "Confidence Score",
    recommendation: "AI Recommendation",
    history: "Recommendation Logs",
    sowing_window: "Recommended Sowing Window",
    avoid_window: "Avoid Sowing",
    generate_rec: "Generate Recommendation",
    pdf_download: "Download PDF Advisory",
    alerts: "Hazard Alerts & Warnings",
    notifications: "Advisory Notifications",
    farm_size: "Farm Size (Acres)",
    village: "Village",
    district: "District",
    state: "State",
    crop_types: "Preferred Crops",
    save_profile: "Save Profile Settings",
    welcome: "Welcome",
    loading: "Analyzing local parameters...",
    keypad_farmer_desc: "Keypad Farmer (SMS Mode Only)",
    smartphone_farmer_desc: "Smartphone Farmer (App Mode)",
    select_crop_prompt: "Choose crop to analyze suitability",
    reasons_header: "Agronomic Explanations & Advice"
  },
  hi: {
    title: "एग्रीकास्ट बुवाई सलाहकार प्रणाली",
    hero_title: "कृत्रिम बुद्धिमत्ता (AI) द्वारा सटीक बुवाई निर्णय",
    hero_subtitle: "भारतीय किसानों को ग्राम-स्तरीय मौसम जानकारी और स्वचालित बुवाई उपयुक्तता अलर्ट के साथ सशक्त बनाना।",
    login: "लॉगिन करें",
    register: "पंजीकरण",
    logout: "लॉगआउट",
    dashboard: "डैशबोर्ड",
    profile: "प्रोफ़ाइल",
    crops: "फसलें",
    sms: "एसएमएस गेटवे",
    analytics: "विश्लेषण",
    admin: "एडमिन पैनल",
    language: "भाषा",
    language_en: "English",
    language_hi: "हिन्दी",
    language_mr: "मराठी",
    farmer: "किसान पोर्टल",
    admin_login_btn: "एडमिन लॉगिन",
    get_started: "शुरू करें",
    how_it_works: "एग्रीकास्ट कैसे काम करता है",
    current_weather: "वर्तमान मौसम",
    forecast_5day: "5-दिवसीय बुवाई पूर्वानुमान",
    temp: "तापमान",
    humidity: "आर्द्रता",
    rain: "बारिश",
    wind: "हवा की गति",
    suitability: "बुवाई उपयुक्तता",
    confidence: "भरोसा स्कोर",
    recommendation: "एआई बुवाई सलाह",
    history: "बुवाई इतिहास",
    sowing_window: "अनुशंसित बुवाई अवधि",
    avoid_window: "बुवाई से बचें",
    generate_rec: "बुवाई सलाह प्राप्त करें",
    pdf_download: "पीडीएफ सलाह डाउनलोड करें",
    alerts: "मौसम और आपदा चेतावनी",
    notifications: "बुवाई सूचनाएं",
    farm_size: "खेत का आकार (एकड़)",
    village: "गांव",
    district: "जिला",
    state: "राज्य",
    crop_types: "पसंदीदा फसलें",
    save_profile: "प्रोफ़ाइल सहेजें",
    welcome: "स्वागत है",
    loading: "स्थानीय मौसम मापदंडों का विश्लेषण...",
    keypad_farmer_desc: "कीपैड किसान (केवल एसएमएस)",
    smartphone_farmer_desc: "स्मार्टफोन किसान (ऐप मोड)",
    select_crop_prompt: "उपयुक्तता देखने के लिए फसल चुनें",
    reasons_header: "कृषि विज्ञान स्पष्टीकरण और सलाह"
  },
  mr: {
    title: "अ‍ॅग्रीकास्ट पेरणी सल्ला प्रणाली",
    hero_title: "कृत्रिम बुद्धिमत्ता (AI) द्वारे अचूक पेरणी सल्ला",
    hero_subtitle: "भारतीय शेतकऱ्यांना ग्राम-पातळीवरील हवामान अंदाज आणि स्वयंचलित पेरणी सल्ला अलर्टद्वारे सक्षम करणे.",
    login: "लॉगिन",
    register: "नोंदणी",
    logout: "लॉगआउट",
    dashboard: "डॅशबोर्ड",
    profile: "प्रोफाईल",
    crops: "पिके व्यवस्थापन",
    sms: "एसएमएस गेटवे",
    analytics: "विश्लेषण",
    admin: "अ‍ॅडमिन पॅनेल",
    language: "भाषा",
    language_en: "English",
    language_hi: "हिन्दी",
    language_mr: "मराठी",
    farmer: "शेतकरी पोर्टल",
    admin_login_btn: "अ‍ॅडमिन लॉगिन",
    get_started: "सुरू करा",
    how_it_works: "अ‍ॅग्रीकास्ट कसे कार्य करते",
    current_weather: "सध्याचे हवामान",
    forecast_5day: "५-दिवसीय पेरणी अंदाज",
    temp: "तापमान",
    humidity: "आद्रता",
    rain: "पाऊस",
    wind: "वाऱ्याचा वेग",
    suitability: "पेरणीची योग्यता",
    confidence: "विश्वास स्कोर",
    recommendation: "एआय पेरणी सल्ला",
    history: "पेरणी इतिहास",
    sowing_window: "पेरणीचा कालावधी",
    avoid_window: "पेरणी टाळा",
    generate_rec: "पेरणी सल्ला मिळवा",
    pdf_download: "पीडीएफ सल्ला डाउनलोड करा",
    alerts: "हवामान आणि संकट इशारा",
    notifications: "पेरणी अधिसूचना",
    farm_size: "शेती आकार (एकर)",
    village: "गाव",
    district: "जिल्हा",
    state: "राज्य",
    crop_types: "पसंतीची पिके",
    save_profile: "प्रोफाईल जतन करा",
    welcome: "स्वागत आहे",
    loading: "हवामान निकषांचे विश्लेषण सुरू आहे...",
    keypad_farmer_desc: "कीपॅड शेतकरी (फक्त एसएमएस)",
    smartphone_farmer_desc: "स्मार्टफोन शेतकरी (अ‍ॅप मोड)",
    select_crop_prompt: "योग्यतेची तपासणी करण्यासाठी पीक निवडा",
    reasons_header: "कृषी वैज्ञानिक स्पष्टीकरण आणि सल्ला"
  }
};

export const AppProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")) || null);
  const [language, setLanguage] = useState(localStorage.getItem("language") || "en");
  const [darkMode, setDarkMode] = useState(localStorage.getItem("darkMode") === "true");

  const API_URL = "http://localhost:5001";

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
    } else {
      localStorage.removeItem("token");
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    if (darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [darkMode]);

  const login = (jwtToken, userData) => {
    setToken(jwtToken);
    setUser(userData);
  };

  const logout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const translate = (key) => {
    return DICTIONARY[language]?.[key] || DICTIONARY["en"]?.[key] || key;
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <AppContext.Provider
      value={{
        token,
        user,
        language,
        setLanguage,
        darkMode,
        toggleDarkMode,
        login,
        logout,
        translate,
        API_URL
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
