import { createAuthClient } from "better-auth/react"
import { usernameClient } from "better-auth/client/plugins"

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

export const authClient = createAuthClient({
    baseURL: API_URL,
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
        usernameClient()
    ]
})

export const { useSession, signIn, signOut, signUp } = authClient
