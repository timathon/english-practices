import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema";

export const getAuth = (dbBinding: D1Database, secret?: string, baseURL?: string) => {
    return betterAuth({
        secret,
        baseURL: baseURL || "https://epapi.vibequizzing.com",
        trustedOrigins: ["http://localhost:5173", "http://127.0.0.1:5173", "https://timathon.github.io", "https://epv2.vibequizzing.com", "http://epv2.vibequizzing.com"],
        database: drizzleAdapter(drizzle(dbBinding), {
            provider: "sqlite",
            schema: {
                ...schema,
                user: schema.user,
                session: schema.session,
                account: schema.account,
                verification: schema.verification
            }
        }),
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
            username()
        ],
        emailAndPassword: {
            enabled: true,
            minPasswordLength: 6,
            password: {
                hashOptions: {
                    memoryCost: 512,
                    iterations: 1
                }
            }
        }
    });
};
