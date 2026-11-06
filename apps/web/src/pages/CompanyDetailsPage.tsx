import AdminNavigation from "../components/AdminNavigation";
import { useEffect, useState, type FormEvent } from "react";
import { createClient, type Session } from "@supabase/supabase-js";
import "../testimonials-admin.css";
import "../company-details.css";

type CompanyDetails = {
  instagram_url: string;
  whatsapp_number: string;
};

type ApiError = { error?: string; details?: unknown };

const API_BASE = (import.meta.env.VITE_API_URL || "/api").replace(/\/$/, "");
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
    })
  : null;

const EMPTY: CompanyDetails = { instagram_url: "", whatsapp_number: "" };

async function requestCompanyDetails(method: "GET" | "PUT", payload?: CompanyDetails): Promise<CompanyDetails> {
  if (!supabase) throw new Error("Supabase is not configured.");
  const { data: { session }, error: authError } = await supabase.auth.getSession();
  if (authError || !session) throw new Error("Session expired. Sign in again from Admin Dashboard.");

  const response = await fetch(`${API_BASE}/admin/company-details`, {
    method,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      ...(payload ? { "Content-Type": "application/json" } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });

  const result = (await response.json().catch(() => ({}))) as ApiError & Partial<CompanyDetails>;
  if (!response.ok) {
    const detail = result.error || `Request failed (HTTP ${response.status})`;
    if (response.status === 404) throw new Error("Company Details API not found (404). Restart the updated backend and verify /api/admin/company-details.");
    if (response.status === 401 || response.status === 403) throw new Error(`${detail}. Check admin login and admin_users access.`);
    if (response.status === 502) throw new Error(`${detail}. Verify the company_details table was created in Supabase.`);
    throw new Error(`${detail} (HTTP ${response.status}).`);
  }
  return {
    instagram_url: result.instagram_url ?? "",
    whatsapp_number: result.whatsapp_number ?? "",
  };
}

export default function CompanyDetailsPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState<CompanyDetails>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    let active = true;
    void supabase.auth.getSession().then(({ data, error: authError }) => {
      if (!active) return;
      if (authError) setError(authError.message);
      setSession(data.session);
      setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, value) => {
      if (!active) return;
      setSession(value);
      setReady(true);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setForm(await requestCompanyDetails("GET"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load company details.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session?.user.id) void load();
    else setForm(EMPTY);
  }, [session?.user.id]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setError("");
    setNotice("");
    let instagram = form.instagram_url.trim();
    const whatsapp = form.whatsapp_number.replace(/[\s()+-]/g, "");

    if (instagram) {
      try {
        const parsed = new URL(instagram);
        if (parsed.protocol !== "https:" || !["instagram.com", "www.instagram.com"].includes(parsed.hostname) || parsed.pathname === "/" || parsed.username || parsed.password || parsed.search || parsed.hash) {
          throw new Error("Invalid Instagram URL");
        }
        instagram = parsed.toString();
      } catch {
        setError("Enter a valid Instagram profile URL: https://www.instagram.com/username/");
        return;
      }
    }
    if (whatsapp && !/^[1-9][0-9]{7,14}$/.test(whatsapp)) {
      setError("WhatsApp number must contain 8–15 digits, including country code, without +.");
      return;
    }

    setSaving(true);
    try {
      setForm(await requestCompanyDetails("PUT", { instagram_url: instagram, whatsapp_number: whatsapp }));
      setNotice("Company Details saved successfully. Refresh the public website to see the updated links.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save company details.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="testimonial-admin cc-company-admin cc-admin-unified">
      <AdminNavigation email={session?.user.email} onSignOut={() => supabase?.auth.signOut().then(() => {})} />

      <main className="testimonial-content cc-company-content">
        <header className="testimonial-header">
          <div>
            <p className="testimonial-eyebrow">CULT CONTOUR / ADMIN</p>
            <h1>Company Details</h1>
          </div>
          <button type="button" className="testimonial-outline" disabled={loading || !session} onClick={() => void load()}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </header>

        <section className="testimonial-panel cc-company-panel">
          <div className="testimonial-panel-heading cc-company-panel-heading">
            <div>
              <p className="testimonial-eyebrow">SOCIAL & CONTACT SETTINGS</p>
              <h2>Website Contact Information</h2>
              <p className="cc-company-description">Update the Instagram and WhatsApp links displayed on the public website.</p>
            </div>
          </div>

          {!ready ? (
            <p className="cc-company-state">Checking admin session...</p>
          ) : !supabase ? (
            <p role="alert" className="cc-company-alert error">Supabase environment variables are missing.</p>
          ) : !session ? (
            <p className="cc-company-state">Please <a href="/admin">sign in</a> to manage company settings.</p>
          ) : (
            <form className="cc-company-form" onSubmit={save}>
              <div className="cc-company-field">
                <label htmlFor="company-instagram">Instagram Profile URL</label>
                <input id="company-instagram" type="url" maxLength={400} placeholder="https://www.instagram.com/yourprofile/" value={form.instagram_url}
                  onChange={e => setForm(prev => ({ ...prev, instagram_url: e.target.value }))} disabled={saving || loading} />
                <small>Used by the “Follow on Instagram” button on your website.</small>
              </div>

              <div className="cc-company-field">
                <label htmlFor="company-whatsapp">WhatsApp Number</label>
                <input id="company-whatsapp" type="tel" inputMode="tel" maxLength={24} placeholder="919876543210" value={form.whatsapp_number}
                  onChange={e => setForm(prev => ({ ...prev, whatsapp_number: e.target.value }))} disabled={saving || loading} />
                <small>Include the country code (91 for India). No plus sign is necessary.</small>
                {form.whatsapp_number.trim() && (
                  <div className="cc-company-link-preview">Chat link: https://wa.me/{form.whatsapp_number.replace(/\D/g, "")}</div>
                )}
              </div>

              {error && <div className="cc-company-alert error" role="alert">{error}</div>}
              {notice && <div className="cc-company-alert success" role="status">{notice}</div>}

              <div className="cc-company-form-footer">
                <span>Saved changes will appear on the website after refresh.</span>
                <button type="submit" className="testimonial-primary" disabled={saving || loading}>
                  {saving ? "Saving..." : "Save Company Details"}
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}