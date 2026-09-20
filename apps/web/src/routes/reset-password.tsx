import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/reset-password")({
  beforeLoad: () => { throw redirect({ href: "https://app.rangeros.com.au/sign-in" }); },
});
