import { useCompanySettings } from "../CompanySettings";
import AdminNavigation from "../components/AdminNavigation";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  createClient,
  type Session,
} from "@supabase/supabase-js";

import "../services-upload.css";

type Service = {
  id: string;
  slug: string;
  title: string;
  description: string;
  image_path: string;
  price: number | null;
  display_order: number;
  published: boolean;
  created_at: string;
};

type ServiceForm = {
  title: string;
  description: string;
  image_path: string;
  price: string;
  display_order: string;
  published: boolean;
};

type ServiceFilter = "all" | "published" | "draft";

const EMPTY: ServiceForm = {
  title: "",
  description: "",
  image_path: "",
  price: "",
  display_order: "0",
  published: true,
};

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const apiBase = import.meta.env.VITE_API_URL || "/api";

const supabase =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function adminRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw new Error(
      "Your session has expired. Sign in again."
    );
  }

  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...(init.body instanceof Blob
        ? {}
        : { "Content-Type": "application/json" }),
      ...init.headers,
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.error ||
        `Request failed (${response.status})`
    );
  }

  return result as T;
}

function formatPrice(value: number | null) {
  return value === null
    ? "On request"
    : `₹${value.toLocaleString("en-IN")}`;
}

export default function ServicesPage() {
  const { settings } = useCompanySettings();
  const [session, setSession] =
    useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  const [services, setServices] =
    useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] =
    useState<ServiceFilter>("all");

  const [editing, setEditing] =
    useState<Service | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] =
    useState<ServiceForm>(EMPTY);

  const [imageFile, setImageFile] =
    useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] =
    useState(false);

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setReady(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, next) => {
        if (active) {
          setSession(next);
          setReady(true);
        }
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!imageFile) {
      setPreview("");
      return;
    }

    const objectURL = URL.createObjectURL(imageFile);
    setPreview(objectURL);

    return () => {
      URL.revokeObjectURL(objectURL);
    };
  }, [imageFile]);

  const load = useCallback(async () => {
    if (!supabase) return;

    setLoading(true);
    setError("");

    try {
      const rows = await adminRequest<Service[]>(
        "/admin/services"
      );
      setServices(rows);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load services"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const userId = session?.user.id;

  useEffect(() => {
    if (userId) {
      void load();
    } else {
      setServices([]);
    }
  }, [userId, load]);

  const visible = useMemo(() => {
    return services.filter((service) => {
      const queryMatch =
        `${service.title} ${service.description}`
          .toLowerCase()
          .includes(search.trim().toLowerCase());

      const statusMatch =
        filter === "all" ||
        (filter === "published"
          ? service.published
          : !service.published);

      return queryMatch && statusMatch;
    });
  }, [services, search, filter]);

  const published = useMemo(
    () =>
      services.filter((service) => service.published)
        .length,
    [services]
  );

  function field<K extends keyof ServiceForm>(
    key: K,
    value: ServiceForm[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function beginAdd() {
    const nextOrder =
      Math.max(
        0,
        ...services.map(
          (service) => service.display_order
        )
      ) + 1;

    setEditing(null);
    setForm({
      ...EMPTY,
      display_order: String(nextOrder),
    });

    setImageFile(null);
    setError("");
    setNotice("");
    setOpen(true);
  }

  function beginEdit(service: Service) {
    setEditing(service);

    setForm({
      title: service.title,
      description: service.description,
      image_path: service.image_path,
      price:
        service.price === null
          ? ""
          : String(service.price),
      display_order: String(
        service.display_order
      ),
      published: service.published,
    });

    setImageFile(null);
    setError("");
    setNotice("");
    setOpen(true);
  }

  function close() {
    if (saving) return;

    setOpen(false);
    setImageFile(null);
    setEditing(null);
    setError("");
  }

  function chooseImage(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Choose a PNG, JPEG, or WebP image."
      );
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Image must be smaller than 5 MB."
      );
      event.target.value = "";
      return;
    }

    setError("");
    setImageFile(file);
    event.target.value = "";
  }

  async function save(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const price = form.price.trim()
      ? Number(form.price)
      : null;

    const displayOrder = Number(
      form.display_order
    );

    if (
      !form.title.trim() ||
      !form.description.trim() ||
      (!imageFile && !form.image_path)
    ) {
      setError(
        "Title, description, and an image are required."
      );
      return;
    }

    if (
      price !== null &&
      (
        !Number.isFinite(price) ||
        price < 0 ||
        Math.abs(
          price * 100 - Math.round(price * 100)
        ) > 0.00001
      )
    ) {
      setError(
        "Enter a valid non-negative price."
      );
      return;
    }

    if (
      !Number.isInteger(displayOrder) ||
      displayOrder < 0
    ) {
      setError(
        "Display order must be a whole number."
      );
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      let imagePath = form.image_path;

      if (imageFile) {
        const result = await adminRequest<{
          image_path: string;
        }>("/admin/services/upload", {
          method: "POST",
          headers: {
            "Content-Type": imageFile.type,
          },
          body: imageFile,
        });

        imagePath = result.image_path;
      }

      const title = form.title.trim();
      const slug =
        editing?.slug || slugify(title);

      if (!slug || slug.length < 2) {
        throw new Error(
          "Please enter a longer service title."
        );
      }

      const payload = {
        slug,
        title,
        description: form.description.trim(),
        image_path: imagePath,
        price,
        display_order: displayOrder,
        published: form.published,
      };

      const wasEditing = Boolean(editing);

      await adminRequest<Service>(
        editing
          ? `/admin/services/${editing.id}`
          : "/admin/services",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        }
      );

      setOpen(false);
      setImageFile(null);
      setEditing(null);

      await load();

      setNotice(
        wasEditing
          ? "Service updated successfully."
          : "Service created successfully."
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to save service"
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggle(service: Service) {
    if (saving) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await adminRequest<Service>(
        `/admin/services/${service.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            slug: service.slug,
            title: service.title,
            description: service.description,
            image_path: service.image_path,
            price: service.price,
            display_order: service.display_order,
            published: !service.published,
          }),
        }
      );

      await load();

      setNotice(
        service.published
          ? "Service unpublished."
          : "Service published."
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to update service"
      );
    } finally {
      setSaving(false);
    }
  }

  async function signIn(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    if (!supabase) return;

    setSigningIn(true);
    setError("");

    try {
      const { error: authError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (authError) throw authError;
      setPassword("");
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to sign in"
      );
    } finally {
      setSigningIn(false);
    }
  }

  if (!supabase) {
    return (
      <main className="cc-services-state">
        Configure apps/web/.env.local first.
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="cc-services-state">
        Checking admin session...
      </main>
    );
  }

  if (!session) {
    return (
      <main className="cc-services-state">
        <form
          className="cc-services-login"
          onSubmit={signIn}
        >
          <span className="cc-services-brand">
            {settings.company_name}
          </span>

          <h1>Admin Sign In</h1>
          <p>Sign in to manage services.</p>

          <label>
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
            />
          </label>

          <label>
            Password
            <input
              type="password"
              required
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
            />
          </label>

          {error && (
            <p className="cc-services-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={signingIn}
          >
            {signingIn
              ? "Signing in..."
              : "Sign In"}
          </button>

          <a href="/admin">
            Back to Dashboard
          </a>
        </form>
      </main>
    );
  }

  return (
    <div className="cc-services-admin cc-admin-unified">
      <AdminNavigation email={session.user.email} onSignOut={() => supabase.auth.signOut().then(() => {})} />

      <main className="cc-services-content">
        <header className="cc-services-header">
          <div>
            <p className="cc-services-eyebrow">
              {settings.company_name.toUpperCase()} / ADMIN
            </p>
            <h1>Services Management</h1>
          </div>

          <div className="cc-services-header-actions">
            <button
              className="cc-btn-outline"
              onClick={() => void load()}
              disabled={loading}
            >
              Refresh
            </button>

            <button
              className="cc-btn-primary"
              onClick={beginAdd}
            >
              + Add Service
            </button>
          </div>
        </header>

        {error && !open && (
          <div
            className="cc-services-message error"
            role="alert"
          >
            {error}
          </div>
        )}

        {notice && (
          <div
            className="cc-services-message success"
            role="status"
          >
            {notice}
          </div>
        )}

        <section className="cc-services-stats">
          <article>
            <span>Total Services</span>
            <strong>{services.length}</strong>
          </article>

          <article>
            <span>Published</span>
            <strong>{published}</strong>
          </article>

          <article>
            <span>Unpublished</span>
            <strong>
              {services.length - published}
            </strong>
          </article>
        </section>

        <section className="cc-services-panel">
          <div className="cc-services-panel-title">
            <div>
              <p className="cc-services-eyebrow">
                WEBSITE CATALOG
              </p>
              <h2>Manage Services</h2>
            </div>

            <span>{visible.length} results</span>
          </div>

          <div className="cc-services-filters">
            <input
              type="search"
              placeholder="Search services..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />

            <select
              value={filter}
              onChange={(event) =>
                setFilter(
                  event.target.value as ServiceFilter
                )
              }
            >
              <option value="all">
                All Services
              </option>
              <option value="published">
                Published
              </option>
              <option value="draft">
                Unpublished
              </option>
            </select>
          </div>

          <div className="cc-services-table-wrap">
            <table className="cc-services-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Price</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {visible.map((service) => (
                  <tr key={service.id}>
                    <td>
                      <div className="cc-service-identity">
                        <img
                          src={service.image_path}
                          alt=""
                          loading="lazy"
                        />

                        <div>
                          <strong>
                            {service.title}
                          </strong>
                          <small>
                            {service.description.slice(
                              0,
                              75
                            )}
                          </small>
                        </div>
                      </div>
                    </td>

                    <td>
                      {formatPrice(service.price)}
                    </td>

                    <td>
                      {service.display_order}
                    </td>

                    <td>
                      <span
                        className={
                          service.published
                            ? "cc-published"
                            : "cc-unpublished"
                        }
                      >
                        {service.published
                          ? "Published"
                          : "Unpublished"}
                      </span>
                    </td>

                    <td>
                      <div className="cc-service-actions">
                        <button
                          onClick={() =>
                            beginEdit(service)
                          }
                        >
                          Edit
                        </button>

                        <button
                          disabled={saving}
                          onClick={() =>
                            void toggle(service)
                          }
                        >
                          {service.published
                            ? "Unpublish"
                            : "Publish"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && visible.length === 0 && (
              <div className="cc-services-empty">
                No services found.
              </div>
            )}

            {loading && (
              <div className="cc-services-empty">
                Loading services...
              </div>
            )}
          </div>
        </section>
      </main>

      {open && (
        <div
          className="cc-services-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              close();
            }
          }}
        >
          <section
            className="cc-services-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-form-title"
          >
            <div className="cc-services-modal-header">
              <div>
                <p className="cc-services-eyebrow">
                  SERVICE DETAILS
                </p>
                <h2 id="service-form-title">
                  {editing
                    ? "Edit Service"
                    : "Add Service"}
                </h2>
              </div>

              <button
                aria-label="Close form"
                disabled={saving}
                onClick={close}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(event) =>
                void save(event)
              }
            >
              <div className="cc-services-form-body">
                <label className="wide">
                  Service Title *
                  <input
                    required
                    maxLength={160}
                    value={form.title}
                    onChange={(event) =>
                      field(
                        "title",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="wide">
                  Description *
                  <textarea
                    required
                    rows={4}
                    maxLength={3000}
                    value={form.description}
                    onChange={(event) =>
                      field(
                        "description",
                        event.target.value
                      )
                    }
                  />
                </label>

                <div className="cc-upload-field wide">
                  <label htmlFor="cc-service-image">
                    Service Image *
                  </label>

                  <input
                    id="cc-service-image"
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={chooseImage}
                    className="cc-hidden-file"
                  />

                  <div className="cc-upload-zone">
                    {(preview || form.image_path) && (
                      <img
                        src={
                          preview ||
                          form.image_path
                        }
                        alt="Service preview"
                        className="cc-upload-preview"
                      />
                    )}

                    <div className="cc-upload-copy">
                      <button
                        type="button"
                        className="cc-btn-outline"
                        onClick={() =>
                          fileInput.current?.click()
                        }
                        disabled={saving}
                      >
                        {preview || form.image_path
                          ? "Change Image"
                          : "Upload Image"}
                      </button>

                      <small>
                        PNG, JPG, or WebP · Maximum 5 MB
                      </small>

                      {imageFile && (
                        <span className="cc-file-name">
                          {imageFile.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <label>
                  Starting Price (₹)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Leave empty for on request"
                    value={form.price}
                    onChange={(event) =>
                      field(
                        "price",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label>
                  Display Order *
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={form.display_order}
                    onChange={(event) =>
                      field(
                        "display_order",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="cc-publish-option wide">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(event) =>
                      field(
                        "published",
                        event.target.checked
                      )
                    }
                  />
                  Publish this service on the website
                </label>
              </div>

              {error && (
                <p
                  className="cc-modal-error"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <div className="cc-services-form-footer">
                <button
                  type="button"
                  className="cc-btn-outline"
                  onClick={close}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="cc-btn-primary"
                  disabled={saving}
                >
                  {saving
                    ? "Uploading / Saving..."
                    : editing
                      ? "Update Service"
                      : "Save Service"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}