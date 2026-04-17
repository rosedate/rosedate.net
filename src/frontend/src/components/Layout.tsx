import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetCallerUserProfile } from "../hooks/useQueries";
import BottomNav from "./BottomNav";
import LoginRequiredPrompt from "./LoginRequiredPrompt";
import ProfileSetupModal from "./ProfileSetupModal";
import TopNav from "./TopNav";

function NavigationProgressBar() {
  const routerState = useRouterState();
  const isNavigating = routerState.status === "pending";
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isNavigating) {
      // Small delay before showing so instant navigations don't flash
      timerRef.current = setTimeout(() => {
        setVisible(true);
        setProgress(15);
        // Slowly advance to 85% to give the feeling of loading
        intervalRef.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 85) {
              if (intervalRef.current) clearInterval(intervalRef.current);
              return 85;
            }
            return prev + (85 - prev) * 0.08;
          });
        }, 120);
      }, 80);
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (visible) {
        // Complete the bar then fade out
        setProgress(100);
        const hide = setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 300);
        return () => clearTimeout(hide);
      }
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isNavigating, visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-0.5 pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-gradient-to-r from-rose-400 via-primary to-rose-400 transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: "0 0 8px 1px rgba(244,63,94,0.5)",
          opacity: progress === 100 ? 0 : 1,
          transition:
            progress === 100
              ? "width 150ms ease-out, opacity 250ms ease-in"
              : "width 200ms ease-out",
        }}
      />
    </div>
  );
}

export default function Layout() {
  const { identity, isInitializing } = useInternetIdentity();
  const {
    data: userProfile,
    isLoading: profileLoading,
    isFetched,
    refetch: refetchProfile,
  } = useGetCallerUserProfile();
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const navigate = useNavigate();
  const routerState = useRouterState();
  const prevPathRef = useRef<string>("");

  const isAuthenticated = !!identity;

  // Re-validate actor connection on route change to prevent stale disconnections
  useEffect(() => {
    const currentPath = routerState.location.pathname;
    if (
      prevPathRef.current &&
      prevPathRef.current !== currentPath &&
      isAuthenticated
    ) {
      // Proactively refetch the profile on navigation to ensure the actor
      // connection is live. This prevents the "refresh required" symptom where
      // navigating away creates a fresh HttpAgent that needs a round-trip.
      const timer = setTimeout(() => {
        refetchProfile();
      }, 150);
      return () => clearTimeout(timer);
    }
    prevPathRef.current = currentPath;
  }, [routerState.location.pathname, isAuthenticated, refetchProfile]);

  // Handle QR code scanning flow - navigate to chat after login and profile setup
  useEffect(() => {
    const qrTargetUsername = sessionStorage.getItem("qr_target_username");

    if (qrTargetUsername && isAuthenticated && userProfile && !profileLoading) {
      // User is logged in and has profile, navigate to chat with target user
      sessionStorage.removeItem("qr_target_username");

      // Navigate to users page with QR username parameter to trigger chat
      navigate({
        to: "/users",
        search: { qr_username: qrTargetUsername },
      });
    }
  }, [isAuthenticated, userProfile, profileLoading, navigate]);

  // Show profile setup modal for new users
  useEffect(() => {
    if (
      isAuthenticated &&
      !profileLoading &&
      isFetched &&
      userProfile === null
    ) {
      setShowProfileSetup(true);
    } else {
      setShowProfileSetup(false);
    }
  }, [isAuthenticated, profileLoading, isFetched, userProfile]);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading Rose Dating...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginRequiredPrompt />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavigationProgressBar />
      <TopNav />
      <main className="flex-1 pb-20 pt-16">
        <Outlet />
      </main>
      <BottomNav />
      {showProfileSetup && (
        <ProfileSetupModal onComplete={() => setShowProfileSetup(false)} />
      )}
    </div>
  );
}
