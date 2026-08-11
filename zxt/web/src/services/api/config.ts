export const API_BASE_URL = 'https://zxtapi.vibequizzing.com';
export const USE_BACKEND = true; // Set to true when remote worker API is running

export function parseDate(timeStr?: string): Date | null {
  if (!timeStr) return null;
  let dateStr = timeStr.trim();
  if (dateStr.includes('/')) {
    dateStr = dateStr.replace(/\//g, '-');
  }
  if (!dateStr.includes('Z') && !dateStr.includes('+')) {
    const parts = dateStr.split(' ');
    if (parts.length === 2) {
      const [dPart, tPart] = parts;
      const dSub = dPart.split('-').map(p => p.padStart(2, '0')).join('-');
      dateStr = `${dSub}T${tPart}`;
    }
  }
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

export function formatLocalTime(timeStr?: string): string {
  if (!timeStr) return '';
  try {
    const d = parseDate(timeStr);
    if (d) {
      return d.toLocaleString('zh-CN', { hour12: false });
    }
  } catch (_) {}
  return timeStr;
}

let currentToken: string | null = localStorage.getItem('zxt_token');

export function getAuthToken(): string | null {
  return currentToken || localStorage.getItem('zxt_token');
}

export function setAuthToken(token: string | null) {
  currentToken = token;
  if (token) {
    localStorage.setItem('zxt_token', token);
  } else {
    localStorage.removeItem('zxt_token');
  }
}

export function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}
