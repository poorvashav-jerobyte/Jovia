import { useCompanySettings } from "../CompanySettings";
import AdminNavigation from "../components/AdminNavigation";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  createClient,
  type Session,
} from "@supabase/supabase-js";

type InquiryStatus =
  | "new"
  | "contacted"
  | "confirmed"
  | "closed";

type Inquiry = {
  id: string;
  name: string;
  email: string;
  phone: string;
  service: string;
  event_date: string | null;
  message: string | null;
  status: InquiryStatus;
  created_at: string;
};

type StatusFilter = "all" | InquiryStatus;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const API_BASE = import.meta.env.VITE_API_URL || "/api";

const STATUS_OPTIONS: InquiryStatus[] = [
  "new",
  "contacted",
  "confirmed",
  "closed",
];

const SERVICE_NAMES: Record<string, string> = {
  "bridal-makeup": "Bridal Makeup",
  "engagement-makeup": "Engagement Makeup",
  "party-makeup": "Party Makeup",
  "photoshoot-makeup": "Photoshoot Makeup",
  "makeup-masterclasses": "Makeup Masterclasses",
  other: "Other",
};

function formatDate(date: string | null) {
  if (!date) return "—";
  const value = new Date(
    date.length === 10 ? `${date}T12:00:00` : date
  );
  if (Number.isNaN(value.getTime())) return date;
  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

async function authenticatedRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof body.error === "string"
        ? body.error
        : `Request failed (${response.status})`
    );
  }
  return body as T;
}

