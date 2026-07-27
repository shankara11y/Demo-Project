import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import LanguageSelector from "../components/LanguageSelector";
import axios from "axios";
import { Sprout, Phone, Lock, Mail, Eye, EyeOff, ArrowLeft } from "lucide-react";

export const LoginPage = () => {
  const { login, API_URL, translate } = useContext(AppContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAdminParam = searchParams.get("role") === "admin";
  
  const [isAdmin, setIsAdmin] = useState(isAdminParam);
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Sync parameter updates
  useEffect(() => {
    setIsAdmin(searchParams.get("role") === "admin");
    setError("");
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const endpoint = isAdmin ? "/admin/login" : "/login";
      const payload = isAdmin 
        ? { email, password } 
        : { mobile, password };

      const response = await axios.post(`${API_URL}${endpoint}`, payload);
      const { token, user, admin } = response.data;
      
      if (isAdmin) {
        login(token, admin);
        navigate("/admin/dashboard");
      } else {
        login(token, user);
        navigate("/farmer/dashboard");
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || translate("login_fail_msg") || "Login authentication failed. Check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-300 relative">
      
      {/* Top Controls: Back button left, Language Selector right */}
      <div className="absolute top-4 left-4 z-10">
        <Link 
          to="/" 
          className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> {translate("home") || "Home"}
        </Link>
      </div>

      <div className="absolute top-4 right-4 z-10">
        <LanguageSelector />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-primary-500 text-white p-3 rounded-2xl shadow-lg shadow-primary-500/20">
            <Sprout className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white">
          {isAdmin ? translate("admin_portal_title") : translate("login_portal_title")}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Or{" "}
          <button 
            onClick={() => {
              setError("");
              setIsAdmin(!isAdmin);
              navigate(isAdmin ? "/login" : "/login?role=admin");
            }}
            className="font-bold text-primary-500 hover:text-primary-600 focus:outline-none"
          >
            {isAdmin ? translate("access_farmer_portal") : translate("access_admin_portal")}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-8 px-4 border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl sm:px-10">
          
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-bold">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {isAdmin ? (
              // Admin Field (Email)
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {translate("email_address") || "Email Address"}
                </label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-5 h-5" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@agricast.gov.in"
                    className="block w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent placeholder-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            ) : (
              // Farmer Field (Mobile)
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {translate("mobile_number") || "Mobile Number"}
                </label>
                <div className="relative rounded-2xl shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone className="h-5 h-5" />
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
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                {translate("password") || "Password"}
              </label>
              <div className="relative rounded-2xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 h-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-10 pr-10 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent placeholder-slate-400 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 rounded-2xl border border-transparent shadow-lg text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 shadow-primary-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (translate("authenticating") || "Authenticating...") : (translate("sign_in") || "Sign In")}
              </button>
            </div>
          </form>

          {!isAdmin && (
            <div className="mt-6 text-center">
              <span className="text-sm text-slate-500">{translate("new_to_agricast") || "New to AgriCast?"} </span>
              <Link to="/register" className="text-sm font-bold text-primary-500 hover:text-primary-600">
                {translate("register_farm_now") || "Register Farm Now"}
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
export default LoginPage;
