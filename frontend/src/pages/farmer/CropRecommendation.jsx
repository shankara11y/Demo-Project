import React, { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AppContext } from "../../context/AppContext";
import axios from "axios";
import { 
  Sprout, ArrowLeft, Download, RefreshCw, CheckCircle, 
  AlertTriangle, XCircle, Info, Calendar, Sparkles
} from "lucide-react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

export const CropRecommendation = () => {
  const { token, API_URL, translate, translateCrop } = useContext(AppContext);
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [crops, setCrops] = useState([]);
  const [selectedCropId, setSelectedCropId] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);

  // Fetch Crops & History
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    const initData = async () => {
      try {
        const cropsRes = await axios.get(`${API_URL}/crops`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCrops(cropsRes.data);
        if (cropsRes.data.length > 0) {
          setSelectedCropId(cropsRes.data[0].id);
        }

        const historyRes = await axios.get(`${API_URL}/history`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setHistory(historyRes.data);
      } catch (err) {
        console.error(err);
        setError(t("error_crop_templates"));
      }
    };

    initData();
  }, [token]);

  const generateAdvisory = async () => {
    if (!selectedCropId) return;
    setAnalyzing(true);
    setError("");
    setResult(null);

    try {
      const response = await axios.post(
        `${API_URL}/recommend`,
        { crop_id: selectedCropId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const recResult = response.data;
      setResult(recResult);

      // Trigger Confetti on "Suitable" sowing match
      if (recResult.suitability === "Suitable") {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#2d6a4f", "#52b788", "#74c69d", "#bae6fd"]
        });
      }

      // Refresh History list
      const historyRes = await axios.get(`${API_URL}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(historyRes.data);

    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || t("advisory_failed_try_again"));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300 pb-12 print:bg-white print:text-black">
      
      {/* Header */}
      <header className="glass-panel sticky top-0 z-40 border-b border-slate-200 dark:border-slate-800 shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link 
            to="/farmer/dashboard" 
            className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> {t("dashboard")}
          </Link>
          <h2 className="font-extrabold text-base bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent">
            {t("app_title")} {t("ai_advisor")}
          </h2>
          <div className="w-16"></div> {/* Spacer */}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        
        {/* Sowing Setup Selection Panel */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-md print:hidden">
          <h1 className="text-xl font-extrabold mb-4 flex items-center gap-1.5 text-slate-800 dark:text-white">
            <Sparkles className="w-5 h-5 text-primary-500" />
            {t("select_crop_prompt")}
          </h1>

          {error && (
            <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm font-bold">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-slate-400 mb-1">{t("target_crop")}</label>
              <select
                value={selectedCropId}
                onChange={(e) => setSelectedCropId(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-transparent text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {crops.map((c) => (
                  <option key={c.id} value={c.id} className="bg-white dark:bg-slate-900">
                    {translateCrop(c.name)} ({c.season} {t("crop")})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={generateAdvisory}
              disabled={analyzing || !selectedCropId}
              className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white font-bold text-sm shadow-lg shadow-primary-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  {t("loading")}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {t("generate_rec")}
                </>
              )}
            </button>
          </div>
        </section>

        {/* AI Sowing Advisor Outputs */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl space-y-6 relative overflow-hidden print:border-none print:shadow-none print:p-0"
            >
              {/* Printable header */}
              <div className="hidden print:flex items-center justify-between border-b pb-4 mb-6">
                <div>
                  <h1 className="text-xl font-bold text-emerald-800">{t("sowing_advisory_report")}</h1>
                  <p className="text-xs text-slate-500">{t("generated_on")}: {new Date(result.timestamp).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <h2 className="font-extrabold text-sm text-slate-800">{t("crop")}: {result.crop_name}</h2>
                  <p className="text-xs text-slate-500">{t("status")}: {result.suitability === "Suitable" ? t("suitable") : result.suitability === "Moderately Suitable" ? t("moderately_suitable") : t("not_suitable")}</p>
                </div>
              </div>

              {/* Status Header */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-full shrink-0 ${
                    result.suitability === "Suitable" 
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" 
                      : result.suitability === "Moderately Suitable"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  }`}>
                    {result.suitability === "Suitable" ? (
                      <CheckCircle className="w-10 h-10" />
                    ) : result.suitability === "Moderately Suitable" ? (
                      <AlertTriangle className="w-10 h-10" />
                    ) : (
                      <XCircle className="w-10 h-10" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("suitability")}</p>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                      {result.crop_name} – {result.suitability === "Suitable" ? t("suitable") : result.suitability === "Moderately Suitable" ? t("moderately_suitable") : t("not_suitable")}
                    </h2>
                  </div>
                </div>

                <div className="text-left sm:text-right bg-slate-50 dark:bg-slate-800 px-5 py-3 rounded-2xl shrink-0">
                  <p className="text-xs text-slate-400 font-bold">{t("confidence")}</p>
                  <p className="text-xl font-black text-slate-800 dark:text-white">{result.confidence}% {t("match")}</p>
                </div>
              </div>

              {/* Sowing Calendars */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">{t("sowing_window")}</h4>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">{result.recommended_date}</p>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/10 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-extrabold text-rose-700 dark:text-rose-400">{t("avoid_window")}</h4>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1">{result.avoid_date}</p>
                  </div>
                </div>
              </div>

              {/* Explanatory Reasons */}
              <div className="space-y-3">
                <h3 className="text-sm font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <Info className="w-4 h-4" /> {t("reasons_header")}
                </h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.reasons.map((reason, index) => (
                    <li 
                      key={index}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800 flex items-center gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0"></span>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Print / Action panels */}
              <div className="flex justify-between items-center pt-6 border-t border-slate-100 dark:border-slate-800 print:hidden">
                <span className="text-xs text-slate-400">{t("rec_disclaimer")}</span>
                <button
                  onClick={handleDownloadPDF}
                  className="px-5 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-xs text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-4 h-4" /> {t("pdf_download")}
                </button>
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Sowing History Logs */}
        <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-md print:hidden">
          <h3 className="font-extrabold text-slate-500 text-sm uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <Calendar className="w-5 h-5" /> {t("previous_recommendations")}
          </h3>

          {history.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">
              {t("no_previous_advisories")}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                    <th className="pb-3">{t("crop_name")}</th>
                    <th className="pb-3">{t("analysis_date")}</th>
                    <th className="pb-3">{t("suitability")}</th>
                    <th className="pb-3">{t("confidence")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {history.slice(0, 8).map((h, i) => (
                    <tr key={i} className="text-slate-600 dark:text-slate-300">
                      <td className="py-3 font-bold">{h.crop_name}</td>
                      <td className="py-3">{new Date(h.timestamp).toLocaleDateString()}</td>
                      <td className="py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-2xs ${
                          h.suitability === "Suitable"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : h.suitability === "Moderately Suitable"
                            ? "bg-amber-500/10 text-amber-600"
                            : "bg-rose-500/10 text-rose-600"
                        }`}>
                          {h.suitability === "Suitable" ? t("suitable") : h.suitability === "Moderately Suitable" ? t("moderately_suitable") : t("not_suitable")}
                        </span>
                      </td>
                      <td className="py-3 font-bold">{h.confidence}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>
    </div>
  );
};
export default CropRecommendation;
