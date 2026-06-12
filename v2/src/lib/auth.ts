import { createAuthClient } from "better-auth/react"
import { usernameClient, multiSessionClient } from "better-auth/client/plugins"

const getBaseURL = () => {
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // Dynamically match local hostnames (127.0.0.1 vs localhost) to avoid cross-site cookie restrictions
    const hostname = window.location.hostname;
    if (hostname === "127.0.0.1") {
        return "http://127.0.0.1:8787";
    }
    return "http://localhost:8787";
};

export const API_URL = getBaseURL();

// Maximum number of simultaneous logged-in users stored on this device
const MAX_LOGGED_IN_USERS = 3;

// Store a reference to the browser's original fetch
const originalFetch = window.fetch;

// Custom fetch implementation containing the interceptor logic
const customFetchImpl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : input.url);
    
    // Only inject token if we have one and we're not hitting sign-in/signup endpoints
    const activeToken = localStorage.getItem('active_session_token');
    const isSignInOrSignUp = url.includes('/api/auth/sign-in') || url.includes('/api/auth/signup') || url.includes('/api/auth/sign-up') || url.includes('/api/setup');
    
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

    const response = await originalFetch(input, newInit);

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
                    
                    // Only auto-set active token on explicit sign-in/sign-up,
                    // NOT on passive session checks (which fire on page reload
                    // and would restore the old user's token during add-new flow).
                    if (isSignInAction) {
                        localStorage.setItem('active_session_token', token);
                    }
                    
                    let loggedInUsers: any[] = [];
                    try {
                        loggedInUsers = JSON.parse(localStorage.getItem('logged_in_users') || '[]');
                    } catch (e) {}
                    if (!Array.isArray(loggedInUsers)) loggedInUsers = [];
                    
                    // Filter out duplicate entries for the same user
                    loggedInUsers = loggedInUsers.filter((u: any) => u.userId !== user.id);
                    loggedInUsers.push({
                        userId: user.id,
                        username: user.username || user.email,
                        name: user.name,
                        role: user.role,
                        token: token
                    });

                    // Enforce max users: keep only the most recent entries
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

// ── Auth client ──
export const authClient = createAuthClient({
    baseURL: API_URL,
    fetchOptions: {
        customFetchImpl: customFetchImpl
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                defaultValue: "user"
            },
            textbooks: {
                type: "string[]",
                defaultValue: []
            }
        }
    },
    plugins: [
        usernameClient(),
        multiSessionClient()
    ]
})

export const { useSession, signIn, signOut, signUp } = authClient
