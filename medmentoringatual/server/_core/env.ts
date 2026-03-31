export const ENV = {
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI ?? "",
  adminEmail: process.env.ADMIN_EMAIL ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  isProduction: process.env.NODE_ENV === "production",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  // Legacy compatibility aliases
  get appId() { return "medmentoring"; },
  get ownerOpenId() { return ""; },
  get oAuthServerUrl() { return ""; },
  get forgeApiUrl() { return "https://generativelanguage.googleapis.com"; },
  get forgeApiKey() { return this.geminiApiKey; },
};
