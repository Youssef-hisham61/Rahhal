import { useSettingsStore } from '../store/settingsStore';

const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function formatNumber(n, format) {
  const str = String(n);
  if (format === 'arabic') {
    return str.replace(/[0-9]/g, (d) => arabicDigits[parseInt(d)]);
  }
  return str;
}

export function useFormatNumber() {
  const { numberFormat } = useSettingsStore();
  return (n) => formatNumber(n, numberFormat);
}
