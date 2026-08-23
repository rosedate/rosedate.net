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
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// jsdom does not implement scrollIntoView; the page calls it in a scroll
// effect. Stub it so the page can render in the test environment.
beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});
import type { Conversation, Message } from "../backend";
import ConversationPage from "./ConversationPage";

// Hoisted mocks so the module mock can reference them.
const { mockActor, mockIdentity } = vi.hoisted(() => {
  const mockActor = {
    getConversations: vi.fn(),
    getGroupChats: vi.fn(),
    getRoseSummary: vi.fn(),
    getOnlineUsers: vi.fn(),
    getTypingUsers: vi.fn(),
    getPinnedConversationMessage: vi.fn(),
    getUserProfile: vi.fn(),
    isUserBlocked: vi.fn(),
    updateLastActive: vi.fn(),
    markConversationRead: vi.fn(),
    setTyping: vi.fn(),
  };
  const mockIdentity = {
    getPrincipal: () => ({ toString: () => "aaaaa-aa" }),
  };
  return { mockActor, mockIdentity };
});

// The core-infrastructure package's internal `./dist/config` subpath does not
// resolve under Vitest's resolver (it does under the production Vite build), so
// the real module cannot be loaded here. Provide the hooks the page uses.
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
const OTHER = Principal.anonymous();

function makeMessage(reactions: Message["reactions"]): Message {
  return {
    id: 1n,
    isDeleted: false,
    content: { __kind__: "text", text: "hello world" },
    sender: SENDER,
    receiver: OTHER,
    isEdited: false,
    timestamp: 0n,
    reactions,
    readBy: [SENDER],
  };
}

function makeConversation(messages: Message[]): Conversation {
  return {
    id: 1n,
    participants: [SENDER, OTHER],
    messages,
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
  const chatRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/chats/$conversationId",
    component: ConversationPage,
  });
  const routeTree = rootRoute.addChildren([chatRoute]);
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: ["/chats/1"] }),
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe("ConversationPage raw data overlay protection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActor.getGroupChats.mockResolvedValue([]);
    mockActor.getRoseSummary.mockResolvedValue(null);
    mockActor.getOnlineUsers.mockResolvedValue([]);
    mockActor.getTypingUsers.mockResolvedValue([]);
    mockActor.getPinnedConversationMessage.mockResolvedValue(null);
    mockActor.getUserProfile.mockResolvedValue(null);
    mockActor.isUserBlocked.mockResolvedValue(false);
    mockActor.updateLastActive.mockResolvedValue(undefined);
    mockActor.markConversationRead.mockResolvedValue(undefined);
    mockActor.setTyping.mockResolvedValue(undefined);
  });

  it("renders the message text normally", async () => {
    mockActor.getConversations.mockResolvedValue([
      makeConversation([makeMessage([])]),
    ]);
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
    ]) as unknown as Message["reactions"];
    mockActor.getConversations.mockResolvedValue([
      makeConversation([makeMessage(rawMap)]),
    ]);

    renderPage();

    await screen.findByText("hello world");
    // The raw comma-separated ID:value pairs must not be rendered.
    expect(screen.queryByText(/1376/)).not.toBeInTheDocument();
    expect(screen.queryByText(/151/)).not.toBeInTheDocument();
    expect(screen.queryByText(/=>/)).not.toBeInTheDocument();
    expect(screen.queryByText(/,/)).not.toBeInTheDocument();
  });

  it("renders reaction badges for a well-formed reactions array", async () => {
    mockActor.getConversations.mockResolvedValue([
      makeConversation([makeMessage([["❤️", [SENDER]]])]),
    ]);
    renderPage();
    await screen.findByText("hello world");
    expect(screen.getByText("❤️")).toBeInTheDocument();
  });
});
