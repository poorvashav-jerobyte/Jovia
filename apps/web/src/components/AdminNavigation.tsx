
import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAdminAccess } from "../AdminAccess";
import { useCompanySettings } from "../CompanySettings";

type Item = {
  label: string;
  path: string;
  icon: ReactNode;
  match?: (path: string, hash: string) => boolean;
};

const items: Item[] = [
  {
    label: "Dashboard",
    path: "/admin",
    icon: <span className="cc-admin-glyph">▦</span>,
    match: (path, hash) =>
      path === "/admin" && hash !== "#inquiries",
  },
  {
    label: "Bookings",
    path: "/admin#inquiries",
    icon: <span className="cc-admin-glyph">▤</span>,
    match: (path, hash) =>
      path === "/admin" && hash === "#inquiries",
  },
  {
    label: "Services",
    path: "/admin/services",
    icon: <span className="cc-admin-glyph">✧</span>,
  },
  {
    label: "Customer Reviews",
    path: "/admin/testimonials",
    icon: <span className="cc-admin-glyph">☆</span>,
  },
  {
    label: "The Artist",
    path: "/admin/artist",
    icon: <span className="cc-admin-glyph">✦</span>,
  },
  {
    label: "Company Details",
    path: "/admin/company-details",
    icon: <span className="cc-admin-glyph">⚙</span>,
  },
  {
    label: "User Access",
    path: "/admin/user-access",
    icon: <span className="cc-admin-glyph">♙</span>,
  },
];

export default function AdminNavigation({
  email,
  onSignOut,
}: {
  email?: string | null;
  onSignOut: () => void | Promise<void>;
}) {
  const { profile } = useAdminAccess();
  const [open, setOpen] = useState(false);
  const { settings } = useCompanySettings();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function navigateItem(path: string) {
    setOpen(false);

    if (path === "/admin#inquiries") {
      navigate(path);

      if (location.pathname === "/admin") {
        window.requestAnimationFrame(() => {
          document
            .getElementById("inquiries")
            ?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
        });
      }
    } else {
      navigate(path);
    }
  }

  const visibleItems = items.filter((item) => {
    if (!profile) {
      return item.path !== "/admin/user-access";
    }

    if (
      profile.role === "admin" ||
      profile.role === "super_admin"
    ) {
      return true;
    }

    if (profile.role === "manager") {
      return true;
    }

    return [
      "/admin",
      "/admin#inquiries",
      "/admin/services",
    ].includes(item.path);
  });

  return (
    <>
      <header className="cc-admin-mobile-bar">
        <span className="cc-admin-mobile-brand">
          {settings.company_name}
          <small>ADMIN</small>
        </span>

        <button
          type="button"
          className="cc-admin-hamburger"
          aria-label={open ? "Close admin menu" : "Open admin menu"}
          aria-expanded={open}
          aria-controls="cc-admin-shared-nav"
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <span aria-hidden="true">✕</span>
          ) : (
            <span aria-hidden="true">☰</span>
          )}
        </button>
      </header>

      {open && (
        <button
          type="button"
          className="cc-admin-overlay"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        id="cc-admin-shared-nav"
        className={`cc-admin-shared-sidebar${
          open ? " is-open" : ""
        }`}
      >
        <div className="cc-admin-shared-brand">
          <span className="cc-admin-brand-mark">✦</span>

          <div>
            {settings.company_name}
            <small>ADMINISTRATION</small>
          </div>
        </div>

        <nav
          aria-label="Admin navigation"
          className="cc-admin-shared-links"
        >
          {visibleItems.map((item) => {
            const active = item.match
              ? item.match(location.pathname, location.hash)
              : location.pathname === item.path;

            return (
              <button
                key={item.label}
                type="button"
                className={`cc-admin-shared-link${
                  active ? " active" : ""
                }`}
                aria-current={active ? "page" : undefined}
                onClick={() => navigateItem(item.path)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}

          <a
            className="cc-admin-shared-link"
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
          >
            <span className="cc-admin-glyph">↗</span>
            <span>View Website</span>
          </a>
        </nav>

        <div className="cc-admin-shared-account">
          <span className="cc-admin-account-label">
            SIGNED IN AS
          </span>

          <span className="cc-admin-account-email">
            {profile?.full_name || email || "Not signed in"}
          </span>

          {profile && (
            <span
              className="cc-admin-account-email"
              style={{
                textTransform: "capitalize",
                color: "#e7c59c",
              }}
            >
              {profile.role.replace("_", " ")}
            </span>
          )}

          <button
            type="button"
            className="cc-admin-shared-signout"
            onClick={() => {
              setOpen(false);
              void onSignOut();
            }}
          >
            <span className="cc-admin-glyph">↪</span>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
