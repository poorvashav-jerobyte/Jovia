import { useCompanySettings } from "../CompanySettings";

import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import "./BeautyServicesScroll.css";

function CompanyBrand() { const { settings } = useCompanySettings(); return <>{settings.company_name.toUpperCase()}</>; }
function CompanyInitial() { const { settings } = useCompanySettings(); return <>{settings.company_name.charAt(0).toUpperCase()}</>; }

type Service = {
  id: string | number;
  slug: string;
  title: string;
  description: string;
  image_path: string;
  price?: number | null;
  display_order: number;
  published?: boolean;
};

type ProductType =
  | "lipstick"
  | "foundation"
  | "mirror"
  | "eyeshadow";

const API_BASE =
  import.meta.env.VITE_API_URL || "/api";

const PRODUCT_SEQUENCE: ProductType[] = [
  "lipstick",
  "foundation",
  "mirror",
  "eyeshadow",
];

const PRODUCT_LABELS: Record<ProductType, string> = {
  lipstick: "THE SIGNATURE LIP",
  foundation: "THE PERFECT FINISH",
  mirror: "REFLECTIONS OF BEAUTY",
  eyeshadow: "THE COLOUR ATELIER",
};

const EYEBROWS = [
  "THE BRIDAL EDIT",
  "BEFORE FOREVER",
  "THE GLAMOUR EDIT",
  "EDITORIAL BEAUTY",
  "THE ART OF BEAUTY",
];

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value: number) {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
}

function segment(
  progress: number,
  start: number,
  end: number
) {
  if (end <= start) return 1;

  return smoothstep(
    (progress - start) / (end - start)
  );
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );

    const update = () => setReduced(media.matches);

    update();

    media.addEventListener("change", update);

    return () =>
      media.removeEventListener("change", update);
  }, []);

  return reduced;
}

/* ==================================================
   PRODUCT 1 — ORIGINAL LIPSTICK
   ================================================== */

function LuxuryLipstick() {
  return (
    <div className="jm-lipstick">
      <div className="jm-lipstick-tube">
        <div className="jm-lipstick-bullet">
          <span className="jm-lipstick-bullet-shine" />
        </div>

        <div className="jm-lipstick-gold-neck" />
        <div className="jm-lipstick-gold-ring" />

        <div className="jm-lipstick-body">
          <span className="jm-lipstick-brand">
            JOVIA
            <small>MUA</small>
          </span>
        </div>

        <div className="jm-lipstick-base" />
      </div>

      <div className="jm-lipstick-cap">
        <div className="jm-cap-highlight" />
        <span className="jm-cap-monogram">J</span>
        <div className="jm-cap-base" />
      </div>
    </div>
  );
}

/* The opening compact uses the class names defined in BeautyServicesScroll.css. */
function LuxuryFoundation() {
  return (
    <div className="jm-foundation">
      <div className="jm-foundation-shadow" />
      <div className="jm-foundation-product">
        <div className="jm-foundation-base">
          <div className="jm-foundation-base-edge" />
          <div className="jm-foundation-gold-rim">
            <div className="jm-foundation-powder">
              <div className="jm-foundation-powder-glow" />
              <span className="jm-foundation-powder-logo">JOVIA<small>MUA</small></span>
            </div>
          </div>
          <span className="jm-foundation-lock" />
        </div>
        <div className="jm-foundation-hinge"><span /><span /><span /></div>
        <div className="jm-foundation-lid">
          <div className="jm-foundation-lid-shell">
            <div className="jm-foundation-lid-cover">
              <span className="jm-foundation-monogram"><CompanyInitial /></span><small><CompanyBrand /></small>
            </div>
            <div className="jm-foundation-lid-mirror">
              <div className="jm-foundation-mirror-glass">
                <div className="jm-foundation-reflection" /><span><CompanyBrand /></span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <span className="jm-product-glint jm-glint-one" />
      <span className="jm-product-glint jm-glint-two" />
    </div>
  );
}

/* Third card: an elegant gold hand mirror with a reveal on scroll. */
function LuxuryHandMirror() {
  return (
    <div className="jm-handmirror">
      <div className="jm-mirror-shadow" />
      <div className="jm-mirror-product">
        <div className="jm-mirror-crown"><span /></div>
        <div className="jm-mirror-head">
          <div className="jm-mirror-gold-frame">
            <div className="jm-mirror-inner-frame">
              <div className="jm-mirror-glass">
                <div className="jm-mirror-shine" />
                <div className="jm-mirror-soft-glow" />
                <span className="jm-mirror-letter">J</span>
              </div>
            </div>
          </div>
        </div>
        <div className="jm-mirror-neck" />
        <div className="jm-mirror-handle">
          <div className="jm-mirror-handle-detail"><i /><i /><i /></div>
        </div>
        <div className="jm-mirror-handle-base" />
        <div className="jm-mirror-cover">
          <div className="jm-mirror-cover-content"><span>JOVIA</span><small>MUA</small></div>
        </div>
      </div>
    </div>
  );
}