export default function AdminPage() {
  const { settings } = useCompanySettings();
  const supabase = useMemo(() => {
    if (!SUPABASE_URL || !SUPABASE_KEY) return null;
    return createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }, []);

  const [session, setSession] = useState<Session | null>(
    null
  );
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState("");
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("all");
  const [selected, setSelected] = useState<Inquiry | null>(
    null
  );
  const [savingId, setSavingId] = useState<string | null>(
    null
  );
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setAuthError(error.message);
      setSession(data.session);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, value) => {
      if (!mounted) return;
      setSession(value);
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const loadInquiries = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setLoadError("");

    try {
      const {
        data: { session: current },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !current) {
        throw new Error(
          "Your session has expired. Sign in again."
        );
      }

      const rows = await authenticatedRequest<Inquiry[]>(
        "/admin/inquiries",
        current.access_token
      );
      setInquiries(rows);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load inquiries"
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (window.location.hash !== "#inquiries") return;
    const id = window.setTimeout(() => document.getElementById("inquiries")?.scrollIntoView({ block: "start" }), 100);
    return () => window.clearTimeout(id);
  }, []);

  const userId = session?.user.id;

  useEffect(() => {
    if (userId) {
      void loadInquiries();
    } else {
      setInquiries([]);
      setSelected(null);
    }
  }, [userId, loadInquiries]);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    if (!supabase) return;

    setSigningIn(true);
    setAuthError("");

    try {
      const { error } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
      if (error) throw error;
      setPassword("");
    } catch (error) {
      setAuthError(
        error instanceof Error
          ? error.message
          : "Unable to sign in"
      );
    } finally {
      setSigningIn(false);
    }
  }

  async function handleLogout() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();

    if (error) {
      setLoadError(error.message);
      return;
    }

    setInquiries([]);
    setSelected(null);
    setAuthError("");
    setNotice("");
  }

  async function updateStatus(
    inquiry: Inquiry,
    status: InquiryStatus
  ) {
    if (!supabase || inquiry.status === status) return;

    setSavingId(inquiry.id);
    setLoadError("");
    setNotice("");

    try {
      const {
        data: { session: current },
      } = await supabase.auth.getSession();

      if (!current) {
        throw new Error("Your session has expired.");
      }

      await authenticatedRequest<{
        id: string;
        status: InquiryStatus;
      }>(
        `/admin/inquiries/${inquiry.id}`,
        current.access_token,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      );

      setInquiries((previous) =>
        previous.map((row) =>
          row.id === inquiry.id ? { ...row, status } : row
        )
      );

      setSelected((previous) =>
        previous?.id === inquiry.id
          ? { ...previous, status }
          : previous
      );

      setNotice("Booking status updated successfully.");
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Could not update booking"
      );
    } finally {
      setSavingId(null);
    }
  }

  const counts = useMemo(
    () => ({
      all: inquiries.length,
      new: inquiries.filter((row) => row.status === "new")
        .length,
      contacted: inquiries.filter(
        (row) => row.status === "contacted"
      ).length,
      confirmed: inquiries.filter(
        (row) => row.status === "confirmed"
      ).length,
      closed: inquiries.filter(
        (row) => row.status === "closed"
      ).length,
    }),
    [inquiries]
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return inquiries.filter((row) => {
      if (
        statusFilter !== "all" &&
        row.status !== statusFilter
      ) return false;

      if (!query) return true;

      return [
        row.name,
        row.email,
        row.phone,
        row.service,
        row.message || "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [inquiries, search, statusFilter]);

  if (!supabase) {
    return (
      <main className="admin-shell admin-centered">
        <div className="admin-login-card">
          <h1>Admin configuration required</h1>
          <p>
            Add VITE_SUPABASE_URL and
            VITE_SUPABASE_PUBLISHABLE_KEY to
            apps/web/.env.local, then restart Vite.
          </p>
        </div>
      </main>
    );
  }

  if (!authReady) {
    return (
      <main className="admin-shell admin-centered">
        <p>Checking administrator session...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="admin-shell admin-centered">
        <section className="admin-login-card">
          <a className="admin-brand" href="/">
            {settings.company_name}
          </a>

          <div className="admin-login-heading">
            <p className="admin-eyebrow">PRIVATE ACCESS</p>
            <h1>Admin Sign In</h1>
            <p>
              Manage bookings and consultation inquiries.
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="admin@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
              />
            </label>

            {authError && (
              <p className="admin-error" role="alert">
                {authError}
              </p>
            )}

            <button
              type="submit"
              className="admin-primary-button"
              disabled={signingIn}
            >
              {signingIn ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <a className="admin-return-link" href="/">
            Return to website
          </a>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-shell admin-dashboard-page cc-admin-unified">
      <AdminNavigation email={session.user.email} onSignOut={handleLogout} />

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-eyebrow">
              {settings.company_name.toUpperCase()} / ADMIN
            </p>
            <h1>Booking Dashboard</h1>
          </div>

          <div className="admin-topbar-actions">
            <button
              className="admin-outline-button"
              onClick={() => void loadInquiries()}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button
              className="admin-outline-button"
              onClick={handleLogout}
            >
              Sign Out
            </button>
          </div>
        </header>

        {loadError && (
          <div
            className="admin-alert admin-error"
            role="alert"
          >
            {loadError}
          </div>
        )}

        {notice && (
          <div
            className="admin-alert admin-success"
            role="status"
          >
            {notice}
          </div>
        )}

        <section
          className="admin-stats"
          aria-label="Booking summary"
        >
          {(
            [
              ["Total Bookings", counts.all],
              ["New Inquiries", counts.new],
              ["Contacted", counts.contacted],
              ["Confirmed", counts.confirmed],
            ] as const
          ).map(([label, count]) => (
            <article
              className="admin-stat-card"
              key={label}
            >
              <p>{label}</p>
              <strong>{count}</strong>
            </article>
          ))}
        </section>

        <section
          className="admin-panel"
          id="inquiries"
        >
          <div className="admin-panel-header">
            <div>
              <p className="admin-eyebrow">
                CONSULTATION REQUESTS
              </p>
              <h2>Manage Bookings</h2>
            </div>

            <span className="admin-results-count">
              {filtered.length} results
            </span>
          </div>

          <div className="admin-filters">
            <input
              type="search"
              aria-label="Search bookings"
              placeholder="Search name, email, phone, service..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            <select
              aria-label="Filter booking status"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as StatusFilter
                )
              }
            >
              <option value="all">All Statuses</option>
              {STATUS_OPTIONS.map((status) => (
                <option value={status} key={status}>
                  {formatStatus(status)}
                </option>
              ))}
            </select>
          </div>

          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Event Date</th>
                  <th>Received</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Customer">
                      <strong>{row.name}</strong>
                      <small>{row.email}</small>
                      <small>{row.phone}</small>
                    </td>

                    <td data-label="Service">
                      {SERVICE_NAMES[row.service] ||
                        row.service}
                    </td>

                    <td data-label="Event Date">{formatDate(row.event_date)}</td>
                    <td data-label="Received">{formatDate(row.created_at)}</td>

                    <td data-label="Status">
                      <span
                        className={`admin-status admin-status-${row.status}`}
                      >
                        {formatStatus(row.status)}
                      </span>
                    </td>

                    <td data-label="Action">
                      <button
                        className="admin-text-button"
                        onClick={() => setSelected(row)}
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && filtered.length === 0 && (
              <div className="admin-empty">
                No bookings match your filters.
              </div>
            )}

            {loading && inquiries.length === 0 && (
              <div className="admin-empty">
                Loading bookings...
              </div>
            )}
          </div>
        </section>
      </main>

      {selected && (
        <div
          className="admin-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              setSelected(null);
            }
          }}
        >
          <section
            className="admin-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-detail-title"
          >
            <div className="admin-modal-header">
              <div>
                <p className="admin-eyebrow">
                  BOOKING DETAILS
                </p>
                <h2 id="admin-detail-title">
                  {selected.name}
                </h2>
              </div>

              <button
                className="admin-close"
                aria-label="Close details"
                onClick={() => setSelected(null)}
              >
                ×
              </button>
            </div>

            <dl className="admin-detail-grid">
              <div>
                <dt>Email</dt>
                <dd>{selected.email}</dd>
              </div>

              <div>
                <dt>Phone</dt>
                <dd>{selected.phone}</dd>
              </div>

              <div>
                <dt>Service</dt>
                <dd>
                  {SERVICE_NAMES[selected.service] ||
                    selected.service}
                </dd>
              </div>

              <div>
                <dt>Event Date</dt>
                <dd>
                  {formatDate(selected.event_date)}
                </dd>
              </div>

              <div>
                <dt>Submitted</dt>
                <dd>
                  {formatDate(selected.created_at)}
                </dd>
              </div>

              <div>
                <dt>Current Status</dt>
                <dd>
                  {formatStatus(selected.status)}
                </dd>
              </div>

              <div className="admin-detail-full">
                <dt>Message</dt>
                <dd>
                  {selected.message ||
                    "No message provided"}
                </dd>
              </div>
            </dl>

            <div className="admin-modal-footer">
              <label>
                Update booking status
                <select
                  value={selected.status}
                  disabled={
                    savingId === selected.id
                  }
                  onChange={(event) =>
                    void updateStatus(
                      selected,
                      event.target
                        .value as InquiryStatus
                    )
                  }
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option
                      key={status}
                      value={status}
                    >
                      {formatStatus(status)}
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="admin-outline-button"
                onClick={() =>
                  setSelected(null)
                }
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}