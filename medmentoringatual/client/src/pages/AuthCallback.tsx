import { useEffect, useState } from "react";
import { useLocation } from "wouter";

/**
 * AuthCallback — intermediary page for Safari ITP compatibility.
 *
 * Safari blocks cookies set during cross-site redirects (SameSite=Lax).
 * The OAuth server redirects here with ?token=... instead of setting the cookie
 * directly. This page makes a same-site POST to /api/auth/set-session which
 * sets the cookie in a same-site context that Safari accepts.
 */
export default function AuthCallback() {
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<"loading" | "error">("loading");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    const returnPath = params.get("returnPath") || "/";

    if (!token) {
      setStatus("error");
      return;
    }

    // POST to /api/auth/set-session — same-site request, Safari allows cookie
    fetch("/api/auth/set-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ token }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("set-session failed");
        // Navigate to the intended destination
        const safe = returnPath.startsWith("/") ? returnPath : "/";
        window.location.href = safe; // hard redirect to flush React state
      })
      .catch(() => {
        setStatus("error");
      });
  }, [navigate]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-sm mx-auto p-8">
          <p className="text-destructive font-medium mb-4">Erro ao finalizar login.</p>
          <a href="/mentor" className="text-primary underline text-sm">
            Tentar novamente
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm text-muted-foreground">Finalizando login...</span>
      </div>
    </div>
  );
}
