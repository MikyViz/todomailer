import { useEffect, useState } from "react";
import {
  getAuthenticatedEmail,
  signIn,
  signOut,
  signUp
} from "../utils/auth";

interface AuthPanelProps {
  onSessionChange?: (email: string | undefined) => void;
}

export function AuthPanel({ onSessionChange }: AuthPanelProps) {
  const [email, setEmail] = useState<string>();
  const [inputEmail, setInputEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);

  async function refreshSession(): Promise<void> {
    try {
      const currentEmail = await getAuthenticatedEmail();
      setEmail(currentEmail);
      onSessionChange?.(currentEmail);
    } catch (error) {
      setStatus((error as Error).message);
    }
  }

  useEffect(() => {
    void refreshSession();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus("");

    try {
      if (isCreatingAccount) {
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

  if (email) {
    return (
      <section className="panel">
        <p className="accountEmail">Signed in as {email}</p>
        <button className="secondary" onClick={() => void handleSignOut()}>
          Sign out
        </button>
        {status && <p className="status">{status}</p>}
      </section>
    );
  }

  return (
    <section className="panel">
      <form onSubmit={(event) => void handleSubmit(event)}>
        <h2>{isCreatingAccount ? "Create account" : "Sign in"}</h2>
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
          autoComplete={isCreatingAccount ? "new-password" : "current-password"}
          minLength={6}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button className="primary" type="submit">
          {isCreatingAccount ? "Create account" : "Sign in"}
        </button>
      </form>
      <button
        className="ghost authSwitch"
        onClick={() => setIsCreatingAccount((current) => !current)}
      >
        {isCreatingAccount ? "I already have an account" : "Create an account"}
      </button>
      {status && <p className="status">{status}</p>}
    </section>
  );
}