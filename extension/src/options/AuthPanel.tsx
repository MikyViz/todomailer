import { useEffect, useState } from "react";
import {
  confirmPasswordReset,
  getAuthenticatedUser,
  getAuthenticatedEmail,
  requestPasswordReset,
  signIn,
  signOut,
  signUp,
  updatePassword
} from "../utils/auth";
import { clearPendingReset, getPendingReset, setPendingReset } from "../utils/storage";

interface AuthPanelProps {
  onSessionChange?: (userId: string | undefined) => void;
}

type Mode = "signin" | "signup" | "reset-request" | "reset-confirm";

export function AuthPanel({ onSessionChange }: AuthPanelProps) {
  const [email, setEmail] = useState<string>();
  const [inputEmail, setInputEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState<Mode>("signin");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [changePassword, setChangePassword] = useState("");

  async function refreshSession(): Promise<void> {
    try {
      const currentEmail = await getAuthenticatedEmail();
      setEmail(currentEmail);
      const user = await getAuthenticatedUser();
      onSessionChange?.(user?.id);
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  useEffect(() => {
    void refreshSession();
    void (async () => {
      const pending = await getPendingReset();
      if (pending) {
        setInputEmail(pending.email);
        setMode("reset-confirm");
      }
    })();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus("");

    try {
      if (mode === "signup") {
        const signedIn = await signUp(inputEmail, password);
        setStatus(signedIn ? "Account created." : "Check your inbox to confirm your email.");
      } else {
        await signIn(inputEmail, password);
        setStatus("Signed in.");
      }

      setPassword("");
      await refreshSession();
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function handleRequestReset(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus("");

    try {
      await requestPasswordReset(inputEmail);
      await setPendingReset(inputEmail);
      setStatus("If that email has an account, a reset code was sent to it.");
      setMode("reset-confirm");
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function handleConfirmReset(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus("");

    try {
      await confirmPasswordReset(inputEmail, resetCode, newPassword);
      await clearPendingReset();
      setStatus("Password updated. You're signed in.");
      setResetCode("");
      setNewPassword("");
      setMode("signin");
      await refreshSession();
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function handleSignOut(): Promise<void> {
    try {
      await signOut();
      setEmail(undefined);
      onSessionChange?.(undefined);
      setStatus("Signed out.");
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus("");

    try {
      await updatePassword(changePassword);
      setChangePassword("");
      setIsChangingPassword(false);
      setStatus("Password updated.");
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  if (email) {
    return (
      <section className="panel">
        <p className="accountEmail">Signed in as {email}</p>
        {isChangingPassword ? (
          <form onSubmit={(event) => void handleChangePassword(event)}>
            <label className="fieldLabel" htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
              value={changePassword}
              onChange={(event) => setChangePassword(event.target.value)}
            />
            <button className="primary" type="submit">Save new password</button>
            <button
              className="ghost authSwitch"
              type="button"
              onClick={() => setIsChangingPassword(false)}
            >
              Cancel
            </button>
          </form>
        ) : (
          <div className="actions">
            <button className="secondary" onClick={() => setIsChangingPassword(true)}>
              Change password
            </button>
            <button className="secondary" onClick={() => void handleSignOut()}>
              Sign out
            </button>
          </div>
        )}
        {status && <p className="status">{status}</p>}
      </section>
    );
  }

  if (mode === "reset-request") {
    return (
      <section className="panel">
        <form onSubmit={(event) => void handleRequestReset(event)}>
          <h2>Reset password</h2>
          <label className="fieldLabel" htmlFor="reset-email">Email</label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            required
            value={inputEmail}
            onChange={(event) => setInputEmail(event.target.value)}
          />
          <button className="primary" type="submit">Send reset code</button>
        </form>
        <button className="ghost authSwitch" onClick={() => setMode("signin")}>
          Back to sign in
        </button>
        {status && <p className="status">{status}</p>}
      </section>
    );
  }

  if (mode === "reset-confirm") {
    return (
      <section className="panel">
        <form onSubmit={(event) => void handleConfirmReset(event)}>
          <h2>Enter reset code</h2>
          <label className="fieldLabel" htmlFor="reset-code">Code from email</label>
          <input
            id="reset-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            value={resetCode}
            onChange={(event) => setResetCode(event.target.value)}
          />
          <label className="fieldLabel" htmlFor="reset-new-password">New password</label>
          <input
            id="reset-new-password"
            type="password"
            autoComplete="new-password"
            minLength={6}
            required
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <button className="primary" type="submit">Set new password</button>
        </form>
        <button
          className="ghost authSwitch"
          onClick={() => {
            void clearPendingReset();
            setMode("signin");
          }}
        >
          Back to sign in
        </button>
        {status && <p className="status">{status}</p>}
      </section>
    );
  }

  return (
    <section className="panel">
      <form onSubmit={(event) => void handleSubmit(event)}>
        <h2>{mode === "signup" ? "Create account" : "Sign in"}</h2>
        <label className="fieldLabel" htmlFor="auth-email">Email</label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          required
          value={inputEmail}
          onChange={(event) => setInputEmail(event.target.value)}
        />
        <label className="fieldLabel" htmlFor="auth-password">Password</label>
        <input
          id="auth-password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          minLength={6}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button className="primary" type="submit">
          {mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>
      <button
        className="ghost authSwitch"
        onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
      >
        {mode === "signup" ? "I already have an account" : "Create an account"}
      </button>
      {mode === "signin" && (
        <button className="ghost authSwitch" onClick={() => setMode("reset-request")}>
          Forgot password?
        </button>
      )}
      {status && <p className="status">{status}</p>}
    </section>
  );
}