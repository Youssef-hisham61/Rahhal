import { useTranslation } from 'react-i18next';
import { useSettingsStore } from '../store/settingsStore';

export function useT() {
  const { t, i18n } = useTranslation();
  const language = useSettingsStore(s => s.language);

  return (key) => {
    if (language === 'bi') {
      const ar = i18n.getFixedT('ar')(key);
      const en = i18n.getFixedT('en')(key);
      if (ar === en) return ar;
      return `${ar} / ${en}`;
    }
    return t(key);
  };
}
