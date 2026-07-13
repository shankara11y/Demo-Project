import React, { useContext } from "react";
import { AppContext } from "../context/AppContext";
import { Globe } from "lucide-react";

export const LanguageSelector = () => {
  const { language, setLanguage, translate } = useContext(AppContext);

  return (
    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
      <Globe className="w-4 h-4 text-primary-500" />
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">
        {translate("language")}:
      </span>
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="bg-transparent text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
      >
        <option value="en" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
          English
        </option>
        <option value="hi" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
          हिन्दी
        </option>
        <option value="mr" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
          मराठी
        </option>
      </select>
    </div>
  );
};
export default LanguageSelector;
