import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import LanguageSelector from "../components/LanguageSelector";
import { 
  Sun, Moon, CloudSun, BrainCircuit, MessageSquare, MapPin, 
  ChevronRight, Sprout, ShieldCheck, Sparkles, CheckCircle2 
} from "lucide-react";

export const LandingPage = () => {
  const { darkMode, toggleDarkMode, translate } = useContext(AppContext);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* Navigation */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-200/80 dark:border-slate-800/80 shadow-sm backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-gradient-to-tr from-primary-600 to-primary-400 text-white p-2 rounded-xl shadow-md shadow-primary-500/20 transform hover:rotate-6 transition-all duration-300">
              <Sprout className="w-6 h-6 animate-pulse" />
            </div>
            <span className="font-black text-xl tracking-tight bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 bg-clip-text text-transparent">
              AgriCast
            </span>
          </div>

          <div className="flex items-center gap-4">
            <LanguageSelector />
            
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-full hover:bg-slate-200/80 dark:hover:bg-slate-800/80 transition-colors"
              aria-label="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>

            <Link
              to="/login"
              className="hidden sm:inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-primary-500 transition-colors"
            >
              {translate("login")}
            </Link>

            <Link
              to="/register"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-sm font-bold shadow-md shadow-primary-500/25 hover:shadow-lg hover:shadow-primary-500/35 transition-all duration-300 transform hover:scale-105"
            >
              {translate("get_started")}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32 bg-gradient-to-b from-primary-500/10 via-primary-500/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            {/* Left Col */}
            <div className="space-y-6 text-center lg:text-left animate-slide-up">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/25 text-primary-600 dark:text-primary-400 text-xs font-bold uppercase tracking-wider shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-primary-500 animate-spin" style={{ animationDuration: '4s' }} />
                Precision AgTech
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-slate-900 dark:text-white">
                {translate("hero_title")}
              </h1>
              
              <p className="text-base sm:text-lg lg:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                {translate("hero_subtitle")}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-2">
                <Link
                  to="/register"
                  className="px-8 py-3.5 rounded-full bg-primary-500 hover:bg-primary-600 text-white font-bold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-102"
                >
                  Register as Farmer <ChevronRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/login"
                  className="px-8 py-3.5 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-white font-bold border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 flex items-center justify-center hover:border-slate-300"
                >
                  Farmer Login
                </Link>
              </div>

              <div className="pt-4 flex items-center justify-center lg:justify-start gap-6 text-xs font-bold text-slate-500">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Free Registration</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Multilingual Support</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Keypad SMS & Web</span>
              </div>
            </div>

            {/* Right Col */}
            <div className="relative flex justify-center items-center">
              <div className="absolute w-80 h-80 bg-primary-500/20 dark:bg-primary-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
              
              {/* Live Advisory Telemetry Widget */}
              <div className="w-full max-w-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/90 dark:border-slate-800/90 shadow-2xl rounded-3xl p-6 relative overflow-hidden transition-all duration-300 hover:scale-102 hover:shadow-primary-500/10">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 dark:border-slate-800/80 pb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                      <CloudSun className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-800 dark:text-white">Solapur, Maharashtra</h4>
                      <p className="text-2xs text-slate-400 font-semibold">Current Forecast: Kharif Season</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 text-2xs font-extrabold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                    Live Telemetry
                  </span>
                </div>

                <div className="space-y-3.5">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 flex justify-between items-center border border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-500">Temperature</span>
                    <span className="font-extrabold text-sm text-slate-800 dark:text-white">28.4 °C</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 flex justify-between items-center border border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-500">Rain Probability</span>
                    <span className="font-extrabold text-sm text-primary-500">85% (Next 24h)</span>
                  </div>
                  
                  {/* Sowing Advice Indicator */}
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" /> Optimal Sowing Window
                      </span>
                      <span className="text-2xs font-black text-emerald-600 bg-emerald-500/20 px-2 py-0.5 rounded-full">91% Match</span>
                    </div>
                    <p className="text-xs text-emerald-800/80 dark:text-emerald-400/80 leading-relaxed">
                      Precipitation levels and soil moisture indexes are perfect for Cotton/Rice sowing. Recommended window: June 25th.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-20 bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800/80 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-16">
            <span className="text-xs font-extrabold text-primary-500 uppercase tracking-widest">Platform Features</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
              Sowing Intelligence Built for Farmers
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm">
              Combining meteorological sensors, soil telemetry, and AI classification to prevent crop failure and maximize yield.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            
            {/* Weather Card */}
            <div className="p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-4 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-amber-500/30">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-inner">
                <CloudSun className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Hyperlocal Weather</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Village-level geocoded updates powered by Nominatim OSM and OpenWeather forecast algorithms.
              </p>
            </div>

            {/* AI Advisor */}
            <div className="p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-4 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-primary-500/30">
              <div className="w-12 h-12 rounded-2xl bg-primary-500/10 flex items-center justify-center text-primary-500 shadow-inner">
                <BrainCircuit className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">AI Sowing Classifier</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Scikit-Learn Random Forest model evaluates custom weather patterns against crop requirements.
              </p>
            </div>

            {/* SMS broadcast */}
            <div className="p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-4 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-secondary-500/30">
              <div className="w-12 h-12 rounded-2xl bg-secondary-500/10 flex items-center justify-center text-secondary-500 shadow-inner">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Keypad SMS Alerts</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Keypad farmers receive automated daily warnings and sowing advisors translated to local languages.
              </p>
            </div>

            {/* Regional mapping */}
            <div className="p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 space-y-4 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:border-sky-500/30">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-500 shadow-inner">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold">Interactive GIS Maps</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Leaflet visualization engine helps agricultural admins monitor sowing success rates and alerts across villages.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-20 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-16">
            <span className="text-xs font-extrabold text-primary-500 uppercase tracking-widest">Simple Workflow</span>
            <h2 className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {translate("how_it_works")}
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm">
              Three simple steps to connect and schedule automated sowing protection.
            </p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-1/2 left-10 right-10 h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0"></div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
              
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-8 rounded-3xl shadow-lg shadow-slate-100 dark:shadow-none text-center space-y-4 hover:border-primary-500/30 transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-primary-500 text-white font-black text-lg flex items-center justify-center mx-auto shadow-md shadow-primary-500/20">1</div>
                <h4 className="font-extrabold text-lg">Farmer Registration</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Register with your village, preferred crops, and phone type. GPS coordinates are mapped automatically.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-8 rounded-3xl shadow-lg shadow-slate-100 dark:shadow-none text-center space-y-4 hover:border-primary-500/30 transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-primary-500 text-white font-black text-lg flex items-center justify-center mx-auto shadow-md shadow-primary-500/20">2</div>
                <h4 className="font-extrabold text-lg">AI Match Calculation</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Every morning at 6 AM, weather forecasts are analyzed against optimal crop thresholds using machine learning.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-8 rounded-3xl shadow-lg shadow-slate-100 dark:shadow-none text-center space-y-4 hover:border-primary-500/30 transition-all duration-300">
                <div className="w-12 h-12 rounded-2xl bg-primary-500 text-white font-black text-lg flex items-center justify-center mx-auto shadow-md shadow-primary-500/20">3</div>
                <h4 className="font-extrabold text-lg">Instant Advisory Dispatch</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
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
          
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} AgriCast Project. Built for agricultural extension officers and smart sowing decisions.
          </p>

          <Link
            to="/login?role=admin"
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-lg transition-all border border-slate-700/60"
          >
            {translate("admin_login_btn")}
          </Link>
        </div>
      </footer>
    </div>
  );
};
export default LandingPage;
