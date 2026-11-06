
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  useAdminAccess,
  accessAuth,
  type AdminRole,
} from "../AdminAccess";
import AdminNavigation from "../components/AdminNavigation";
import "../user-access.css";

function EyeIcon({ hidden }: { hidden: boolean }) {
  return (
    <svg
      width="19"
      height="19"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
      {hidden && <path d="M3 3 21 21" />}
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18M8 6V4h8v2m-11 0 1 15h12l1-15M10 10v7m4-7v7" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 2 8 4v6c0 5-3.4 8.3-8 10-4.6-1.7-8-5-8-10V6l8-4Z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

type UserRow = {
  user_id: string;
  full_name: string;
  email: string;
  role: AdminRole;
};

type NewUser = {
  full_name: string;
  email: string;
  password: string;
  role: "admin" | "manager" | "member";
};

const EMPTY: NewUser = {
  full_name: "",
  email: "",
  password: "",
  role: "member",
};

const API = (
  import.meta.env.VITE_API_URL || "/api"
).replace(/\/$/, "");

async function request<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  if (!accessAuth) {
    throw new Error("Supabase is not configured");
  }

  const {
    data: { session },
    error: sessionError,
  } = await accessAuth.auth.getSession();

  if (sessionError || !session) {
    throw new Error("Session expired. Please sign in again.");
  }

  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      ...(init.body
        ? { "Content-Type": "application/json" }
        : {}),
      ...init.headers,
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error || `Request failed (HTTP ${response.status})`
    );
  }

  return result as T;
}

