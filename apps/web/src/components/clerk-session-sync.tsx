import { useAuth } from "@clerk/tanstack-react-start";
import { useRouter } from "@tanstack/react-router";
import { useEffect, useRef } from "react";

// A shared Clerk session can be discovered after the anonymous SSR response.
// Reload server-derived identity and votes when that client session changes.
export function ClerkSessionSync() {
  const { isLoaded, sessionId } = useAuth();
  const router = useRouter();
  const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!isLoaded || previous.current === sessionId) return;
    previous.current = sessionId;
    void router.invalidate();
  }, [isLoaded, sessionId, router]);
  return null;
}
