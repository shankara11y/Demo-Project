import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import LanguageSelector from "../components/LanguageSelector";
import { 
  Sun, Moon, CloudSun, BrainCircuit, MessageSquare, MapPin, 
  ChevronRight, Sprout, ShieldCheck, Activity 
} from "lucide-react";

export const LandingPage = () => {
  const { darkMode, toggleDarkMode, translate } = useContext(AppContext);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* Navigation */}
      <header className="sticky top-0 z-50 glass-panel shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary-500 text-white p-2 rounded-xl shadow-md shadow-primary-500/20">
              <Sprout className="w-6 h-6 animate-pulse" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
              AgriCast
            </span>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSelector />
            
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            <Link
              to="/login"
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-primary-500"
            >
              {translate("login")}
            </Link>

            <Link
              to="/register"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold shadow-md shadow-primary-500/20 transition-all transform hover:scale-105"
            >
              {translate("get_started")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32 bg-gradient-to-b from-primary-500/10 via-transparent to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
            {/* Left Col */}
            <div className="space-y-6 text-center lg:text-left animate-slide-up">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-500/15 border border-primary-500/30 text-primary-500 dark:text-primary-100 text-xs font-bold uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
                College Demo Day Special Project
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none text-slate-900 dark:text-white">
                {translate("hero_title")}
              </h1>
              
              <p className="text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto lg:mx-0">
                {translate("hero_subtitle")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to="/register"
                  className="px-8 py-3.5 rounded-full bg-primary-500 hover:bg-primary-600 text-white font-bold shadow-lg shadow-primary-500/20 transition-all flex items-center justify-center gap-2"
                >
                  Register as Farmer <ChevronRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-3.5 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-bold border border-slate-200 dark:border-slate-800 shadow-md transition-all flex items-center justify-center"
                >
                  Farmer Login
                </Link>
              </div>
            </div>

            {/* Right Col */}
            <div className="relative flex justify-center items-center">
              <div className="absolute w-72 h-72 bg-primary-500/20 dark:bg-primary-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
              
              {/* Graphic Vector Representation */}
              <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl p-6 relative overflow-hidden transition-transform hover:scale-102">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                    <CloudSun className="w-8 h-8 text-amber-500" />
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">Solapur, Maharashtra</h4>
                      <p className="text-xs text-slate-500">Current Forecast: Kharif Season</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                    Live Simulator
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-500">Temperature</span>
                    <span className="font-extrabold text-slate-800 dark:text-white">28.4 °C</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-500">Rain Probability</span>
                    <span className="font-extrabold text-primary-500">85% (Next 24h)</span>
                  </div>
                  
                  {/* Sowing Advice Indicator */}
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4" /> Suitable Sowing Window
                      </span>
                      <span className="text-xs font-extrabold text-emerald-600">91% AI Match</span>
                    </div>
                    <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80">
                      Precipitation levels and soil moisture indexes are perfect for Cotton/Rice sowing. Recommended date: June 25th.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-20 bg-white dark:bg-slate-900 border-y border-slate-100 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Sowing Intelligence Built for Farmers
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Combining meteorological sensors and AI classification to decrease crop failures and optimize sowing schedules.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Weather Card */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-4 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-inner">
                <CloudSun className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Hyperlocal Weather</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Village-level geocoded updates powered by Nominatim OSM and OpenWeather forecast algorithms.
              </p>
            </div>

            {/* AI Advisor */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-4 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 shadow-inner">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">AI Sowing Classifier</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Scikit-Learn Random Forest model evaluates custom weather patterns against crop requirements.
              </p>
            </div>

            {/* SMS broadcast */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-4 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-secondary-500/10 flex items-center justify-center text-secondary-500 shadow-inner">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Keypad SMS Alerts</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Keypad farmers receive automated daily warnings and sowing advisors translated to local languages.
              </p>
            </div>

            {/* Regional mapping */}
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 space-y-4 transition-all hover:-translate-y-1">
              <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-500 shadow-inner">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Interactive GIS Maps</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Leaflet visualization engine helps agricultural admins monitor sowing success rates and alerts across villages.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {translate("how_it_works")}
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto">
              Three simple steps to connect and schedule automated sowing protection.
            </p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-1/2 left-10 right-10 h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl shadow-lg shadow-slate-100 dark:shadow-none text-center space-y-4">
                <div className="w-10 h-10 rounded-full bg-primary-500 text-white font-black flex items-center justify-center mx-auto shadow-md">1</div>
                <h4 className="font-extrabold text-lg">Farmer Registration</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Register with your village, crops, and phone type. GPS coordinates are mapped automatically.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl shadow-lg shadow-slate-100 dark:shadow-none text-center space-y-4">
                <div className="w-10 h-10 rounded-full bg-primary-500 text-white font-black flex items-center justify-center mx-auto shadow-md">2</div>
                <h4 className="font-extrabold text-lg">AI Match Calculation</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Every morning at 6 AM, weather forecasts are analyzed against optimal crop thresholds using machine learning.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-3xl shadow-lg shadow-slate-100 dark:shadow-none text-center space-y-4">
                <div className="w-10 h-10 rounded-full bg-primary-500 text-white font-black flex items-center justify-center mx-auto shadow-md">3</div>
                <h4 className="font-extrabold text-lg">Instant Advisory Dispatch</h4>
                <p className="text-sm text-slate-500 leading-relaxed">
                  SMS alerts hit keypad phones, and smartphone dashboards display detailed reports and Leaflet radars.
                </p>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Sprout className="w-6 h-6 text-primary-500" />
            <span className="font-extrabold text-lg text-white">AgriCast</span>
          </div>
          
          <p className="text-xs">
            © {new Date().getFullYear()} AgriCast Project. Built for agricultural extension officers and smart sowing decisions.
          </p>

          <Link
            to="/login?role=admin"
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg transition-all"
          >
            {translate("admin_login_btn")}
          </Link>
        </div>
      </footer>
    </div>
  );
};
export default LandingPage;
