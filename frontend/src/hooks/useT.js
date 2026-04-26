import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store/settingsStore';

export function useT() {
  const { t, i18n } = useTranslation();
  const language = useSettingsStore(s => s.language);

  return (key, params) => {
    if (language === 'bi') {
      const ar = i18n.getFixedT('ar')(key, params);
      const en = i18n.getFixedT('en')(key, params);
      if (ar === en) return ar;
      return `${ar} / ${en}`;
    }
    return t(key, params);
  };
}
