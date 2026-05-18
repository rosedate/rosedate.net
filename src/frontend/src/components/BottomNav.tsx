import { Button } from "@/components/ui/button";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useGetOnlineUsers } from "../hooks/useQueries";

const navItems = [
  {
    path: "/users",
    label: "Users",
    icon: "/assets/generated/users-icon.dim_24x24.png",
  },
  {
    path: "/chats",
    label: "Chats",
    icon: "/assets/generated/chat-icon.dim_24x24.png",
  },
  {
    path: "/posts",
    label: "Posts",
    icon: "/assets/generated/posts-icon.dim_24x24.png",
  },
  {
    path: "/pay",
    label: "Pay",
    icon: "/assets/generated/pay-icon.dim_24x24.png",
  },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { data: onlineUsers = [] } = useGetOnlineUsers();
  const onlineCount = onlineUsers.length;

  return (
    <nav className="fixed bottom-0 z-50 w-full border-t border-border/50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-romantic">
      <div className="container flex h-14 sm:h-16 items-center justify-around px-1 sm:px-2">
        {navItems.map((item) => {
          const isActive =
            currentPath === item.path ||
            (item.path === "/chats" &&
              (currentPath === "/" || currentPath.startsWith("/chats")));

          const isUsers = item.path === "/users";

          return (
            <Button
              key={item.path}
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: item.path })}
              className={`relative flex flex-col items-center gap-0.5 sm:gap-1 h-auto py-1.5 sm:py-2 px-2 sm:px-3 rounded-2xl transition-all ${
                isActive
                  ? "text-primary bg-primary/10 shadow-rose-glow-sm"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              }`}
            >
              <span className="relative inline-flex">
                <img
                  src={item.icon}
                  alt={item.label}
                  className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform ${isActive ? "scale-110" : ""}`}
                />
                {isUsers && onlineCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none"
                    aria-label={`${onlineCount} users online`}
                  >
                    {onlineCount > 99 ? "99+" : onlineCount}
                  </span>
                )}
              </span>
              <span
                className={`text-[10px] sm:text-xs font-medium ${isActive ? "font-semibold" : ""}`}
              >
                {item.label}
              </span>
            </Button>
          );
        })}
      </div>
    </nav>
  );
}
