import { createStart } from "@tanstack/react-start";
import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import { clerkConfig } from "./lib/clerk-config";

export const startInstance = createStart(() => ({
  requestMiddleware: [clerkMiddleware(async () => {
    const { env } = await import("@openheard/env/server");
    return {
    secretKey: (env as unknown as { CLERK_SECRET_KEY: string }).CLERK_SECRET_KEY,
    ...clerkConfig,
    authorizedParties: ["https://feedback.rangeros.com.au", "https://app.rangeros.com.au"],
  };
  })],
}));
