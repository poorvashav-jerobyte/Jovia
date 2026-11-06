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

import "../testimonials-admin.css";

type Testimonial = {
  id: string;
  author: string;
  quote: string;
  context: string;
  display_order: number;
  published: boolean;
  created_at: string;
  review_date: string | null;
  service_name: string;
  rating: number | null;
  photos: string[];
};

type TestimonialForm = {
  author: string;
  quote: string;
  context: string;
  display_order: string;
  published: boolean;
  review_date: string;
  service_name: string;
  rating: number;
  photos: string[];
};

type Filter = "all" | "published" | "draft";

const EMPTY_FORM: TestimonialForm = {
  author: "",
  quote: "",
  context: "",
  display_order: "0",
  published: false,
  review_date: "",
  service_name: "Bridal Makeup",
  rating: 5,
  photos: [],
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const supabase =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

async function adminRequest<T>(
  endpoint: string,
  init: RequestInit = {}
): Promise<T> {
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error("Session expired. Please sign in again.");
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const result: unknown = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    const message =
      result &&
      typeof result === "object" &&
      "error" in result &&
      typeof result.error === "string"
        ? result.error
        : `Request failed (${response.status})`;

    throw new Error(message);
  }

  return result as T;
}

function formFromReview(
  item: Testimonial
): TestimonialForm {
  return {
    author: item.author,
    quote: item.quote,
    context: item.context,
    display_order: String(item.display_order),
    published: item.published,
    review_date: item.review_date || "",
    service_name: item.service_name || "Bridal Makeup",
    rating: item.rating || 5,
    photos: item.photos || [],
  };
}

