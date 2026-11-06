
import { Link } from "react-router-dom";
import { useCompanySettings } from "../CompanySettings";
import "../FooterLuxury.css";

// ============================================
// ARROW ICON
// ============================================

function ArrowIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

// ============================================
// INSTAGRAM ICON
// ============================================

function InstagramIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="2.5"
        y="2.5"
        width="19"
        height="19"
        rx="5"
      />

      <circle
        cx="12"
        cy="12"
        r="4.2"
      />

      <circle
        cx="17.7"
        cy="6.5"
        r="1"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

// ============================================
// WHATSAPP ICON - OFFICIAL STYLE
// ============================================

function WhatsAppIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20.52 3.48A11.87 11.87 0 0 0 12.05 0C5.46 0 .1 5.36.1 11.95c0 2.1.55 4.16 1.6 5.98L0 24l6.23-1.63a11.95 11.95 0 0 0 5.81 1.48h.01c6.59 0 11.95-5.36 11.95-11.95 0-3.19-1.24-6.2-3.48-8.42ZM12.05 21.83a9.91 9.91 0 0 1-5.05-1.38l-.36-.21-3.7.97.99-3.61-.23-.37a9.9 9.9 0 0 1-1.52-5.28c0-5.46 4.44-9.9 9.9-9.9a9.84 9.84 0 0 1 7 2.9 9.85 9.85 0 0 1 2.9 7c0 5.46-4.44 9.9-9.93 9.9Zm5.43-7.42c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.49s1.07 2.89 1.22 3.09c.15.2 2.1 3.21 5.1 4.5.71.31 1.27.49 1.71.62.72.23 1.37.2 1.89.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
    </svg>
  );
}

// ============================================
// FOOTER LINKS
// ============================================

const navigationLinks = [
  {
    label: "Home",
    href: "/#home",
  },
  {
    label: "About the Artist",
    href: "/#about",
  },
  {
    label: "Our Services",
    href: "/#services",
  },
  {
    label: "Client Reviews",
    href: "/#reviews",
  },
  {
    label: "Portfolio",
    href: "/#portfolio",
  },
];

const serviceLinks = [
  "Bridal Makeup",
  "Engagement Makeup",
  "Party & Event Makeup",
  "Editorial & Photoshoot",
  "Makeup Masterclasses",
];

// ============================================
// FOOTER COMPONENT
// ============================================

export default function Footer() {
  const { settings } =
    useCompanySettings();

  const companyName =
    settings.company_name?.trim() ||
    "Jovia MUA";

  const instagramUrl =
    settings.instagram_url?.trim() || "";

  const whatsappNumber =
    settings.whatsapp_number?.trim() || "";

  const whatsappMessage =
    encodeURIComponent(
      `Hello ${companyName}, I would like to enquire about your makeup services.`
    );

  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
    : "";

  const year = new Date().getFullYear();

  return (
    <footer
      className="shared-footer footer jovia-luxury-footer"
      aria-label={`${companyName} website footer`}
    >
      {/* TOP ACCENT */}

      <div
        className="jovia-footer-topline"
        aria-hidden="true"
      />

      {/* =====================================
          BRAND INTRODUCTION
         ===================================== */}

      <div className="jovia-footer-intro">
        <div
          className="jovia-footer-decor"
          aria-hidden="true"
        >
          <span className="jovia-footer-decor-line" />

          <span className="jovia-footer-decor-star">
            ✦
          </span>

          <span className="jovia-footer-decor-line" />
        </div>

        <p className="jovia-footer-kicker">
          BEAUTY WITH INTENTION
        </p>

        <h2 className="jovia-footer-brand">
          {companyName}
        </h2>

        <p className="jovia-footer-intro-text">
          Timeless beauty, thoughtfully created.
          Elevating your most memorable moments
          through artistry, elegance and a
          personal touch.
        </p>
      </div>

      {/* =====================================
          FOOTER COLUMNS
         ===================================== */}

      <div className="jovia-footer-columns">
        {/* EXPLORE */}

        <div className="jovia-footer-column">
          <h3 className="jovia-footer-heading">
            Explore
          </h3>

          <nav
            className="jovia-footer-link-list"
            aria-label="Footer navigation"
          >
            {navigationLinks.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="jovia-footer-text-link"
              >
                <span>{item.label}</span>
                <ArrowIcon />
              </a>
            ))}
          </nav>
        </div>

        {/* SERVICES */}

        <div className="jovia-footer-column">
          <h3 className="jovia-footer-heading">
            Our Expertise
          </h3>

          <nav
            className="jovia-footer-link-list"
            aria-label="Makeup services"
          >
            {serviceLinks.map((service) => (
              <a
                key={service}
                href="/#services"
                className="jovia-footer-text-link"
              >
                <span>{service}</span>
                <ArrowIcon />
              </a>
            ))}
          </nav>
        </div>

        {/* =====================================
            GET IN TOUCH
           ===================================== */}

        <div className="jovia-footer-column jovia-footer-contact">
          <h3 className="jovia-footer-heading">
            Get in Touch
          </h3>

          <p className="jovia-footer-contact-description">
            Have a special occasion in mind?
            We'd love to hear from you.
          </p>

          {/* ENQUIRY BUTTON */}

          <Link
            to="/contact"
            className="jovia-footer-contact-button"
          >
            <span>
              Send an Enquiry
            </span>

            <ArrowIcon />
          </Link>

          {/* WHATSAPP BUTTON */}

          {whatsappLink && (
            <a
              href={whatsappLink}
              className="jovia-footer-whatsapp-button"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ask on WhatsApp"
            >
              <WhatsAppIcon />

              <span>
                Ask on WhatsApp
              </span>

              <ArrowIcon />
            </a>
          )}

          {/* INSTAGRAM BUTTON */}

          {instagramUrl && (
            <a
              href={instagramUrl}
              className="jovia-footer-instagram-button"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow on Instagram"
            >
              <InstagramIcon />

              <span>
                Follow on Instagram
              </span>

              <ArrowIcon />
            </a>
          )}
        </div>
      </div>

      {/* =====================================
          DECORATIVE DIVIDER
         ===================================== */}

      <div
        className="jovia-footer-divider"
        aria-hidden="true"
      >
        <span />

        <span className="jovia-footer-divider-icon">
          ✦
        </span>

        <span />
      </div>

      {/* =====================================
          COPYRIGHT
         ===================================== */}

      <div className="jovia-footer-bottom">
        <p>
          © {year} {companyName}.
          All rights reserved.
        </p>

        <p className="jovia-footer-bottom-tagline">
          CRAFTED WITH LOVE & ARTISTRY
        </p>

        <a
          className="jovia-footer-back-top"
          href="/#home"
          aria-label="Back to top"
        >
          Back to Top

          <span aria-hidden="true">
            ↑
          </span>
        </a>
      </div>
    </footer>
  );
}
