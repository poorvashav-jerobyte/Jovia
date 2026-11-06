
import type {
  Service,
  Testimonial,
} from "./api";

export const defaultServices: Service[] = [
  {
    id: "bridal",
    slug: "bridal-makeup",
    title: "Bridal Makeup",
    description:
      "Luxury bridal beauty for weddings and destination weddings.",
    image_path: "/pictures/bridal-2.png",
    display_order: 1,
  },
  {
    id: "engagement",
    slug: "engagement-makeup",
    title: "Engagement Makeup",
    description:
      "Elegant looks for engagements and pre-wedding events.",
    image_path: "/pictures/engagement-2.png",
    display_order: 2,
  },
  {
    id: "party",
    slug: "party-makeup",
    title: "Party Makeup",
    description:
      "Sophisticated glam for celebrations and special occasions.",
    image_path: "/pictures/party-2.png",
    display_order: 3,
  },
  {
    id: "photoshoot",
    slug: "photoshoot-makeup",
    title: "Photoshoot Makeup",
    description:
      "Editorial, fashion, influencer and commercial shoots.",
    image_path: "/pictures/photoshoot-2.JPG",
    display_order: 4,
  },
  {
    id: "class",
    slug: "makeup-masterclasses",
    title: "Makeup Masterclasses",
    description:
      "Professional and beginner-friendly makeup education.",
    image_path: "/pictures/masterclass-2.JPG",
    display_order: 5,
  },
];

// Testimonials must come from Supabase.
// Do not show invented sample customer reviews.
export const defaultTestimonials: Testimonial[] = [];
