import { createFileRoute } from "@tanstack/react-router";
const retired = () => new Response("Use your RangerOS account", { status: 410 });
export const Route = createFileRoute("/api/auth/$")({
  server: { handlers: { GET: retired, POST: retired } },
});
