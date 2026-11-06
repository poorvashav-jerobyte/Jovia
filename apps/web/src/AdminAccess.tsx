
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link, useLocation } from "react-router-dom";
import { createClient, type Session } from "@supabase/supabase-js";

export type AdminRole = "super_admin" | "admin" | "manager" | "member";

export type AccessProfile = {
  user_id: string;
  email: string;
  full_name: string;
  role: AdminRole;
};

type AccessContextValue = {
  profile: AccessProfile | null;
  loading: boolean;
  session: Session | null;
};

const AccessContext = createContext<AccessContextValue>({
  profile: null,
  loading: true,
  session: null,
});

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const API = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");

export const accessAuth =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export function useAdminAccess() {
  return useContext(AccessContext);
}

export function AdminAccessGate({
  children,
}: {
  children: ReactNode;
}) {
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AccessProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accessAuth) {
      setLoading(false);
      setError("Supabase frontend settings are missing.");
      return;
    }

    let live = true;

    void accessAuth.auth
      .getSession()
      .then(({ data, error: sessionError }) => {
        if (!live) return;
        if (sessionError) setError(sessionError.message);
        setSession(data.session);
      });

    const {
      data: { subscription },
    } = accessAuth.auth.onAuthStateChange((_event, next) => {
      if (live) setSession(next);
    });

    return () => {
      live = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let live = true;

    if (!session) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    void (async () => {
      try {
        const result = await fetch(`${API}/admin/me`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        const body = await result.json().catch(() => ({}));

        if (!result.ok) {
          throw new Error(
            body.error || `Access check failed (${result.status})`
          );
        }

        if (live) setProfile(body as AccessProfile);
      } catch (reason) {
        if (live) {
          setProfile(null);
          setError(
            reason instanceof Error
              ? reason.message
              : "Cannot verify permissions"
          );
        }
      } finally {
        if (live) setLoading(false);
      }
    })();

    return () => {
      live = false;
    };
  }, [session?.access_token, location.pathname]);

  const context = useMemo(
    () => ({ profile, loading, session }),
    [profile, loading, session]
  );

  const path = location.pathname.replace(/\/$/, "") || "/admin";

  const canOpen =
    !profile ||
    profile.role !== "member" ||
    path === "/admin" ||
    path === "/admin/services";

  const canManage =
    !profile ||
    profile.role === "admin" ||
    profile.role === "super_admin";

  if (loading) {
    return (
      <div className="cc-access-message">
        Checking admin permissions…
      </div>
    );
  }

  if (error && session && !profile) {
    return (
      <div className="cc-access-message" role="alert">
        {error} <Link to="/admin">Back to Admin</Link>
      </div>
    );
  }

  if (!session && path !== "/admin") {
    return (
      <div className="cc-access-message">
        Please <Link to="/admin">sign in</Link> to access this page.
      </div>
    );
  }

  if (session && !profile) {
    return (
      <div className="cc-access-message" role="alert">
        Your account does not have admin-panel access.
      </div>
    );
  }

  if (!canOpen) {
    return (
      <div className="cc-access-message" role="alert">
        This page is not available to Members.{" "}
        <Link to="/admin">Go to Dashboard</Link>
      </div>
    );
  }

  return (
    <AccessContext.Provider value={context}>
      <div className={canManage ? "cc-role-editor" : "cc-role-readonly"}>
        {profile && !canManage && (
          <div className="cc-role-banner" role="status">
            {profile.role === "manager"
              ? "Manager — View-only access to all sections"
              : "Member — Dashboard, Bookings and Services (view only)"}
          </div>
        )}
        {children}
      </div>
    </AccessContext.Provider>
  );
}