/* Fourth card: scroll-driven eyeshadow palette with an opening lid. */
const SHADES = [
  ["#e8cdb8", "IVORY"], ["#d5a692", "ROSE"], ["#b88174", "BLUSH"],
  ["#a66d65", "MAUVE"], ["#bb8b52", "GOLD"], ["#8b5948", "BRONZE"],
  ["#916174", "PLUM"], ["#684453", "BERRY"], ["#6e5144", "COCOA"],
  ["#402d32", "SMOKE"], ["#d4b18b", "NUDE"], ["#a77c7c", "DUSK"],
];

function LuxuryEyeshadowPalette() {
  return (
    <div className="jm-eyeshadow">
      <div className="jm-eyeshadow-shadow" />
      <div className="jm-eyeshadow-product">
        <div className="jm-eyeshadow-lid">
          <div className="jm-eyeshadow-lid-front"><span>JOVIA</span><small>MUA · COLOUR ATELIER</small></div>
          <div className="jm-eyeshadow-lid-inside"><div className="jm-eyeshadow-reflection" /><span><CompanyBrand /></span></div>
        </div>
        <div className="jm-eyeshadow-case">
          <div className="jm-eyeshadow-frame">
            <div className="jm-eyeshadow-shades">
              {SHADES.map(([color, name]) => (
                <div className="jm-eyeshadow-pan" key={name} style={{ background: `radial-gradient(circle at 30% 25%, #ffffff40, transparent 35%), ${color}` }}>
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="jm-eyeshadow-brand"><CompanyBrand /></div>
          <div className="jm-eyeshadow-clasp" />
        </div>
      </div>
    </div>
  );
}

/* ==================================================
   PRODUCT SCROLL CONTROLLER
   ================================================== */

function ProductAnimation({
  type,
  stageRef,
}: {
  type: ProductType;
  stageRef: RefObject<HTMLDivElement | null>;
}) {
  // Progress is applied directly to this element during scrolling.
  // This avoids re-rendering every service card and its 3D product on scroll.
  return (
    <div
      className={`jm-product-stage jm-product-${type}`}
      ref={stageRef}
      aria-hidden="true"
    >
      <div className="jm-product-ambient" />
      <div className="jm-product-orbit orbit-a" />
      <div className="jm-product-orbit orbit-b" />

      <div className="jm-product-visual">
        {type === "lipstick" && <LuxuryLipstick />}
        {type === "foundation" && <LuxuryFoundation />}
        {type === "eyeshadow" && <LuxuryEyeshadowPalette />}
        {type === "mirror" && <LuxuryHandMirror />}
      </div>

      <div className="jm-product-particles">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} />
        ))}
      </div>

      <div className="jm-product-caption">
        <span><CompanyBrand /></span>
        <i />
        <span>{PRODUCT_LABELS[type]}</span>
      </div>
    </div>
  );
}

/* ==================================================
   SERVICE CARD
   ================================================== */

function ServiceCard({
  service,
  index,
  total,
}: {
  service: Service;
  index: number;
  total: number;
}) {
  return (
    <article
      className={`jm-service-card jm-card-theme-${
        index % 4
      }`}
    >
      <div className="jm-service-card-copy">
        <div className="jm-service-card-number">
          <span>
            {String(index + 1).padStart(2, "0")}
            {" / "}
            {String(total).padStart(2, "0")}
          </span>
          <i />
        </div>

        <p className="jm-service-card-eyebrow">
          {EYEBROWS[index % EYEBROWS.length]}
        </p>

        <h3>{service.title}</h3>

        <p className="jm-service-card-description">
          {service.description}
        </p>

        {service.price != null && (
          <p className="jm-service-card-price">
            Starting from ₹
            {Number(service.price).toLocaleString("en-IN")}
          </p>
        )}

        <a
          className="jm-service-card-link"
          href={`/contact?service=${encodeURIComponent(
            service.slug
          )}`}
        >
          ENQUIRE NOW
          <span aria-hidden="true">↗</span>
        </a>
      </div>

      <div className="jm-service-card-photo">
        <img
          src={service.image_path}
          alt={service.title}
          loading="eager"
        />
        <div className="jm-service-card-photo-shade" />
      </div>

      <span className="jm-service-card-watermark">
        {String(index + 1).padStart(2, "0")}
      </span>
    </article>
  );
}

/* ==================================================
   STACKED SERVICES — EACH CARD SITS BELOW THE PREVIOUS
   Products animate smoothly after their card has entered the viewport.
   ================================================== */