export default function TestimonialsPage() {
  const { settings } = useCompanySettings();
  const [session, setSession] =
    useState<Session | null>(null);

  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  const [reviews, setReviews] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const [editing, setEditing] =
    useState<Testimonial | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] =
    useState<TestimonialForm>({ ...EMPTY_FORM });

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;

      if (error) setError(error.message);

      setSession(data.session);
      setAuthReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return;

      setSession(next);
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadReviews = useCallback(async () => {
    if (!supabase) return;

    setLoading(true);
    setError("");

    try {
      const rows = await adminRequest<Testimonial[]>(
        "/admin/testimonials"
      );
      setReviews(rows);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load testimonials."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const userId = session?.user.id;

  useEffect(() => {
    if (userId) {
      void loadReviews();
    } else {
      setReviews([]);
    }
  }, [userId, loadReviews]);

  const stats = useMemo(() => {
    const published = reviews.filter(
      (item) => item.published
    ).length;

    return {
      total: reviews.length,
      published,
      unpublished: reviews.length - published,
    };
  }, [reviews]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reviews.filter((item) => {
      if (
        filter === "published" &&
        !item.published
      ) return false;

      if (
        filter === "draft" &&
        item.published
      ) return false;

      return (
        !query ||
        `${item.author} ${item.context} ${item.service_name || ""} ${item.quote}`
          .toLowerCase()
          .includes(query)
      );
    });
  }, [reviews, filter, search]);

  function updateForm<K extends keyof TestimonialForm>(
    key: K,
    value: TestimonialForm[K]
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function openAdd() {
    const nextOrder =
      Math.max(0, ...reviews.map(
        (item) => item.display_order
      )) + 1;

    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      display_order: String(nextOrder),
    });

    setError("");
    setNotice("");
    setFormOpen(true);
  }

  function openEdit(item: Testimonial) {
    setEditing(item);
    setForm(formFromReview(item));

    setError("");
    setNotice("");
    setFormOpen(true);
  }

  function closeForm() {
    if (saving || uploading) return;
    setFormOpen(false);
    setEditing(null);
    setError("");
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;

    const order = Number(form.display_order);

    if (
      !Number.isInteger(order) ||
      order < 0 ||
      order > 10000
    ) {
      setError("Display order must be between 0 and 10000.");
      return;
    }

    const payload = {
      author: form.author.trim(),
      quote: form.quote.trim(),
      context: form.context.trim(),
      display_order: order,
      published: form.published,
      review_date: form.review_date || null,
      service_name: form.service_name.trim(),
      rating: form.rating,
      photos: form.photos,
    };

    if (payload.author.length < 2 || payload.quote.length < 10) {
      setError(
        "Enter a customer name and a review of at least 10 characters."
      );
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const wasEditing = Boolean(editing);

      await adminRequest<Testimonial>(
        editing
          ? `/admin/testimonials/${editing.id}`
          : "/admin/testimonials",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        }
      );

      setFormOpen(false);
      setEditing(null);

      await loadReviews();

      setNotice(
        wasEditing
          ? "Testimonial updated successfully."
          : "Testimonial created successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save testimonial."
      );
    } finally {
      setSaving(false);
    }
  }

  async function togglePublished(item: Testimonial) {
    if (saving) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      await adminRequest<Testimonial>(
        `/admin/testimonials/${item.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            author: item.author,
            quote: item.quote,
            context: item.context,
            display_order: item.display_order,
            published: !item.published,
            review_date: item.review_date || null,
            service_name: item.service_name || "Bridal Makeup",
            rating: item.rating,
            photos: item.photos || [],
          }),
        }
      );

      await loadReviews();

      setNotice(
        item.published
          ? "Testimonial unpublished successfully."
          : "Testimonial published successfully."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update publishing status."
      );
    } finally {
      setSaving(false);
    }
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const selected = Array.from(files);
    if (form.photos.length + selected.length > 5) {
      setError("Maximum 5 photos per review.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const uploaded: string[] = [];
      for (const file of selected) {
        if (!(["image/jpeg", "image/png", "image/webp"].includes(file.type)) || file.size > 5 * 1024 * 1024) {
          throw new Error("Each photo must be JPG, PNG or WebP, up to 5 MB.");
        }
        const { data: { session: current } } = await supabase!.auth.getSession();
        if (!current) throw new Error("Sign in again to upload photos.");
        const response = await fetch(`${API_BASE}/admin/testimonials/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${current.access_token}`, "Content-Type": file.type },
          body: file,
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || "Photo upload failed");
        uploaded.push(result.photo_url);
      }
      setForm(previous => ({ ...previous, photos: [...previous.photos, ...uploaded] }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to upload photos.");
    } finally {
      setUploading(false);
    }
  }

  async function signIn(event: FormEvent<HTMLFormElement>) {
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
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to sign in."
      );
    } finally {
      setSigningIn(false);
    }
  }

  async function signOut() {
    if (!supabase) return;

    const { error: authError } =
      await supabase.auth.signOut();

    if (authError) setError(authError.message);
  }

  if (!supabase) {
    return (
      <main className="testimonial-state">
        Configure Supabase in apps/web/.env.local.
      </main>
    );
  }

  if (!authReady) {
    return (
      <main className="testimonial-state">
        Checking admin session...
      </main>
    );
  }

  if (!session) {
    return (
      <main className="testimonial-state">
        <form className="testimonial-login" onSubmit={signIn}>
          <a className="testimonial-brand" href="/">
            {settings.company_name}
          </a>

          <h1>Admin Sign In</h1>
          <p>Sign in to manage client testimonials.</p>

          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label>
            Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && (
            <p className="testimonial-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={signingIn}>
            {signingIn ? "Signing in..." : "Sign In"}
          </button>

          <a href="/admin">Back to Dashboard</a>
        </form>
      </main>
    );
  }

  return (
    <div className="testimonial-admin cc-admin-unified">
      <AdminNavigation email={session.user.email} onSignOut={signOut} />

      <main className="testimonial-content">
        <header className="testimonial-header">
          <div>
            <p className="testimonial-eyebrow">
              {settings.company_name.toUpperCase()} / ADMIN
            </p>
            <h1>Customer Reviews Management</h1>
          </div>

          <div className="testimonial-header-actions">
            <button
              className="testimonial-outline"
              disabled={loading}
              onClick={() => void loadReviews()}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
            <button
              className="testimonial-primary"
              onClick={openAdd}
            >
              + Add Customer Review
            </button>
          </div>
        </header>

        {error && !formOpen && (
          <div className="testimonial-alert error" role="alert">
            {error}
          </div>
        )}

        {notice && (
          <div className="testimonial-alert success" role="status">
            {notice}
          </div>
        )}

        <section className="testimonial-stats">
          <article>
            <span>Total Reviews</span>
            <strong>{stats.total}</strong>
          </article>
          <article>
            <span>Published</span>
            <strong>{stats.published}</strong>
          </article>
          <article>
            <span>Unpublished</span>
            <strong>{stats.unpublished}</strong>
          </article>
        </section>

        <section className="testimonial-panel">
          <div className="testimonial-panel-heading">
            <div>
              <p className="testimonial-eyebrow">
                CLIENT FEEDBACK
              </p>
              <h2>Customer Reviews & Makeup Photos</h2>
            </div>
            <span>{filtered.length} results</span>
          </div>

          <div className="testimonial-filters">
            <input
              type="search"
              placeholder="Search name or review..."
              aria-label="Search testimonials"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <select
              aria-label="Filter testimonials"
              value={filter}
              onChange={(event) =>
                setFilter(event.target.value as Filter)
              }
            >
              <option value="all">All Testimonials</option>
              <option value="published">Published</option>
              <option value="draft">Unpublished</option>
            </select>
          </div>

          <div className="testimonial-table-wrap">
            <table className="testimonial-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Service / Date</th>
                  <th>Rating / Photos</th>
                  <th>Review</th>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.author}</strong>
                      <small>{item.context || "—"}</small>
                    </td>
                    <td>{item.service_name || "—"}<small>{item.review_date || "—"}</small></td>
                    <td><span className="review-table-stars">{item.rating ? "★".repeat(item.rating) : "—"}</span><small>{(item.photos || []).length} photos</small></td>
                    <td className="testimonial-quote">
                      {item.quote}
                    </td>
                    <td>{item.display_order}</td>
                    <td>
                      <span
                        className={
                          item.published
                            ? "testimonial-published"
                            : "testimonial-unpublished"
                        }
                      >
                        {item.published
                          ? "Published"
                          : "Unpublished"}
                      </span>
                    </td>
                    <td>
                      <div className="testimonial-actions">
                        <button
                          type="button"
                          onClick={() => openEdit(item)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            void togglePublished(item)
                          }
                        >
                          {item.published
                            ? "Unpublish"
                            : "Publish"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!loading && filtered.length === 0 && (
              <div className="testimonial-empty">
                No testimonials found.
              </div>
            )}

            {loading && (
              <div className="testimonial-empty">
                Loading testimonials...
              </div>
            )}
          </div>
        </section>
      </main>

      {formOpen && (
        <div
          className="testimonial-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <section
            className="testimonial-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="testimonial-form-title"
          >
            <header className="testimonial-modal-header">
              <div>
                <p className="testimonial-eyebrow">
                  CUSTOMER REVIEW
                </p>
                <h2 id="testimonial-form-title">
                  {editing
                    ? "Edit Testimonial"
                    : "Add Customer Review"}
                </h2>
              </div>

              <button
                type="button"
                aria-label="Close form"
                disabled={saving}
                onClick={closeForm}
              >
                ×
              </button>
            </header>

            <form onSubmit={(event) => void saveReview(event)}>
              <div className="testimonial-form-body">
                <label>
                  Customer Name *
                  <input
                    required
                    minLength={2}
                    maxLength={120}
                    value={form.author}
                    onChange={(event) =>
                      updateForm("author", event.target.value)
                    }
                  />
                </label>

                <label>
                  Customer Context (optional)
                  <input
                    maxLength={200}
                    placeholder="Bride · Delhi Wedding"
                    value={form.context}
                    onChange={(event) =>
                      updateForm("context", event.target.value)
                    }
                  />
                </label>

                <label>
                  Review Date
                  <input type="date" value={form.review_date} onChange={event => updateForm("review_date", event.target.value)} />
                </label>

                <label>
                  Service Taken *
                  <select required value={form.service_name} onChange={event => updateForm("service_name", event.target.value)}>
                    {["Bridal Makeup", "Engagement Makeup", "Party Makeup", "Photoshoot Makeup", "Editorial Makeup", "Other"].map(service => <option key={service} value={service}>{service}</option>)}
                  </select>
                </label>

                <fieldset className="review-rating-field wide">
                  <legend>Star Rating *</legend>
                  <div className="review-rating-picker" aria-label="Select rating">
                    {[1,2,3,4,5].map(star => <button type="button" key={star} aria-label={`${star} stars`} aria-pressed={form.rating === star} onClick={() => updateForm("rating", star)} className={star <= form.rating ? "selected" : ""}>★</button>)}
                    <span>{form.rating} / 5</span>
                  </div>
                </fieldset>

                <div className="wide review-photo-field">
                  <strong>Customer Makeup Photos</strong>
                  <p>Up to 5 photos. JPG, PNG or WebP, max 5 MB each. Upload with customer permission.</p>
                  <input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={uploading || form.photos.length >= 5} onChange={event => { void uploadPhotos(event.target.files); event.target.value = ""; }} />
                  {uploading && <p role="status">Uploading photos...</p>}
                  <div className="review-photo-previews">
                    {form.photos.map((photo, i) => <div key={photo} className="review-photo-preview"><img src={photo} alt={`Uploaded makeup photo ${i+1}`} /><button type="button" aria-label={`Remove photo ${i+1}`} onClick={() => updateForm("photos", form.photos.filter((_, index) => index !== i))}>×</button></div>)}
                  </div>
                </div>

                <label className="wide">
                  Customer Review *
                  <textarea
                    required
                    minLength={10}
                    maxLength={2000}
                    rows={5}
                    value={form.quote}
                    onChange={(event) =>
                      updateForm("quote", event.target.value)
                    }
                  />
                </label>

                <label>
                  Display Order *
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    step="1"
                    required
                    value={form.display_order}
                    onChange={(event) =>
                      updateForm(
                        "display_order",
                        event.target.value
                      )
                    }
                  />
                </label>

                <label className="testimonial-publish-option">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(event) =>
                      updateForm(
                        "published",
                        event.target.checked
                      )
                    }
                  />
                  Publish on website
                </label>
              </div>

              {error && (
                <p className="testimonial-modal-error" role="alert">
                  {error}
                </p>
              )}

              <footer className="testimonial-modal-footer">
                <button
                  type="button"
                  className="testimonial-outline"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  className="testimonial-primary"
                  type="submit"
                  disabled={saving || uploading}
                >
                  {saving
                    ? "Saving..."
                    : editing
                      ? "Update Testimonial"
                      : "Save Testimonial"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}