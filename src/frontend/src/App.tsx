import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import { Suspense, lazy } from "react";
import Layout from "./components/Layout";
import { ShimmerSkeleton } from "./components/ShimmerSkeleton";

// Eagerly imported lighter pages
import AnalyticsPage from "./pages/AnalyticsPage";
import ConversationPage from "./pages/ConversationPage";
import EmailSettingsPage from "./pages/EmailSettingsPage";
import GroupChatPage from "./pages/GroupChatPage";
import PayPage from "./pages/PayPage";
import PaymentFailurePage from "./pages/PaymentFailurePage";
import PaymentPage from "./pages/PaymentPage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import ProfilePage from "./pages/ProfilePage";
import SearchPage from "./pages/SearchPage";
import UserProfilePage from "./pages/UserProfilePage";

// Heavy pages — code-split for faster initial JS parse
const LazyPostsPage = lazy(() => import("./pages/PostsPage"));
const LazyUsersPage = lazy(() => import("./pages/UsersPage"));
const LazyChatsPage = lazy(() => import("./pages/ChatsPage"));

/** Full-page skeleton shown while a lazy route chunk downloads */
function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background pb-24 px-4 pt-6 space-y-4 max-w-2xl mx-auto">
      <ShimmerSkeleton className="h-8 w-40 mb-2" />
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-card border border-border/50 rounded-2xl p-4 space-y-3"
        >
          <div className="flex items-center gap-2.5">
            <ShimmerSkeleton className="w-9 h-9 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <ShimmerSkeleton className="h-3 w-28 rounded" />
              <ShimmerSkeleton className="h-2.5 w-16 rounded" />
            </div>
          </div>
          <ShimmerSkeleton className="h-16 w-full rounded-xl" />
          <ShimmerSkeleton className="h-7 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

/** Wrap a lazy component in a Suspense boundary */
function withSuspense(Component: React.ComponentType) {
  return function SuspenseWrapper() {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Component />
      </Suspense>
    );
  };
}

const PostsPage = withSuspense(LazyPostsPage);
const UsersPage = withSuspense(LazyUsersPage);
const ChatsPage = withSuspense(LazyChatsPage);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 15,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const msg = (error as Error)?.message ?? "";
        if (
          msg.includes("not authenticated") ||
          msg.includes("Actor not available")
        )
          return false;
        return failureCount < 3;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10000),
    },
    mutations: {
      retry: (failureCount, error) => {
        const msg = (error as Error)?.message ?? "";
        if (
          msg.includes("not authenticated") ||
          msg.includes("Actor not available")
        )
          return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    },
  },
});

const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: ChatsPage,
});

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users",
  component: UsersPage,
});

const userProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/users/$userId",
  component: UserProfilePage,
});

const chatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chats",
  component: ChatsPage,
});

const conversationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/chats/$conversationId",
  component: ConversationPage,
});

const groupChatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/groups/$groupId",
  component: GroupChatPage,
});

const postsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/posts",
  component: PostsPage,
});

const payRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pay",
  component: PayPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/profile",
  component: ProfilePage,
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/search",
  component: SearchPage,
});

const paymentSuccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/payment-success",
  component: PaymentSuccessPage,
});

const paymentFailureRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/payment-failure",
  component: PaymentFailurePage,
});

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/analytics",
  component: AnalyticsPage,
});

const emailSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/email-settings",
  component: EmailSettingsPage,
});

const paymentPageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pay/$username",
  component: PaymentPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  usersRoute,
  userProfileRoute,
  chatsRoute,
  conversationRoute,
  groupChatRoute,
  postsRoute,
  payRoute,
  profileRoute,
  searchRoute,
  paymentSuccessRoute,
  paymentFailureRoute,
  analyticsRoute,
  emailSettingsRoute,
  paymentPageRoute,
]);

const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultStaleTime: 5000,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <RouterProvider router={router} />
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
