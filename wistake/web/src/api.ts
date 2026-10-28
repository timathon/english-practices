const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8789";

export function getToken(): string | null {
  return localStorage.getItem("wistake_token");
}

export function setToken(token: string | null) {
  if (token) {
    localStorage.setItem("wistake_token", token);
  } else {
    localStorage.removeItem("wistake_token");
  }
}

export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const data = await res.json();
      if (data?.error) errorMsg = data.error;
    } catch {
      // ignore
    }
    throw new Error(errorMsg);
  }

  return res.json();
}
