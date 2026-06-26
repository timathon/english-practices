import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username, bearer, multiSession } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import crypto from "node:crypto";
import * as schema from "./db/schema";

export const getAuth = (dbBinding: D1Database, secret?: string, baseURL?: string) => {
    return betterAuth({
        secret: secret || "dev_secret_1234567890",
        baseURL: baseURL || "http://localhost:8787",
        trustedOrigins: [
            "http://localhost:5173", "http://127.0.0.1:5173",
            "http://localhost:5174", "http://127.0.0.1:5174",
            "http://localhost:5175", "http://127.0.0.1:5175",
            "http://localhost:5176", "http://127.0.0.1:5176",
            "http://localhost:3000", "http://127.0.0.1:3000",
            "https://timathon.github.io", "https://epv2.vibequizzing.com", "http://epv2.vibequizzing.com"
        ],
        database: drizzleAdapter(drizzle(dbBinding), {
            provider: "sqlite",
            schema: {
                user: schema.user,
                session: schema.session,
                account: schema.account,
                verification: schema.verification
            }
        }),
        session: {
            expiresIn: 60 * 60 * 24 * 365, // 1 year (compliant with the 400-day browser Max-Age limit)
            updateAge: 60 * 60 * 24 * 30 // 30 days
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
                },
                subscriptionExpiry: {
                    type: "date",
                    required: false
                },
                testdriveWindowStart: {
                    type: "date",
                    required: false
                },
                testdriveCount: {
                    type: "number",
                    required: false,
                    defaultValue: 30
                }
            }
        },
        plugins: [
            username(),
            bearer(),
            multiSession()
        ],
        emailAndPassword: {
            enabled: true,
            minPasswordLength: 6,
            password: {
                hash: async (password: string) => {
                    return new Promise<string>((resolve, reject) => {
                        const salt = crypto.randomBytes(16).toString("hex");
                        // N=1024, r=8, p=1 is extremely fast (takes ~2ms in C++)
                        crypto.scrypt(password, salt, 64, { N: 1024, r: 8, p: 1 }, (err: Error | null, derivedKey: Buffer) => {
                            if (err) reject(err);
                            else resolve(`${salt}:${derivedKey.toString("hex")}`);
                        });
                    });
                },
                verify: async ({ hash, password }) => {
                    const [salt, key] = hash.split(":");
                    if (!salt || !key) return false;
                    return new Promise<boolean>((resolve) => {
                        // First try lightweight scrypt parameters N=1024 (new hashes)
                        crypto.scrypt(password, salt, 64, { N: 1024, r: 8, p: 1 }, (err: Error | null, derivedKey: Buffer) => {
                            if (!err && derivedKey.toString("hex") === key) {
                                resolve(true);
                                return;
                            }
                            // Fallback to legacy default parameters N=16384 (using fast native scrypt with maxmem)
                            crypto.scrypt(password, salt, 64, { N: 16384, r: 16, p: 1, maxmem: 67108864 }, (err2: Error | null, derivedKey2: Buffer) => {
                                if (!err2 && derivedKey2.toString("hex") === key) {
                                    resolve(true);
                                } else {
                                    resolve(false);
                                }
                            });
                        });
                    });
                }
            }
        }
    });
};

