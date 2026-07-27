import React, { createContext, useState, useEffect } from "react";

export const AppContext = createContext();

const DICTIONARY = {
  en: {
    title: "AgriCast Sowing Advisory System",
    hero_title: "Smart Weather & Crop Advisory Platform for Farmers",
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
    reasons_header: "Agronomic Explanations & Advice",
    home: "Home",
    mobile_number: "Mobile Number",
    email_address: "Email Address",
    password: "Password",
    sign_in: "Sign In",
    authenticating: "Authenticating...",
    new_to_agricast: "New to AgriCast?",
    register_farm_now: "Register Farm Now",
    login_fail_msg: "Login authentication failed. Check your credentials.",
    login_portal_title: "Farmer Sowing Advisory Login",
    admin_portal_title: "Admin Dashboard Access",
    access_admin_portal: "Access Admin Portal",
    access_farmer_portal: "Access Farmer Portal"
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
    reasons_header: "कृषि विज्ञान स्पष्टीकरण और सलाह",
    home: "मुख्यपृष्ठ",
    mobile_number: "मोबाइल नंबर",
    email_address: "ईमेल पता",
    password: "पासवर्ड",
    sign_in: "साइन इन करें",
    authenticating: "प्रमाणीकृत किया जा रहा है...",
    new_to_agricast: "एग्रीकास्ट पर नए हैं?",
    register_farm_now: "अभी खेत पंजीकृत करें",
    login_fail_msg: "लॉगिन विफल हुआ। कृपया अपने विवरण जांचें।",
    login_portal_title: "किसान बुवाई सलाह लॉगिन",
    admin_portal_title: "एडमिन डैशबोर्ड एक्सेस",
    access_admin_portal: "एडमिन पोर्टल खोलें",
    access_farmer_portal: "किसान पोर्टल खोलें"
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
    reasons_header: "कृषी वैज्ञानिक स्पष्टीकरण आणि सल्ला",
    home: "मुख्यपृष्ठ",
    mobile_number: "मोबाईल क्रमांक",
    email_address: "ईमेल पत्ता",
    password: "पासवर्ड",
    sign_in: "साइन इन करा",
    authenticating: "प्रमाणीकरण सुरू आहे...",
    new_to_agricast: "अ‍ॅग्रीकास्ट वर नवीन आहात?",
    register_farm_now: "आत्ताच शेत नोंदणी करा",
    login_fail_msg: "लॉगिन अयशस्वी. कृपया आपली माहिती तपासा.",
    login_portal_title: "शेतकरी पेरणी सल्ला लॉगिन",
    admin_portal_title: "अ‍ॅडमिन डॅशबोर्ड अ‍ॅक्सेस",
    access_admin_portal: "अ‍ॅडमिन पोर्टल उघडा",
    access_farmer_portal: "शेतकरी पोर्टल उघडा"
  }
};

import i18n from "../i18n";
import axios from "axios";

const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim() !== "") {
    return envUrl.trim().replace(/\/$/, "");
  }
  return "http://localhost:5001";
};

export const AppProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("user")) || null);
  const [language, setLanguage] = useState(localStorage.getItem("agricast_lang") || localStorage.getItem("language") || "en");
  const [darkMode, setDarkMode] = useState(localStorage.getItem("darkMode") === "true");

  const API_URL = getApiUrl();

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
    localStorage.setItem("agricast_lang", language);
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    if (darkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [darkMode]);

  const changeLanguage = async (newLang) => {
    setLanguage(newLang);
    localStorage.setItem("agricast_lang", newLang);
    localStorage.setItem("language", newLang);
    i18n.changeLanguage(newLang);

    if (token && user?.role === "farmer") {
      try {
        await axios.put(
          `${API_URL}/profile`,
          { preferred_language: newLang },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (user) {
          const updatedUser = { ...user, preferred_language: newLang };
          setUser(updatedUser);
          localStorage.setItem("user", JSON.stringify(updatedUser));
        }
      } catch (err) {
        console.error("Failed to sync preferred language to server:", err);
      }
    }
  };

  const login = (jwtToken, userData) => {
    setToken(jwtToken);
    setUser(userData);
    if (userData?.preferred_language) {
      changeLanguage(userData.preferred_language);
    }
  };

  const logout = () => {
    setToken("");
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

const CROP_DICTIONARY = {
  hi: {
    "Rice": "चावल (धान)",
    "Wheat": "गेहूं",
    "Soybean": "सोयाबीन",
    "Cotton": "कपास",
    "Maize": "मक्का",
    "Millets": "बाजरा/मोटा अनाज",
    "Groundnut": "मूंगफली",
    "Bajra (Pearl Millet)": "बाजरा",
    "Jowar (Sorghum)": "ज्वार",
    "Ragi (Finger Millet)": "रागी",
    "Barley": "जौ",
    "Tur / Arhar (Pigeon Pea)": "तूर / अरहर",
    "Chana (Chickpea)": "चना",
    "Moong (Green Gram)": "मूंग",
    "Urad (Black Gram)": "उड़द",
    "Masoor (Lentil)": "मसूर",
    "Mustard (Sarson)": "सरसों",
    "Sunflower": "सूरजमुखी",
    "Sesame (Til)": "तिल",
    "Sugarcane": "गन्ना",
    "Jute": "पटसन (जूट)",
    "Onion": "प्याज",
    "Tomato": "टमाटर",
    "Potato": "आलू",
    "Chilli": "मिर्च",
    "Turmeric (Haldi)": "हल्दी",
    "Banana": "केला"
  },
  mr: {
    "Rice": "तांदूळ (भात)",
    "Wheat": "गहू",
    "Soybean": "सोयाबीन",
    "Cotton": "कापूस",
    "Maize": "मका",
    "Millets": "भरड धान्य",
    "Groundnut": "भुईमूग",
    "Bajra (Pearl Millet)": "बाजरी",
    "Jowar (Sorghum)": "ज्वारी",
    "Ragi (Finger Millet)": "नाचणी (रागी)",
    "Barley": "सातू (जवस)",
    "Tur / Arhar (Pigeon Pea)": "तूर",
    "Chana (Chickpea)": "हरभरा (चना)",
    "Moong (Green Gram)": "मूग",
    "Urad (Black Gram)": "उडीद",
    "Masoor (Lentil)": "मसूर",
    "Mustard (Sarson)": "मोहरी",
    "Sunflower": "सूर्यफूल",
    "Sesame (Til)": "तीळ",
    "Sugarcane": "ऊस",
    "Jute": "अंबाडी (जूट)",
    "Onion": "कांदा",
    "Tomato": "टोमॅटो",
    "Potato": "बटाटा",
    "Chilli": "मिरची",
    "Turmeric (Haldi)": "हळद",
    "Banana": "केळी"
  }
};

  const translate = (key) => {
    if (i18n.exists(key)) {
      return i18n.t(key);
    }
    return DICTIONARY[language]?.[key] || DICTIONARY["en"]?.[key] || key;
  };

  const translateCrop = (cropName) => {
    if (!cropName) return "";
    const lang = language || "en";
    if (lang === "en") return cropName;
    return CROP_DICTIONARY[lang]?.[cropName] || CROP_DICTIONARY[lang]?.[cropName.trim()] || cropName;
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
        setLanguage: changeLanguage,
        changeLanguage,
        darkMode,
        toggleDarkMode,
        login,
        logout,
        translate,
        translateCrop,
        API_URL
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
