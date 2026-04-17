import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import Layout from "./components/Layout";
import AnalyticsPage from "./pages/AnalyticsPage";
import ChatsPage from "./pages/ChatsPage";
import ConversationPage from "./pages/ConversationPage";
import EmailSettingsPage from "./pages/EmailSettingsPage";
import GroupChatPage from "./pages/GroupChatPage";
import PayPage from "./pages/PayPage";
import PaymentFailurePage from "./pages/PaymentFailurePage";
import PaymentSuccessPage from "./pages/PaymentSuccessPage";
import PostsPage from "./pages/PostsPage";
import ProfilePage from "./pages/ProfilePage";
import SearchPage from "./pages/SearchPage";
import UserProfilePage from "./pages/UserProfilePage";
import UsersPage from "./pages/UsersPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 15,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry on auth errors; retry up to 3 times on network/ICP errors
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