export default function UserAccessPage() {
  const { profile, session } = useAdminAccess();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [form, setForm] = useState<NewUser>({ ...EMPTY });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(
    null
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const canManage =
    profile?.role === "admin" ||
    profile?.role === "super_admin";

  const isOwner = profile?.role === "super_admin";

  const loadUsers = useCallback(async () => {
    if (!profile || profile.role === "member") return;

    setLoading(true);
    setError("");

    try {
      setUsers(
        await request<UserRow[]>("/admin/user-access")
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load users"
      );
    } finally {
      setLoading(false);
    }
  }, [profile?.role]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function addUser(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!canManage || saving) return;

    setError("");
    setNotice("");

    if (form.full_name.trim().length < 2) {
      setError(
        "Enter a name containing at least 2 characters."
      );
      return;
    }

    if (form.password.length < 12) {
      setError(
        "Password must have at least 12 characters."
      );
      return;
    }

    setSaving(true);

    try {
      const created = await request<UserRow>(
        "/admin/user-access",
        {
          method: "POST",
          body: JSON.stringify({
            ...form,
            full_name: form.full_name.trim(),
            email: form.email.trim().toLowerCase(),
          }),
        }
      );

      setUsers((previous) =>
        [...previous, created].sort((a, b) =>
          a.full_name.localeCompare(b.full_name)
        )
      );

      setForm({ ...EMPTY });
      setShowPassword(false);

      setNotice(
        `${created.full_name} was created with ${created.role} access.`
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to add user"
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(
    user: UserRow,
    role: "admin" | "manager" | "member"
  ) {
    if (
      !canManage ||
      busyUserId ||
      user.role === "super_admin" ||
      role === user.role ||
      user.user_id === profile?.user_id
    ) {
      return;
    }

    if (
      !window.confirm(
        `Change ${
          user.full_name || user.email
        }'s role to ${role}?`
      )
    ) {
      return;
    }

    setBusyUserId(user.user_id);
    setError("");
    setNotice("");

    try {
      const updated = await request<UserRow>(
        `/admin/user-access/${user.user_id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ role }),
        }
      );

      setUsers((previous) =>
        previous.map((row) =>
          row.user_id === user.user_id ? updated : row
        )
      );

      setNotice("User role updated successfully.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to update role"
      );
    } finally {
      setBusyUserId(null);
    }
  }

  async function removeUser(user: UserRow) {
    if (
      !canManage ||
      busyUserId ||
      user.role === "super_admin" ||
      user.user_id === profile?.user_id
    ) {
      return;
    }

    if (user.role === "admin" && !isOwner) return;

    const confirmed = window.confirm(
      `Permanently remove ${
        user.full_name || user.email
      } (${user.email})?\n\n` +
        "This will delete their Supabase login and admin access. This action cannot be undone."
    );

    if (!confirmed) return;

    setBusyUserId(user.user_id);
    setError("");
    setNotice("");

    try {
      await request<{ success: boolean }>(
        `/admin/user-access/${user.user_id}`,
        { method: "DELETE" }
      );

      setUsers((previous) =>
        previous.filter(
          (row) => row.user_id !== user.user_id
        )
      );

      setNotice(
        `${user.full_name || user.email} has been removed.`
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to remove user"
      );
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="testimonial-admin cc-admin-unified cc-users-admin">
      <AdminNavigation
        email={session?.user.email}
        onSignOut={() => {
          void accessAuth?.auth.signOut();
        }}
      />

      <main className="testimonial-content cc-users-main">
        <header className="testimonial-header">
          <div>
            <p className="testimonial-eyebrow">
              JOVIA MUA / ADMINISTRATION
            </p>
            <h1>User Access</h1>
          </div>

          <button
            type="button"
            className="testimonial-outline"
            onClick={() => void loadUsers()}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </header>

        <div className="cc-role-guide">
          <div>
            <strong>Super Admin</strong>
            <span>
              Website owner · Permanent, protected full access
            </span>
          </div>

          <div>
            <strong>Admin</strong>
            <span>
              Full editing, account creation and member management
            </span>
          </div>

          <div>
            <strong>Manager</strong>
            <span>All admin pages · View only</span>
          </div>

          <div>
            <strong>Member</strong>
            <span>
              Dashboard, Bookings and Services · View only
            </span>
          </div>
        </div>

        {error && (
          <p className="cc-users-error" role="alert">
            {error}
          </p>
        )}

        {notice && (
          <p className="cc-users-success" role="status">
            {notice}
          </p>
        )}

        <div className="cc-users-grid">
          {canManage && (
            <section className="testimonial-panel cc-users-card">
              <h2>Add User</h2>
              <p>
                Create a user login and choose an access role.
              </p>

              <form
                className="cc-users-form"
                onSubmit={(event) => void addUser(event)}
              >
                <label>
                  Full Name
                  <input
                    autoComplete="name"
                    required
                    minLength={2}
                    maxLength={100}
                    value={form.full_name}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        full_name: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  Email Address
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    maxLength={254}
                    value={form.email}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        email: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  Password
                  <div className="cc-password-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      minLength={12}
                      maxLength={128}
                      value={form.password}
                      onChange={(event) =>
                        setForm((previous) => ({
                          ...previous,
                          password: event.target.value,
                        }))
                      }
                    />

                    <button
                      type="button"
                      className="cc-password-eye"
                      onClick={() =>
                        setShowPassword((value) => !value)
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      aria-pressed={showPassword}
                      title={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                    >
                      <EyeIcon hidden={showPassword} />
                    </button>
                  </div>

                  <small>
                    At least 12 characters. Share credentials securely.
                  </small>
                </label>

                <label>
                  Role &amp; Permissions
                  <select
                    value={form.role}
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        role: event.target.value as NewUser["role"],
                      }))
                    }
                  >
                    <option value="admin">
                      Admin — Full access
                    </option>
                    <option value="manager">
                      Manager — View only
                    </option>
                    <option value="member">
                      Member — Limited view
                    </option>
                  </select>

                  <small>
                    The Super Admin role cannot be assigned from this form.
                  </small>
                </label>

                <button
                  className="testimonial-primary cc-users-save"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Creating User..." : "Add User"}
                </button>
              </form>
            </section>
          )}

          <section className="testimonial-panel cc-users-card">
            <div className="cc-users-list-heading">
              <h2>Existing Users</h2>
              <span>{users.length} users</span>
            </div>

            {loading ? (
              <p>Loading users...</p>
            ) : users.length === 0 ? (
              <p>No users found.</p>
            ) : (
              <div className="cc-users-list">
                {users.map((user) => {
                  const protectedOwner =
                    user.role === "super_admin";

                  const self =
                    user.user_id === profile?.user_id;

                  const canRemove =
                    canManage &&
                    !self &&
                    !protectedOwner &&
                    (isOwner || user.role !== "admin");

                  return (
                    <div
                      className="cc-users-row"
                      key={user.user_id}
                    >
                      <div
                        className="cc-users-avatar"
                        aria-hidden="true"
                      >
                        {(
                          user.full_name ||
                          user.email ||
                          "U"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="cc-users-identity">
                        <strong>
                          {user.full_name || "Administrator"}

                          {protectedOwner && (
                            <span className="cc-owner-badge">
                              <ShieldIcon />
                              Owner
                            </span>
                          )}
                        </strong>

                        <small>
                          {user.email || "Email unavailable"}
                        </small>
                      </div>

                      {protectedOwner ? (
                        <span className="cc-super-admin-role">
                          Super Admin
                        </span>
                      ) : (
                        <select
                          aria-label={`Role for ${
                            user.full_name || user.email
                          }`}
                          value={user.role}
                          disabled={
                            !canManage ||
                            !!busyUserId ||
                            self
                          }
                          onChange={(event) =>
                            void changeRole(
                              user,
                              event.target.value as NewUser["role"]
                            )
                          }
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="member">Member</option>
                        </select>
                      )}

                      {canRemove && (
                        <button
                          type="button"
                          className="cc-users-remove"
                          disabled={!!busyUserId}
                          onClick={() => void removeUser(user)}
                          aria-label={`Remove ${
                            user.full_name || user.email
                          }`}
                          title="Remove user and delete login"
                        >
                          <TrashIcon />

                          <span>
                            {busyUserId === user.user_id
                              ? "Removing..."
                              : "Remove"}
                          </span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
