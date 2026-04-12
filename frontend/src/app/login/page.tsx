"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login, register } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const resetForm = () => {
    setUsername("");
    setPassword("");
    setPassword2("");
    setEmail("");
    setFirstName("");
    setLastName("");
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "login") {
        await login(username, password);
        router.push("/dashboard");
      } else {
        await register({ username, email, password, password2, first_name: firstName, last_name: lastName });
        setSuccess("Account created. You can now log in.");
        resetForm();
        setMode("login");
      }
    } catch (err: unknown) {
      const e = err as Record<string, unknown>;
      // DRF returns validation errors under field keys or non_field_errors
      const msg =
        e.non_field_errors ||
        e.error ||
        e.password ||
        e.password2 ||
        e.username ||
        e.email ||
        e.detail;
      if (msg) {
        setError(Array.isArray(msg) ? msg.join(" ") : String(msg));
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    resetForm();
    setMode(mode === "login" ? "register" : "login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-8">
        <h1 className="mb-1 text-2xl font-bold tracking-tight">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="mb-6 text-sm text-neutral-400">
          {mode === "login"
            ? "Sign in to your dashboard"
            : "Register a new account"}
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-900/40 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 rounded-lg bg-green-900/40 px-4 py-2 text-sm text-green-300">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm text-neutral-300">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
              placeholder="Enter your username"
            />
          </div>

          {mode === "register" && (
            <>
              <div>
                <label htmlFor="email" className="mb-1 block text-sm text-neutral-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
                  placeholder="you@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="mb-1 block text-sm text-neutral-300">
                    First name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="mb-1 block text-sm text-neutral-300">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-neutral-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
              placeholder={mode === "register" ? "Min. 8 characters" : "Enter your password"}
            />
          </div>

          {mode === "register" && (
            <div>
              <label htmlFor="password2" className="mb-1 block text-sm text-neutral-300">
                Confirm password
              </label>
              <input
                id="password2"
                type="password"
                required
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white placeholder-neutral-500 outline-none focus:border-neutral-500"
                placeholder="Repeat your password"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-white py-2 text-sm font-semibold text-black transition-colors hover:bg-neutral-200 disabled:opacity-50"
          >
            {loading
              ? "Loading..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-400">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={switchMode}
            className="text-white underline underline-offset-2 hover:text-neutral-300"
          >
            {mode === "login" ? "Register" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
