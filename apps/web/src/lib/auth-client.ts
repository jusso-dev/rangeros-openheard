import { useClerk } from "@clerk/tanstack-react-start";
export function useAuthClient() {
  const clerk = useClerk();
  return { signOut: async () => { await clerk.signOut({ redirectUrl: "/" }); } };
}
