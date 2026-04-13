import { createAuthClient } from "better-auth/react"
import { usernameClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
    // Hardcoded for now. In production, use env vars to set API URL
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:8787",
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
