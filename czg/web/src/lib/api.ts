const API_BASE = "/api";

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "请求失败");
  }
  return data;
}

export const api = {
  // Auth
  register: (body: { username: string; password: string; displayName?: string }) =>
    apiRequest("/auth/register", { method: "POST", body: JSON.stringify(body) }),

  login: (body: { username: string; password: string }) =>
    apiRequest("/auth/login", { method: "POST", body: JSON.stringify(body) }),

  getMe: (token: string) =>
    apiRequest("/auth/me", { method: "GET" }, token),

  // Mastery Progress
  getProgress: (token: string, textbook: string = "M7A-BS") =>
    apiRequest(`/progress?textbook=${encodeURIComponent(textbook)}`, { method: "GET" }, token),

  // Submit Diagnosis
  submitDiagnosis: (
    token: string,
    payload: {
      textbookId: string;
      chapter: string;
      sectionNumber: string;
      targetTopicId: string;
      status: string;
      rootCauses: string[];
      history: any[];
      masteryUpdates?: { topicId: string; level: string }[];
    }
  ) =>
    apiRequest("/diagnose/submit", { method: "POST", body: JSON.stringify(payload) }, token),

  // History
  getHistory: (token: string, textbook: string = "M7A-BS", section?: string) => {
    let url = `/diagnose/history?textbook=${encodeURIComponent(textbook)}`;
    if (section) url += `&section=${encodeURIComponent(section)}`;
    return apiRequest(url, { method: "GET" }, token);
  },

  // Admin APIs
  adminGetUsers: (token: string) =>
    apiRequest("/admin/users", { method: "GET" }, token),

  adminCreateUser: (token: string, body: { username: string; password: string; displayName?: string; role?: string; allowedTextbooks?: string[] }) =>
    apiRequest("/admin/users", { method: "POST", body: JSON.stringify(body) }, token),

  adminUpdateAccess: (token: string, id: string, body: { displayName?: string; role?: string; allowedTextbooks?: string[]; status?: string }) =>
    apiRequest(`/admin/users/${id}/access`, { method: "PUT", body: JSON.stringify(body) }, token),

  adminResetPassword: (token: string, id: string, password: string) =>
    apiRequest(`/admin/users/${id}/password`, { method: "PUT", body: JSON.stringify({ password }) }, token),

  adminDeleteUser: (token: string, id: string) =>
    apiRequest(`/admin/users/${id}`, { method: "DELETE" }, token)
};
