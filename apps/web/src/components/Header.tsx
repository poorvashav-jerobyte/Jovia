
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./HeaderCompact.css";

const API_URL =
  import.meta.env.VITE_API_URL || "/api";

const links = [
  ["Home", "/#home"],
  ["About", "/#about"],
  ["Services", "/#services"],
  ["Portfolio", "/#portfolio"],
  ["Reviews", "/#reviews"],
  ["Contact", "/contact"],
] as const;

type CompanyDetails = {
  company_name?: string;
};

export default function Header() {
  const [open, setOpen] = useState(false);
  const [companyName, setCompanyName] =
    useState("Jovia MUA");

  useEffect(() => {
    const controller = new AbortController();

    const loadCompanyName = async () => {
      try {
        const response = await fetch(
          `${API_URL}/company-details`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Unable to load company details");
        }

        const data: CompanyDetails = await response.json();

        if (data.company_name?.trim()) {
          setCompanyName(data.company_name.trim());
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Company details:", error);
        }
      }
    };

    void loadCompanyName();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    const handleResize = () => {
      if (window.innerWidth > 900) {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  const closeMenu = () => setOpen(false);

  const renderLinks = (mobile = false) =>
    links.map(([label, to]) => {
      const className = mobile
        ? "jovia-mobile-link"
        : "jovia-desktop-link";

      if (to.startsWith("/#")) {
        return (
          <a
            key={label}
            href={to}
            className={className}
            onClick={closeMenu}
          >
            {label}
          </a>
        );
      }

      return (
        <Link
          key={label}
          to={to}
          className={className}
          onClick={closeMenu}
        >
          {label}
        </Link>
      );
    });

  return (
    <>
      <header className="site-header jovia-compact-glass">
        <Link
          to="/"
          className="logo jovia-glass-logo"
          onClick={closeMenu}
        >
          {companyName}
        </Link>

        <nav
          className="desktop-nav jovia-desktop-nav"
          aria-label="Primary navigation"
        >
          {renderLinks()}
        </nav>

        <Link
          to="/contact"
          className="nav-cta jovia-desktop-cta"
          onClick={closeMenu}
        >
          Book Consultation
        </Link>

        <button
          type="button"
          className={`hamburger jovia-glass-menu ${
            open ? "is-open" : ""
          }`}
          aria-label={
            open ? "Close navigation menu" : "Open navigation menu"
          }
          aria-expanded={open}
          aria-controls="jovia-mobile-navigation"
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
        </button>
      </header>

      {open && (
        <>
          <button
            type="button"
            className="jovia-menu-backdrop"
            onClick={closeMenu}
            aria-label="Close navigation menu"
          />

          <nav
            id="jovia-mobile-navigation"
            className="mobile-menu jovia-mobile-panel"
            aria-label="Mobile navigation"
          >
            <div className="jovia-mobile-panel-top">
              <span className="jovia-mobile-title">
                {companyName}
              </span>

              <button
                type="button"
                className="menu-close jovia-mobile-close"
                onClick={closeMenu}
                aria-label="Close menu"
              >
                ×
              </button>
            </div>

            <div className="jovia-mobile-links">
              {renderLinks(true)}
            </div>

            <Link
              to="/contact"
              className="jovia-mobile-book"
              onClick={closeMenu}
            >
              Book Consultation
            </Link>
          </nav>
        </>
      )}
    </>
  );
}
