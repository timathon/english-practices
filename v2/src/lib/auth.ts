import { useState, useEffect } from "react"
import { testdriveRecords } from "./testdriveRecords"
import { syncQueue } from "./syncQueue"

const getBaseURL = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    const hostname = window.location.hostname;
    if (hostname === "epv2.vibequizzing.com" || hostname.endsWith(".pages.dev")) {
        return "https://epapi.vibequizzing.com";
    }
    if (hostname === "127.0.0.1") {
        return "http://127.0.0.1:8787";
    }
    return "http://localhost:8787";
};

export const API_URL = getBaseURL();

// Maximum number of simultaneous logged-in users stored on this device
const MAX_LOGGED_IN_USERS = 3;

// Store a reference to the browser's original fetch
const originalFetch = window.fetch.bind(window);
syncQueue.init(originalFetch, API_URL);

// Custom fetch implementation containing the interceptor logic
const customFetchImpl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
    
    // Check if the current user is test0
    let isTest0 = false;
    try {
        const activeToken = localStorage.getItem('active_session_token');
        const loggedInUsers = JSON.parse(localStorage.getItem('logged_in_users') || '[]');
        const currentUser = loggedInUsers.find((u: any) => u.token === activeToken);
        if (currentUser && currentUser.username === 'test0') {
            isTest0 = true;
        }
    } catch (e) {}

    // Intercept records, mistakes, and pet API for test0
    if (isTest0 && url && (url.includes('/api/records') || url.includes('/api/mistakes') || url.includes('/api/pet'))) {
        const method = init?.method || 'GET';
        if (url.includes('/api/pet')) {
            if (method === 'GET') {
                const stored = localStorage.getItem('test0_pet_state');
                let petState = stored ? JSON.parse(stored) : null;
                
                if (!petState) petState = {};
                if (!petState.achievements) petState.achievements = [];
                if (!petState.unlockedToys) petState.unlockedToys = [];
                if (!petState.level) petState.level = 1;
                if (!petState.exp) petState.exp = 0;
                
                return new Response(JSON.stringify(petState), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            if (method === 'PUT') {
                const body = init?.body as string;
                localStorage.setItem('test0_pet_state', body);
                return new Response(JSON.stringify({ success: true, petState: JSON.parse(body) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
        }
        if (url.includes('/api/mistakes')) {
            if (method === 'GET') {
                return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
            if (method === 'PUT') {
                return new Response(JSON.stringify({ success: true, mistakeState: JSON.parse(init?.body as string) }), { status: 200, headers: { 'Content-Type': 'application/json' } });
            }
        }
        if (method === 'GET') {
            const records = testdriveRecords.getAll();
            return new Response(JSON.stringify(records), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (method === 'POST') {
            const body = JSON.parse(init?.body as string);
            const id = testdriveRecords.save(body);
            return new Response(JSON.stringify({ success: true, id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (method === 'PUT') {
            const body = JSON.parse(init?.body as string);
            const id = url.split('/').pop();
            testdriveRecords.save({ ...body, id });
            return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
    }

    // Only inject token if we have one and we're not hitting sign-in/signup endpoints
    const activeToken = localStorage.getItem('active_session_token');
    const isSignInOrSignUp = url.includes('/api/auth/sign-in') || 
                             url.includes('/api/auth/signup') || 
                             url.includes('/api/auth/sign-up') || 
                             url.includes('/api/setup');

    let newInit = init || {};
    if (activeToken && url && (url.startsWith(API_URL) || url.includes('/api/')) && !isSignInOrSignUp) {
        let headers: Headers;
        if (newInit.headers instanceof Headers) {
            headers = newInit.headers;
        } else if (Array.isArray(newInit.headers)) {
            headers = new Headers(newInit.headers);
        } else {
            headers = new Headers(newInit.headers || {});
        }
        if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${activeToken}`);
        }
        newInit.headers = headers;
    }

    const response = await syncQueue.interceptFetch(input, newInit, originalFetch);

    // Intercept 401 revoked session due to device limit or 403 testdrive limit
    if (response.status === 401 || response.status === 403) {
        try {
            const clone = response.clone();
            const data = await clone.json();
            if (data && (data.reason === 'device_limit' || data.error === 'Session revoked')) {
                const revokedToken = localStorage.getItem('active_session_token');
                localStorage.removeItem('active_session_token');
                
                let loggedInUsers = [];
                try {
                    loggedInUsers = JSON.parse(localStorage.getItem('logged_in_users') || '[]');
                } catch (e) {}
                if (Array.isArray(loggedInUsers)) {
                    loggedInUsers = loggedInUsers.filter((u: any) => u.token !== revokedToken);
                    localStorage.setItem('logged_in_users', JSON.stringify(loggedInUsers));
                }
                
                window.location.href = `${import.meta.env.BASE_URL.slice(0, -1) || ''}/signin?reason=device_limit`;
            } else if (data && data.reason === 'testdrive_limit') {
                window.location.href = `${import.meta.env.BASE_URL.slice(0, -1) || ''}/signin?reason=testdrive_limit`;
            }
        } catch (e) {
            console.error('[Auth Interceptor] Failed to parse 401/403 response:', e);
        }
    }

    // Intercept successful auth actions to cache/sync the user session list
    if (url && response.ok) {
        const isSignInAction = url.includes('/api/auth/sign-in') || url.includes('/api/auth/sign-up');
        const isSessionCheck = url.includes('/api/auth/get-session');
        if (isSignInAction || isSessionCheck) {
            try {
                const clone = response.clone();
                const data = await clone.json();
                const token = data?.token || data?.session?.token || data?.session?.sessionToken;
                if (token && data?.user) {
                    const user = data.user;
                    
                    if (isSignInAction || (isSessionCheck && !window.location.pathname.endsWith('/signin'))) {
                        localStorage.setItem('active_session_token', token);
                    }
                    
                    let loggedInUsers: any[] = [];
                    try {
                        loggedInUsers = JSON.parse(localStorage.getItem('logged_in_users') || '[]');
                    } catch (e) {}
                    if (!Array.isArray(loggedInUsers)) loggedInUsers = [];
                    
                    loggedInUsers = loggedInUsers.filter((u: any) => u.userId !== user.id);
                    loggedInUsers.push({
                        userId: user.id,
                        username: user.username || user.email,
                        name: user.name,
                        role: user.role,
                        token: token
                    });

                    if (loggedInUsers.length > MAX_LOGGED_IN_USERS) {
                        loggedInUsers = loggedInUsers.slice(-MAX_LOGGED_IN_USERS);
                    }

                    localStorage.setItem('logged_in_users', JSON.stringify(loggedInUsers));
                }
            } catch (e) {
                console.error('[Auth Interceptor] Error intercepting auth response:', e);
            }
        }
    }
    return response;
};

// Override window.fetch globally for regular component API requests
window.fetch = customFetchImpl;

// ─── Lightweight State & Client Implementation ──────────────────────────────
interface SessionState {
    data: {
        user: any;
        session: any;
    } | null;
    isPending: boolean;
    error: any;
}

let globalSession: SessionState = {
    data: null,
    isPending: true,
    error: null
};

const listeners = new Set<(state: SessionState) => void>();

function notifyListeners() {
    for (const listener of listeners) {
        listener({ ...globalSession });
    }
}

let sessionFetchPromise: Promise<any> | null = null;

async function fetchSessionDirect(): Promise<{ user: any; session: any } | null> {
    const token = localStorage.getItem('active_session_token');
    if (!token) {
        globalSession = { data: null, isPending: false, error: null };
        notifyListeners();
        return null;
    }

    try {
        const res = await originalFetch(`${API_URL}/api/auth/get-session`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (res.ok) {
            const data = await res.json();
            if (data && data.user) {
                globalSession = {
                    data: {
                        user: data.user,
                        session: data.session || { token, userId: data.user.id }
                    },
                    isPending: false,
                    error: null
                };
                notifyListeners();
                return globalSession.data;
            }
        }
    } catch (e) {
        console.warn('[auth] getSession network error:', e);
    }

    globalSession = { data: null, isPending: false, error: null };
    notifyListeners();
    return null;
}

export function useSession() {
    const [state, setState] = useState<SessionState>(globalSession);

    useEffect(() => {
        listeners.add(setState);

        // Fetch once if still pending and not currently fetching
        if (globalSession.isPending && !sessionFetchPromise) {
            sessionFetchPromise = fetchSessionDirect().finally(() => {
                sessionFetchPromise = null;
            });
        } else if (!globalSession.isPending) {
            setState({ ...globalSession });
        }

        return () => {
            listeners.delete(setState);
        };
    }, []);

    return state;
}

export const authClient = {
    async getSession() {
        if (globalSession.data) {
            return { data: globalSession.data };
        }
        if (sessionFetchPromise) {
            const data = await sessionFetchPromise;
            return { data };
        }
        const data = await fetchSessionDirect();
        return { data };
    },
    multiSession: {
        async setActive({ sessionToken }: { sessionToken: string }) {
            localStorage.setItem('active_session_token', sessionToken);
            globalSession = { data: null, isPending: true, error: null };
            notifyListeners();
            await fetchSessionDirect();
            return { success: true };
        }
    }
};

export const signIn = {
    async username({ username, password, fetchOptions }: { username: string; password: string; fetchOptions?: any }) {
        try {
            const res = await customFetchImpl(`${API_URL}/api/auth/sign-in/username`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (!res.ok) {
                const errMsg = data?.error?.message || data?.error || 'Sign in failed';
                if (fetchOptions?.onError) {
                    fetchOptions.onError({ error: { message: errMsg } });
                }
                return { error: { message: errMsg } };
            }

            globalSession = {
                data: {
                    user: data.user,
                    session: data.session || { token: data.token, userId: data.user.id }
                },
                isPending: false,
                error: null
            };
            notifyListeners();

            if (fetchOptions?.onSuccess) {
                fetchOptions.onSuccess(data);
            }
            return { data };
        } catch (e: any) {
            if (fetchOptions?.onError) {
                fetchOptions.onError({ error: { message: e.message } });
            }
            return { error: { message: e.message } };
        }
    },
    async email({ email, password, fetchOptions }: { email: string; password: string; fetchOptions?: any }) {
        try {
            const res = await customFetchImpl(`${API_URL}/api/auth/sign-in/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (!res.ok) {
                const errMsg = data?.error?.message || data?.error || 'Sign in failed';
                if (fetchOptions?.onError) {
                    fetchOptions.onError({ error: { message: errMsg } });
                }
                return { error: { message: errMsg } };
            }

            globalSession = {
                data: {
                    user: data.user,
                    session: data.session || { token: data.token, userId: data.user.id }
                },
                isPending: false,
                error: null
            };
            notifyListeners();

            if (fetchOptions?.onSuccess) {
                fetchOptions.onSuccess(data);
            }
            return { data };
        } catch (e: any) {
            if (fetchOptions?.onError) {
                fetchOptions.onError({ error: { message: e.message } });
            }
            return { error: { message: e.message } };
        }
    }
};

export async function signOut() {
    try {
        await customFetchImpl(`${API_URL}/api/auth/sign-out`, { method: 'POST' });
    } catch (e) {
        console.warn('Sign out call failed:', e);
    }
    localStorage.removeItem('active_session_token');
    globalSession = { data: null, isPending: false, error: null };
    notifyListeners();
}

export const signUp = {
    async email({ name, email, password, fetchOptions }: { name: string; email: string; password: string; fetchOptions?: any }) {
        try {
            const res = await customFetchImpl(`${API_URL}/api/auth/sign-up/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            const data = await res.json();
            if (!res.ok) {
                const errMsg = data?.error?.message || data?.error || 'Sign up failed';
                if (fetchOptions?.onError) {
                    fetchOptions.onError({ error: { message: errMsg } });
                }
                return { error: { message: errMsg } };
            }

            globalSession = {
                data: {
                    user: data.user,
                    session: data.session || { token: data.token, userId: data.user.id }
                },
                isPending: false,
                error: null
            };
            notifyListeners();

            if (fetchOptions?.onSuccess) {
                fetchOptions.onSuccess(data);
            }
            return { data };
        } catch (e: any) {
            if (fetchOptions?.onError) {
                fetchOptions.onError({ error: { message: e.message } });
            }
            return { error: { message: e.message } };
        }
    }
};