function ServiceScene({ service, index, total }: {
  service: Service;
  index: number;
  total: number;
}) {
  const sceneRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const productType = PRODUCT_SEQUENCE[index % PRODUCT_SEQUENCE.length];
  const reverse = index % 2 === 1;

  useEffect(() => {
    let frameId = 0;
    let isNearViewport = false;
    let lastSpin = -1;
    let lastReveal = -1;
    let lastEnter = -1;

    const update = () => {
      frameId = 0;
      const scene = sceneRef.current;
      const stage = stageRef.current;
      if (!scene || !stage) return;

      // Begin a little later than before, after the card enters the viewport.
      // Use a longer scroll travel so the 3D opening feels slower and smoother.
      // The product remains scroll-synced and reverses naturally on scroll up.
      const viewportHeight = window.innerHeight;
      const sceneTop = scene.getBoundingClientRect().top;
      const start = viewportHeight * 0.75;
      const finish = viewportHeight * -0.12;
      const progress = clamp((start - sceneTop) / Math.max(1, start - finish));

      // A nearly linear opening keeps the movement continuous with scrolling.
      const spin = reducedMotion ? 1 : segment(progress, 0, 0.95);
      const reveal = reducedMotion ? 1 : segment(progress, 0.06, 1);
      const enter = reducedMotion ? 1 : segment(progress, 0, 0.42);

      // Avoid React renders and unnecessary style recalculations while scrolling.
      const precision = 0.006;
      if (Math.abs(lastSpin - spin) > precision || (spin === 0 || spin === 1) && lastSpin !== spin) {
        stage.style.setProperty("--jm-spin", String(spin));
        lastSpin = spin;
      }
      if (Math.abs(lastReveal - reveal) > precision || (reveal === 0 || reveal === 1) && lastReveal !== reveal) {
        stage.style.setProperty("--jm-reveal", String(reveal));
        lastReveal = reveal;
      }
      if (Math.abs(lastEnter - enter) > precision || (enter === 0 || enter === 1) && lastEnter !== enter) {
        stage.style.setProperty("--jm-enter", String(enter));
        lastEnter = enter;
      }
    };

    const schedule = () => {
      if (isNearViewport && !frameId) {
        frameId = window.requestAnimationFrame(update);
      }
    };

    const scene = sceneRef.current;
    if (!scene) return;

    // Only nearby cards respond to scroll events. Other 3D scenes stay idle.
    const observer = new IntersectionObserver(
      ([entry]) => {
        isNearViewport = entry.isIntersecting;
        if (isNearViewport) schedule();
        else if (frameId) {
          window.cancelAnimationFrame(frameId);
          frameId = 0;
        }
      },
      { rootMargin: "150px 0px 150px 0px", threshold: 0 }
    );
    observer.observe(scene);
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [reducedMotion]);

  return (
    <div
      ref={sceneRef}
      id={`beauty-service-${index + 1}`}
      className={`jm-service-pair jm-service-scene ${reverse ? "jm-pair-reverse" : "jm-pair-normal"}`}
    >
      <ProductAnimation type={productType} stageRef={stageRef} />
      <div className="jm-service-card-stage">
        <ServiceCard service={service} index={index} total={total} />
        <div className="jm-service-navigation">
          <span>{String(index + 1).padStart(2, "0")} — {String(total).padStart(2, "0")}</span>
          <div className="jm-service-dots">
            {Array.from({ length: total }, (_, item) => (
              <button
                key={item}
                type="button"
                className={index === item ? "active" : ""}
                aria-label={`Jump to beauty service ${item + 1}`}
                aria-current={index === item ? "step" : undefined}
                onClick={() => document.getElementById(`beauty-service-${item + 1}`)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" })}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BeautyServicesScroll() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`${API_BASE}/services`, { signal: controller.signal });
        if (!response.ok) throw new Error(`Unable to load services (${response.status})`);
        const rows: Service[] = await response.json();
        if (!Array.isArray(rows)) throw new Error("Invalid services response");
        setServices(rows.filter(row => row.published !== false).sort((a, b) =>
          (Number(a.display_order) || 0) - (Number(b.display_order) || 0)
        ));
        setError("");
      } catch (err) {
        if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Unable to load services");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  const { settings } = useCompanySettings();
  return (
    <section id="services" className="jovia-services-scroll jovia-services-stacked" aria-label={`${settings.company_name} beauty services`}>
      <div className="jovia-services-bg-glow" />
      <header className="jovia-services-heading">
        <p className="jovia-services-kicker"><CompanyBrand /> / SIGNATURE EXPERIENCES</p>
        <h2>Beauty Services<em> for Every Milestone</em></h2>
        <p className="jovia-services-subtitle">Beauty, artistry, and elegance designed around your moments.</p>
      </header>
      {loading && <div className="jm-services-state">Loading beauty experiences...</div>}
      {!loading && error && <div className="jm-services-state" role="alert">{error}</div>}
      {!loading && !error && services.length === 0 && <div className="jm-services-state">New beauty experiences are coming soon.</div>}
      {services.map((service, index) => (
        <ServiceScene key={service.id} service={service} index={index} total={services.length} />
      ))}
    </section>
  );
}