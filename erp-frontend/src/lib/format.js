// Utilities for currency handling (Option 2: masked input with Intl formatting)
export function digitsFromString(str) {
  if (!str && str !== "") return "";
  return String(str).replace(/\D/g, "");
}

// format digits like '123' -> '1,23' using Intl
export function formatFromDigits(digits, locale = 'pt-BR', currency = 'BRL') {
  const intVal = digits === '' ? 0 : parseInt(digits, 10);
  const value = intVal / 100;
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
}

// parse digits buffer into number (float)
export function numberFromDigits(digits) {
  if (digits === '') return 0;
  return parseInt(digits, 10) / 100;
}

// helper to convert existing numeric/string values into digits buffer
export function digitsFromValue(value) {
  if (value === null || value === undefined) return '';
  // If already a number, convert to cents
  if (typeof value === 'number') {
    return String(Math.round(value * 100));
  }
  // Try to parse strings like '123.45' or '1.234,56' or formatted currency
  const cleaned = String(value).replace(/[^0-9\-]/g, '');
  if (!cleaned) return '';
  return cleaned;
}

export const defaultLocale = 'pt-BR';
export const defaultCurrency = 'BRL';
