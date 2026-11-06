
import { useEffect, useRef, useState } from "react";
import {
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";

import { useCompanySettings } from "./CompanySettings";

import Header from "./components/Header";
import BrushHero from "./components/BrushHero";
import ArtistSection from "./components/ArtistSection";
import BeautyServicesScroll from "./components/BeautyServicesScroll";
import Footer from "./components/Footer";
import Contact from "./components/Contact";

import {
  apiGet,
  type Testimonial,
} from "./lib/api";

import "./social-actions.css";

// ============================================
// SOCIAL ICONS
// ============================================

function WhatsAppIcon({
  size = 20,
}: {
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
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

function InstagramIcon() {
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
      xmlns="http://www.w3.org/2000/svg"
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
// REVIEW PHOTO CAROUSEL
// ============================================

type ReviewPhotoCarouselProps = {
  photos: string[];
  author: string;
  number: number;
};

function ReviewPhotoCarousel({
  photos,
  author,
  number,
}: ReviewPhotoCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const [active, setActive] = useState(0);

  const showControls = photos.length > 1;

  const goTo = (index: number) => {
    const track = trackRef.current;

    if (!track) return;

    const next = Math.max(
      0,
      Math.min(photos.length - 1, index)
    );

    track.scrollTo({
      left: next * track.clientWidth,
      behavior: "smooth",
    });

    setActive(next);
  };

  const onTrackScroll = () => {
    const track = trackRef.current;

    if (!track || !track.clientWidth) {
      return;
    }

    const next = Math.max(
      0,
      Math.min(
        photos.length - 1,
        Math.round(
          track.scrollLeft / track.clientWidth
        )
      )
    );

    setActive((previous) =>
      previous === next ? previous : next
    );
  };

  return (
    <div className="client-review-media">
      <div className="client-review-photo">
        <div
          className="client-review-slides"
          ref={trackRef}
          onScroll={onTrackScroll}
          aria-label={`${author} makeup photo gallery`}
          tabIndex={showControls ? 0 : -1}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              goTo(active + 1);
            }

            if (event.key === "ArrowLeft") {
              event.preventDefault();
              goTo(active - 1);
            }
          }}
        >
          {photos.length ? (
            photos.map((photo, index) => (
              <div
                className="client-review-slide"
                key={`${photo}-${index}`}
              >
                <img
                  src={photo}
                  alt={`${author} makeup look ${
                    index + 1
                  } of ${photos.length}`}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              </div>
            ))
          ) : (
            <div className="client-review-slide">
              <div className="client-review-photo-empty">
                <span aria-hidden="true">
                  ✦
                </span>

                <span>
                  CLIENT MOMENTS
                </span>

                <small>
                  Photo coming soon
                </small>
              </div>
            </div>
          )}
        </div>

        <span className="client-review-index">
          {String(number).padStart(2, "0")}
        </span>

        {showControls && (
          <>
            <span className="client-review-photo-count">
              {active + 1} / {photos.length}
            </span>

            <button
              type="button"
              className="client-review-arrow client-review-arrow--prev"
              aria-label={`Previous photo for ${author}`}
              disabled={active === 0}
              onClick={() => goTo(active - 1)}
            >
              ‹
            </button>

            <button
              type="button"
              className="client-review-arrow client-review-arrow--next"
              aria-label={`Next photo for ${author}`}
              disabled={
                active === photos.length - 1
              }
              onClick={() => goTo(active + 1)}
            >
              ›
            </button>

            <div
              className="client-review-dots"
              aria-label="Choose photo"
            >
              {photos.map((_, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => goTo(index)}
                  className={
                    index === active
                      ? "is-active"
                      : ""
                  }
                  aria-current={
                    index === active
                      ? "true"
                      : undefined
                  }
                  aria-label={`Show photo ${
                    index + 1
                  } of ${photos.length} for ${author}`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showControls && (
        <div
          className="client-review-photo-strip"
          aria-label={`${author} photo thumbnails`}
        >
          {photos.map((photo, index) => (
            <button
              type="button"
              key={`${photo}-thumb-${index}`}
              className={`client-review-thumb${
                index === active
                  ? " is-active"
                  : ""
              }`}
              onClick={() => goTo(index)}
              aria-label={`Show ${author} makeup photo ${
                index + 1
              } of ${photos.length}`}
              aria-pressed={index === active}
            >
              <img
                src={photo}
                alt=""
                loading="lazy"
                decoding="async"
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// HOME PAGE
// ============================================

type HomeProps = {
  instagramUrl: string;
  companyName: string;
};

function Home({
  instagramUrl,
  companyName,
}: HomeProps) {
  const [testimonials, setTestimonials] =
    useState<Testimonial[]>([]);

  useEffect(() => {
    let active = true;

    apiGet<Testimonial[]>("/testimonials")
      .then((rows) => {
        if (active) {
          setTestimonials(rows);
        }
      })
      .catch((error) => {
        console.error(
          "Unable to load testimonials:",
          error
        );
      });

    return () => {
      active = false;
    };
  }, []);

  const instagramHandle = (() => {
    if (!instagramUrl) {
      return companyName;
    }

    try {
      const url = new URL(instagramUrl);

      return (
        url.pathname
          .split("/")
          .filter(Boolean)[0] ||
        companyName
      );
    } catch {
      return companyName;
    }
  })();

  return (
    <>
      {/* HERO */}

      <BrushHero />

      {/* ARTIST MANAGEMENT CONTENT */}

      <ArtistSection />

      {/* BEAUTY SERVICES */}

      <BeautyServicesScroll />

      {/* =====================================
          THE JOVIA MUA STANDARD
         ===================================== */}

      <section className="section standard standard--editorial reveal-section is-visible">
        <div
          className="standard-ambient"
          aria-hidden="true"
        />

        <div className="standard-content">
          <header className="standard-intro">
            <div className="standard-intro-copy">
              <p className="eyebrow standard-eyebrow">
                <span
                  className="standard-eyebrow-line"
                  aria-hidden="true"
                />

                THE {companyName.toUpperCase()} PROMISE
              </p>

              <h2>
                What Makes{" "}
                <em>{companyName}</em>
                <span> Different.</span>
              </h2>
            </div>

            <div className="standard-intro-aside">
              <span
                className="standard-aside-mark"
                aria-hidden="true"
              >
                ✦
              </span>

              <p>
                Every detail matters. From the
                first conversation to the final
                touch, your experience is
                thoughtfully curated.
              </p>

              <span className="standard-aside-caption">
                BEAUTY WITH INTENTION
              </span>
            </div>
          </header>

          <div className="standard-grid">
            {[
              {
                number: "01",
                symbol: "✧",
                name: "Premium Products",
                description:
                  "Luxury and professional-grade formulas exclusively.",
                detail: "THE FINEST FINISH",
              },
              {
                number: "02",
                symbol: "◇",
                name: "Customised Looks",
                description:
                  "Every look tailored precisely to your features, skin tone, and occasion.",
                detail: "UNIQUELY YOU",
              },
              {
                number: "03",
                symbol: "◷",
                name: "Long-Wear Artistry",
                description:
                  "Designed to photograph beautifully and last throughout your event.",
                detail: "BEAUTY THAT LASTS",
              },
              {
                number: "04",
                symbol: "✦",
                name: "Hygiene Standards",
                description:
                  "Professional sanitation practices on every appointment.",
                detail: "CARE IN EVERY DETAIL",
              },
            ].map(
              ({
                number,
                symbol,
                name,
                description,
                detail,
              }) => (
                <article
                  className="standard-card reveal-item is-visible"
                  key={name}
                >
                  <div className="standard-card-top">
                    <span
                      className="standard-symbol"
                      aria-hidden="true"
                    >
                      {symbol}
                    </span>

                    <span className="standard-number">
                      {number} / 04
                    </span>
                  </div>

                  <div className="standard-card-body">
                    <span className="standard-card-detail">
                      {detail}
                    </span>

                    <h3>{name}</h3>

                    <p>{description}</p>
                  </div>

                  <span
                    className="standard-card-rule"
                    aria-hidden="true"
                  />
                </article>
              )
            )}
          </div>

          {/* INLINE CONSULTATION ARROW */}

          <div className="standard-bottom">
            <div className="standard-bottom-note jovia-standard-note">
              <span
                className="standard-bottom-star"
                aria-hidden="true"
              >
                ✳
              </span>

              <span>
                A personal approach. An
                unforgettable result.
              </span>

              <Link
                className="jovia-note-arrow"
                to="/contact"
                aria-label="Book a consultation"
                title="Book a consultation"
              >
                ↗
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================
          CUSTOMER REVIEWS
         ===================================== */}

      <section
        className="client-review-gallery reveal-section is-visible"
        id="reviews"
        aria-labelledby="client-reviews-heading"
      >
        <div
          className="client-review-glow"
          aria-hidden="true"
        />

        <header className="client-review-heading">
          <div>
            <p className="eyebrow">
              REAL MOMENTS · REAL WORDS
            </p>

            <h2 id="client-reviews-heading">
              Beautiful Stories,{" "}
              <em>Beautiful Memories.</em>
            </h2>
          </div>

          <p className="client-review-intro">
            A little love from the people who
            trusted us with their special moments.
          </p>
        </header>

        {testimonials.length > 0 ? (
          <div className="client-review-grid">
            {testimonials.map((review, index) => {
              const withMedia =
                review as Testimonial & {
                  image_path?: string | null;
                  photo_url?: string | null;
                  rating?: number | null;
                  photos?: string[] | null;
                  service_name?: string | null;
                  review_date?: string | null;
                };

              const photos = Array.isArray(
                withMedia.photos
              )
                ? withMedia.photos.slice(0, 5)
                : [];

              if (
                !photos.length &&
                (withMedia.image_path ||
                  withMedia.photo_url)
              ) {
                photos.push(
                  (withMedia.image_path ||
                    withMedia.photo_url)!
                );
              }

              const rating =
                typeof withMedia.rating ===
                  "number" &&
                Number.isInteger(
                  withMedia.rating
                ) &&
                withMedia.rating >= 1 &&
                withMedia.rating <= 5
                  ? withMedia.rating
                  : null;

              return (
                <article
                  className="client-review-card"
                  key={review.id}
                >
                  <ReviewPhotoCarousel
                    photos={photos}
                    author={review.author}
                    number={index + 1}
                  />

                  <div className="client-review-details">
                    <div className="client-review-rating">
                      {rating !== null ? (
                        <>
                          <span
                            className="client-review-stars"
                            aria-label={`${rating} out of 5 stars`}
                            role="img"
                          >
                            {Array.from(
                              { length: 5 },
                              (_, starIndex) => (
                                <span
                                  key={starIndex}
                                  className={
                                    starIndex < rating
                                      ? "is-filled"
                                      : ""
                                  }
                                >
                                  ★
                                </span>
                              )
                            )}
                          </span>

                          <span className="client-review-rating-label">
                            {rating}.0 / 5
                          </span>
                        </>
                      ) : (
                        <span className="client-review-rating-label">
                          VERIFIED CUSTOMER FEEDBACK
                        </span>
                      )}
                    </div>

                    {withMedia.service_name && (
                      <div className="client-review-service">
                        {withMedia.service_name}
                      </div>
                    )}

                    <blockquote>
                      “{review.quote}”
                    </blockquote>

                    <div className="client-review-person">
                      <div>
                        <strong>
                          {review.author}
                        </strong>

                        {withMedia.review_date && (
                          <small>
                            {new Date(
                              `${withMedia.review_date}T12:00:00`
                            ).toLocaleDateString(
                              "en-IN",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )}
                          </small>
                        )}

                        {review.context && (
                          <small>
                            {review.context}
                          </small>
                        )}
                      </div>

                      <span aria-hidden="true">
                        ✧
                      </span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="client-review-empty">
            <span aria-hidden="true">
              ✧
            </span>

            <h3>
              Our Client Stories
            </h3>

            <p>
              Real customer photos, ratings
              and feedback will appear here as
              soon as they are published.
            </p>
          </div>
        )}

        <div className="client-review-bottom">
          <span>
            YOUR MOMENT. YOUR STORY.
          </span>

          <Link
            to="/contact"
            className="client-review-cta"
          >
            Create Your Beautiful Moment{" "}
            <span aria-hidden="true">
              ↗
            </span>
          </Link>
        </div>
      </section>

      {/* =====================================
          INSTAGRAM / PORTFOLIO
         ===================================== */}

      <section
        className="section instagram reveal-section is-visible"
        id="portfolio"
      >
        <p className="eyebrow">
          FOLLOW ALONG
        </p>

        <h2>
          {instagramUrl
            ? `@${instagramHandle}`
            : companyName}
        </h2>

        {instagramUrl && (
          <a
            className="button button--ghost"
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Follow on Instagram →
          </a>
        )}
      </section>

      {/* =====================================
          FINAL CONSULTATION
         ===================================== */}

      <section
        className="final-cta reveal-section is-visible"
        id="contact"
      >
        <h2>
          Ready to Begin?
        </h2>

        <p>
          Whether you are a bride planning your
          wedding beauty, a client preparing
          for a special occasion, or someone
          who wants to learn makeup from the
          ground up — the process begins with
          a conversation.
        </p>

        <Link
          className="button button--fill"
          to="/contact"
        >
          Book a Consultation
        </Link>
      </section>
    </>
  );
}

// ============================================
// SCROLL TO HASH
// ============================================

function ScrollToHash() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const timeout = window.setTimeout(
        () => {
          document
            .getElementById(
              location.hash.slice(1)
            )
            ?.scrollIntoView({
              behavior: "smooth",
            });
        },
        100
      );

      return () => {
        window.clearTimeout(timeout);
      };
    }

    window.scrollTo({
      top: 0,
    });
  }, [
    location.pathname,
    location.hash,
  ]);

  return null;
}

// ============================================
// APPLICATION
// ============================================

export default function App() {
  const { settings: company } =
    useCompanySettings();

  const whatsappNumber =
    company.whatsapp_number?.trim() || "";

  const instagramUrl =
    company.instagram_url?.trim() || "";

  const companyName =
    company.company_name?.trim() ||
    "Jovia MUA";

  const whatsappMessage =
    encodeURIComponent(
      `Hello ${companyName}, I would like to know more about your makeup services.`
    );

  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`
    : "";

  return (
    <>
      <ScrollToHash />

      <Header />

      <Routes>
        <Route
          path="/"
          element={
            <Home
              instagramUrl={instagramUrl}
              companyName={companyName}
            />
          }
        />

        <Route
          path="/contact"
          element={<Contact />}
        />

        <Route
          path="*"
          element={
            <main className="not-found">
              <h1>
                Page not found
              </h1>

              <Link to="/">
                Return home
              </Link>
            </main>
          }
        />
      </Routes>

      <Footer />

      {/* =====================================
          FLOATING GLASS SOCIAL BUTTONS
         ===================================== */}

      {(whatsappLink || instagramUrl) && (
        <div
          className="jovia-fixed-socials"
          aria-label="Social contact links"
        >
          {/* INSTAGRAM */}

          {instagramUrl && (
            <a
              className="jovia-instagram-link"
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Follow Jovia MUA on Instagram"
              title="Follow on Instagram"
            >
              <span className="jovia-social-icon">
                <InstagramIcon />
              </span>

              <span>
                Instagram
              </span>

              <span
                className="jovia-social-arrow"
                aria-hidden="true"
              >
                ↗
              </span>
            </a>
          )}

          {/* WHATSAPP */}

          {whatsappLink && (
            <a
              className="jovia-whatsapp-link"
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ask Jovia MUA on WhatsApp"
              title="Ask on WhatsApp"
            >
              <span
                className="jovia-whatsapp-mark"
                aria-hidden="true"
              >
                <WhatsAppIcon size={19} />
              </span>

              <span>
                Ask on WhatsApp
              </span>
            </a>
          )}
        </div>
      )}
    </>
  );
}
