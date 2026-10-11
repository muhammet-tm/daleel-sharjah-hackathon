// Boots the 3D screen with the visitor's Daleel reading settings (language, theme, text size, calm, reduced motion).
import { t, setLang, getLang } from "../i18n.js";

const store = {
  get(k, d) { try { const v = localStorage.getItem("daleel:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("daleel:" + k, JSON.stringify(v)); } catch { /* private mode */ } },
};
const $ = (s) => document.querySelector(s);
const prefs = Object.assign({ lang: "en", scale: 100, theme: "auto", calm: false, still: false }, store.get("prefs", {}));

function applyPrefs() {
  const root = document.documentElement;
  setLang(prefs.lang);
  root.lang = prefs.lang; root.dir = prefs.lang === "ar" ? "rtl" : "ltr";
  root.style.setProperty("--scale", prefs.scale / 100);
  if (prefs.theme === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", prefs.theme);
  root.classList.toggle("calm", prefs.calm);
  root.classList.toggle("still", prefs.still || prefs.calm);
  document.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll("[data-i18n-aria]").forEach((el) => el.setAttribute("aria-label", t(el.dataset.i18nAria)));
  const lb = $("#lang-btn");
  lb.textContent = prefs.lang === "en" ? "العربية" : "English"; lb.lang = prefs.lang === "en" ? "ar" : "en";
}

window.S3.i18n = { t, getLang };
applyPrefs();

$("#lang-btn").addEventListener("click", () => {
  prefs.lang = prefs.lang === "en" ? "ar" : "en";
  store.set("prefs", Object.assign(store.get("prefs", {}), { lang: prefs.lang }));
  applyPrefs();
  window.S3.relabel?.();
});
// "Back to the plate" opens the plate of the place being shown
$("#back3d").addEventListener("click", (e) => { const id = e.currentTarget.dataset.site; if (id) store.set("selected", id); });

if (window.S3.failed) {
  $("#loader p").textContent = t(window.S3.failed === "webgl" ? "noWebgl3d" : "engineFail3d");
} else {
  try { window.S3.start(); } catch { $("#loader p").textContent = t("noWebgl3d"); }
}
