import { EnvSetup } from "@/components/env-setup";
import { HomeClient } from "@/components/home/home-client";
import { checkRequiredEnvVars, hasEnvVars } from "@/lib/env-check";

export default function Home() {
  const isDevelopment = process.env.NODE_ENV === "development";

  // Only show setup screen in development if environment variables are missing
  if (!hasEnvVars && isDevelopment) {
    const missingVars = checkRequiredEnvVars();
    return <EnvSetup missingVars={missingVars} />;
  }

  return <HomeClient />;
}
