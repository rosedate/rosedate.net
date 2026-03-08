import { RouterProvider, createRouter, createRoute, createRootRoute } from '@tanstack/react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import Layout from './components/Layout';
import UsersPage from './pages/UsersPage';
import ChatsPage from './pages/ChatsPage';
import ConversationPage from './pages/ConversationPage';
import GroupChatPage from './pages/GroupChatPage';
import PostsPage from './pages/PostsPage';
import PayPage from './pages/PayPage';
import ProfilePage from './pages/ProfilePage';
import UserProfilePage from './pages/UserProfilePage';
import SearchPage from './pages/SearchPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentFailurePage from './pages/PaymentFailurePage';
import AnalyticsPage from './pages/AnalyticsPage';
import EmailSettingsPage from './pages/EmailSettingsPage';
import AdminUserManagementPage from './pages/AdminUserManagementPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
    },
  },
});

const rootRoute = createRootRoute({
  component: Layout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: ChatsPage,
});

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users',
  component: UsersPage,
});

const userProfileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users/$userId',
  component: UserProfilePage,
});

const chatsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chats',
  component: ChatsPage,
});

const conversationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/chats/$conversationId',
  component: ConversationPage,
});

const groupChatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/groups/$groupId',
  component: GroupChatPage,
});

const postsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/posts',
  component: PostsPage,
});

const payRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pay',
  component: PayPage,
});

const profileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/profile',
  component: ProfilePage,
});

const emailSettingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/email-settings',
  component: EmailSettingsPage,
});

const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/search',
  component: SearchPage,
});

const paymentSuccessRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/payment-success',
  component: PaymentSuccessPage,
});

const paymentFailureRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/payment-failure',
  component: PaymentFailurePage,
});

const analyticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/analytics',
  component: AnalyticsPage,
});

const adminUserManagementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin/users',
  component: AdminUserManagementPage,
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
  emailSettingsRoute,
  searchRoute,
  paymentSuccessRoute,
  paymentFailureRoute,
  analyticsRoute,
  adminUserManagementRoute,
]);

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
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
