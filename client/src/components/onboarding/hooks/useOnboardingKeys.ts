import { useAppSelector } from "@/hooks/useAppSelector";
import { useMemo } from "react";

export const useOnboardingKeys = () => {
  const user = useAppSelector((state) => state.auth.user);
  const onboardingSeenKey = useMemo(
    () =>
      user ? `onboardingSeenVersion2_${user.id}` : "onboardingSeenVersion2",
    [user]
  );
  const welcomeSeenKey = useMemo(
    () => (user ? `welcomeSeenVersion2_${user.id}` : "welcomeSeenVersion2"),
    [user]
  );
  const showWelcomeKey = useMemo(
    () => (user ? `showWelcomeVersion2_${user.id}` : "showWelcomeVersion2"),
    [user]
  );

  return {
    onboardingSeenKey,
    welcomeSeenKey,
    showWelcomeKey,
  };
};
