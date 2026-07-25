import React, { useContext } from "react";
import { useTranslation } from "react-i18next";
import { AppContext } from "../context/AppContext";
import { Globe } from "lucide-react";

export const LanguageSelector = () => {
  const { language, changeLanguage } = useContext(AppContext);
  const { t } = useTranslation();

  const handleLangChange = (e) => {
    const selected = e.target.value;
    changeLanguage(selected);
  };

  return (
    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 shadow-xs">
      <Globe className="w-4 h-4 text-primary-500 shrink-0" />
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">
        {t("select_language")}:
      </span>
      <select
        value={language}
        onChange={handleLangChange}
        className="bg-transparent text-xs font-extrabold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
      >
        <option value="en" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
          English
        </option>
        <option value="hi" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
          हिंदी
        </option>
        <option value="mr" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
          मराठी
        </option>
      </select>
    </div>
  );
};
export default LanguageSelector;
