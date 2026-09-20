import { useClerk } from "@clerk/tanstack-react-start";
import { Button } from "@openheard/ui/components/button";

export function AuthForm({ callbackURL }: {
  wsName: string; hasGoogle: boolean; callbackURL: string; onSuccess: () => void;
  showFirstAccountHint?: boolean; onGoogleClick?: () => void;
}) {
  const clerk = useClerk();
  return <div className="flex w-full flex-col items-center gap-6 text-center">
    <h1 className="text-[22px] font-semibold">Sign in with RangerOS</h1>
    <p className="text-sm text-muted-foreground">Use your existing RangerOS account to suggest features and vote.</p>
    <Button full size="lg" onClick={() => {
      const target = new URL(callbackURL, window.location.origin);
      const returnTo = target.origin === window.location.origin ? target.href : window.location.origin;
      void clerk.redirectToSignIn({ signInForceRedirectUrl: returnTo, signUpForceRedirectUrl: returnTo });
    }}>Continue with RangerOS</Button>
  </div>;
}
