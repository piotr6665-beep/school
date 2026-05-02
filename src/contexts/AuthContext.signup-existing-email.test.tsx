import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import React from "react";

// ---- Mocks ----
const signUpMock: any = vi.fn();
const onAuthStateChangeMock: any = vi.fn(() => ({
  data: { subscription: { unsubscribe: vi.fn() } },
}));
const getSessionMock: any = vi.fn(() =>
  Promise.resolve({ data: { session: null } }),
);

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signUp: (arg: any) => signUpMock(arg),
      onAuthStateChange: (cb: any) => onAuthStateChangeMock(cb),
      getSession: () => getSessionMock(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

const toastMock = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

// Import AFTER mocks are set up
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const TestSignUpHarness = () => {
  const { signUp } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const onClick = async () => {
    try {
      await signUp("Existing@Example.com", "password123", "Test User");
      setSuccess(true);
    } catch (e: any) {
      setError(e?.message ?? "unknown");
    }
  };

  return (
    <div>
      <button onClick={onClick}>register</button>
      {error && <div data-testid="error">{error}</div>}
      {success && <div data-testid="success">SUCCESS</div>}
    </div>
  );
};

const renderHarness = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <TestSignUpHarness />
      </AuthProvider>
    </MemoryRouter>,
  );

describe("signUp – existing email handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects with friendly message when Supabase returns an 'already registered' error (email confirmation enabled)", async () => {
    signUpMock.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered", status: 400 },
    });

    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("register"));

    await waitFor(() => {
      expect(screen.queryByTestId("success")).toBeNull();
      expect(screen.getByTestId("error")).toBeInTheDocument();
    });

    // Friendly Polish message, not the raw English Supabase error
    expect(screen.getByTestId("error").textContent).toMatch(
      /Konto z tym adresem email już istnieje/i,
    );

    // Toast should be the destructive "Błąd rejestracji"
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Błąd rejestracji",
        variant: "destructive",
        description: expect.stringMatching(
          /Konto z tym adresem email już istnieje/i,
        ),
      }),
    );

    // No "Konto utworzone" toast was shown
    expect(toastMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: "Konto utworzone" }),
    );
  });

  it("rejects with friendly message when Supabase silently returns user with empty identities (anti-enumeration)", async () => {
    // Supabase returns no error but a fake user with empty identities array
    signUpMock.mockResolvedValue({
      data: {
        user: {
          id: "00000000-0000-0000-0000-000000000000",
          email: "existing@example.com",
          identities: [],
        },
        session: null,
      },
      error: null,
    });

    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("register"));

    await waitFor(() => {
      expect(screen.queryByTestId("success")).toBeNull();
      expect(screen.getByTestId("error")).toBeInTheDocument();
    });

    expect(screen.getByTestId("error").textContent).toMatch(
      /Konto z tym adresem email już istnieje/i,
    );

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Błąd rejestracji",
        variant: "destructive",
      }),
    );
    expect(toastMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ title: "Konto utworzone" }),
    );
  });

  it("normalizes email (trim + lowercase) before sending to Supabase", async () => {
    signUpMock.mockResolvedValue({
      data: {
        user: { id: "u1", email: "existing@example.com", identities: [{}] },
        session: null,
      },
      error: null,
    });

    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("register"));

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalled();
    });

    const callArg = signUpMock.mock.calls[0][0];
    expect(callArg.email).toBe("existing@example.com");
  });

  it("shows success toast for a genuinely new account (non-empty identities)", async () => {
    signUpMock.mockResolvedValue({
      data: {
        user: {
          id: "new-user",
          email: "new@example.com",
          identities: [{ id: "i1", provider: "email" }],
        },
        session: null,
      },
      error: null,
    });

    const user = userEvent.setup();
    renderHarness();
    await user.click(screen.getByText("register"));

    await waitFor(() => {
      expect(screen.getByTestId("success")).toBeInTheDocument();
    });

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Konto utworzone" }),
    );
  });
});
