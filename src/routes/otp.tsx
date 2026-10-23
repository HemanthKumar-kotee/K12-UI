
import { useState } from "react";

import {
  createFileRoute,
  useNavigate,
} from "@tanstack/react-router";

import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/otp")({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search["email"] === "string"
      ? search["email"]
      : "",
  }),
  component: OtpPage,
});

function OtpPage() {
  const { email } = Route.useSearch();
  const { verifyEmail } = useAuth();
  const navigate = useNavigate();

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!email) {
      setError("Email is missing. Please sign up again.");
      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit OTP sent to your email.");
      return;
    }

    setLoading(true);

    try {
      await verifyEmail(email, otp);

      // Create a new chat thread after successful verification.
      const threadId = crypto.randomUUID();

      await navigate({
        to: "/chat/$threadId",
        params: { threadId },
      });
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof err.response === "object" &&
        err.response !== null &&
        "data" in err.response &&
        typeof err.response.data === "object" &&
        err.response.data !== null &&
        "detail" in err.response.data &&
        typeof err.response.data.detail === "string"
          ? err.response.data.detail
          : "OTP verification failed. Please try again.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">
          Verify your email
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Enter the 6-digit verification code sent to{" "}
          <span className="font-medium text-slate-900">
            {email || "your email address"}
          </span>
          .
        </p>

        <form onSubmit={handleVerify} className="mt-6 space-y-4">
          <label
            htmlFor="otp"
            className="block text-sm font-medium text-slate-700"
          >
            Verification code
          </label>

          <input
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            placeholder="000000"
            value={otp}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            required
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-center text-xl tracking-[0.4em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || otp.length !== 6 || !email}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify email"}
          </button>
        </form>
      </div>
    </main>
  );
}
