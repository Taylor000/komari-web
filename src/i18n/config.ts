import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import zhCN from "./locales/zh_CN.json";

void i18next.use(initReactI18next).init({
  lng: "zh-CN",
  fallbackLng: "zh-CN",
  supportedLngs: ["zh-CN"],
  resources: {
    "zh-CN": {
      translation: zhCN,
    },
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18next;
