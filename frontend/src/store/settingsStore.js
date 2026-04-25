import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import i18n from '../i18n/index.js';

// Class-only theme toggle — never set --bg inline so CSS vars always win
function applyThemeClass(theme) {
  document.documentElement.style.removeProperty('--bg');
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('cream');
  } else {
    document.documentElement.classList.add('cream');
    document.documentElement.classList.remove('dark');
  }
}

function applyAccentHue(hue) {
  document.documentElement.style.setProperty('--accent', `hsl(${hue}, 55%, 30%)`);
  document.documentElement.style.setProperty('--accent-hover', `hsl(${hue}, 55%, 24%)`);
}

function applySidebarColor(color) {
  document.documentElement.style.setProperty('--sidebar-bg', color);
}

function applyFontSize(size) {
  document.documentElement.style.fontSize = `${size}px`;
}

function applyLanguage(lang) {
  const l = lang === 'bi' ? 'ar' : lang;
  i18n.changeLanguage(l);
  document.documentElement.lang = l;
  document.documentElement.dir = 'rtl'; // always RTL — layout positioning handled by flex container
}

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      theme: 'cream',
      bgColor: null,
      accentHue: 30,
      sidebarColor: '#e8e0cc',
      density: 'normal',
      fontSize: 15,
      language: 'ar',
      numberFormat: 'western',
      showClock: true,
      rowHover: true,
      sidebarCollapsible: true,
      sidebarWidth: 240,

      setTheme: (theme) => {
        set({ theme });
        applyThemeClass(theme);
      },
      setAccentHue: (hue) => {
        set({ accentHue: hue });
        applyAccentHue(hue);
      },
      setSidebarColor: (color) => {
        set({ sidebarColor: color });
        applySidebarColor(color);
      },
      setDensity: (density) => set({ density }),
      setFontSize: (size) => {
        set({ fontSize: size });
        applyFontSize(size);
      },
      setLanguage: (lang) => {
        set({ language: lang });
        applyLanguage(lang);
      },
      setNumberFormat: (format) => set({ numberFormat: format }),
      toggleShowClock: () => set((s) => ({ showClock: !s.showClock })),
      toggleRowHover: () => set((s) => ({ rowHover: !s.rowHover })),
      toggleSidebarCollapsible: () => set((s) => ({ sidebarCollapsible: !s.sidebarCollapsible })),
      setSidebarWidth: (width) => set({ sidebarWidth: width }),

      initialize: () => {
        const s = get();
        applyThemeClass(s.theme);
        applyAccentHue(s.accentHue);
        applySidebarColor(s.sidebarColor);
        applyFontSize(s.fontSize);
        applyLanguage(s.language);
      },
    }),
    {
      name: 'rahhal-settings',
    },
  ),
);
