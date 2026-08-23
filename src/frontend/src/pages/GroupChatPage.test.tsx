import { Principal } from "@icp-sdk/core/principal";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GroupChat, GroupMessage } from "../backend";
import GroupChatPage from "./GroupChatPage";

// Hoisted mocks so the module mock can reference them.
const { mockActor, mockIdentity } = vi.hoisted(() => {
  const mockActor = {
    getGroupDetails: vi.fn(),
    getGroupMessages: vi.fn(),
    getConversations: vi.fn(),
    getOnlineUsers: vi.fn(),
    getGroupTypingUsers: vi.fn(),
    getPinnedGroupMessage: vi.fn(),
    markGroupChatRead: vi.fn(),
    updateLastActive: vi.fn(),
    setGroupTyping: vi.fn(),
  };
  const mockIdentity = {
    getPrincipal: () => ({ toString: () => "aaaaa-aa" }),
  };
  return { mockActor, mockIdentity };
});

// The core-infrastructure package's internal `./dist/config` subpath does not
// resolve under Vitest's resolver (it does under the production Vite build), so
// the real module cannot be loaded here. Provide the two hooks the page uses.
vi.mock("@caffeineai/core-infrastructure", () => ({
  useActor: () => ({ actor: mockActor, isFetching: false }),
  useInternetIdentity: () => ({ identity: mockIdentity }),
  InternetIdentityProvider: ({ children }: { children: ReactNode }) => children,
}));

// The object-storage package's internal `./dist/blob` subpath does not resolve
// under Vitest's resolver (it does under the production Vite build). Mock the
// package so the page can be exercised without loading that broken subpath.
vi.mock("@caffeineai/object-storage", () => {
  class ExternalBlob {
    static fromBytes(_bytes: Uint8Array): ExternalBlob {
      return new ExternalBlob();
    }
    getDirectURL(): string {
      return "https://example.com/blob";
    }
  }
  return { ExternalBlob };
});

const SENDER = Principal.fromText("aaaaa-aa");

function makeGroup(): GroupChat {
  return {
    id: 1n,
    creator: SENDER,
    participants: [SENDER],
    name: "Test Group",
    createdAt: 0n,
    admins: [SENDER],
  };
}

function makeMessage(reactions: GroupMessage["reactions"]): GroupMessage {
  return {
    id: 1n,
    isDeleted: false,
    content: { __kind__: "text", text: "hello world" },
    sender: SENDER,
    groupId: 1n,
    isEdited: false,
    timestamp: 0n,
    reactions,
    readBy: [SENDER],
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const rootRoute = createRootRoute();
  const groupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/groups/$groupId",
    component: GroupChatPage,
  });
  const routeTree = rootRoute.addChildren([groupRoute]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/groups/1"] }),
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("GroupChatPage raw data overlay protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActor.getGroupDetails.mockResolvedValue(makeGroup());
    mockActor.getConversations.mockResolvedValue([]);
    mockActor.getOnlineUsers.mockResolvedValue([]);
    mockActor.getGroupTypingUsers.mockResolvedValue([]);
    mockActor.getPinnedGroupMessage.mockResolvedValue(null);
    mockActor.markGroupChatRead.mockResolvedValue({ __kind__: "ok" });
    mockActor.updateLastActive.mockResolvedValue(undefined);
    mockActor.setGroupTyping.mockResolvedValue(undefined);
  });

  it("renders the message text normally", async () => {
    mockActor.getGroupMessages.mockResolvedValue([makeMessage([])]);
    renderPage();
    expect(await screen.findByText("hello world")).toBeInTheDocument();
  });

  it("does not render raw ID:value pairs when reactions arrives as a Map/object", async () => {
    // Shape mismatch: backend returns a Map/object of ID:value pairs instead
    // of the declared Array<[string, Array<Principal>]>. Its raw toString
    // ('1376' => 151, ...) must never reach the DOM.
    const rawMap = new Map<string, number>([
      ["1376", 151],
      ["42", 7],
    ]) as unknown as GroupMessage["reactions"];
    mockActor.getGroupMessages.mockResolvedValue([makeMessage(rawMap)]);

    renderPage();

    await screen.findByText("hello world");
    // The raw comma-separated ID:value pairs must not be rendered.
    expect(screen.queryByText(/1376/)).not.toBeInTheDocument();
    expect(screen.queryByText(/151/)).not.toBeInTheDocument();
    expect(screen.queryByText(/=>/)).not.toBeInTheDocument();
    expect(screen.queryByText(/,/)).not.toBeInTheDocument();
  });

  it("renders reaction badges for a well-formed reactions array", async () => {
    mockActor.getGroupMessages.mockResolvedValue([
      makeMessage([["❤️", [SENDER]]]),
    ]);
    renderPage();
    await screen.findByText("hello world");
    expect(screen.getByText("❤️")).toBeInTheDocument();
  });
});
