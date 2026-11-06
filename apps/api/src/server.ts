
import "dotenv/config";

import { randomUUID } from "node:crypto";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

// ================================================
// CONFIGURATION
// ================================================

const app = express();
const port = Number(process.env.PORT || 4001);

const origins = (
  process.env.WEB_ORIGIN || "http://localhost:5175"
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const supabaseUrl = process.env.SUPABASE_URL;

const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const db =
  supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;

app.disable("x-powered-by");
app.use((helmet as unknown as () => express.RequestHandler)());
app.use(cors({ origin: origins }));
app.use(express.json({ limit: "30kb" }));

const route = (
  handler: (
    req: Request,
    res: Response,
    next: NextFunction
  ) => Promise<void>
) => {
  return (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    Promise.resolve(
      handler(req, res, next)
    ).catch(next);
  };
};

// ================================================
// HEALTH CHECK
// ================================================

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Cult Contour API running",
    supabaseConfigured: Boolean(db),
  });
});

app.get(
  "/api/health/db",
  route(async (_req, res) => {
    if (!db) {
      res.status(503).json({
        success: false,
        message: "Supabase not configured",
      });
      return;
    }

    const { error } = await db
      .from("services")
      .select("id")
      .limit(1);

    if (error) {
      console.error("Database health:", error);

      res.status(503).json({
        success: false,
        message: "Unable to connect to Supabase",
      });
      return;
    }

    res.json({
      success: true,
      message: "Supabase connected successfully",
    });
  })
);

// ================================================
// PUBLIC SERVICES AND TESTIMONIALS
// ================================================

for (const table of [
  "services",
  "testimonials",
] as const) {
  app.get(
    `/api/${table}`,
    route(async (_req, res) => {
      if (!db) {
        res.status(503).json({
          error: "Database not configured",
        });
        return;
      }

      const { data, error } = await db
        .from(table)
        .select("*")
        .eq("published", true)
        .order("display_order", {
          ascending: true,
        });

      if (error) {
        console.error(`Load ${table}:`, error);

        res.status(502).json({
          error: "Content temporarily unavailable",
        });
        return;
      }

      res.json(data ?? []);
    })
  );
}

// ================================================
// CONSULTATION INQUIRIES
// ================================================

const inquirySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(200),
    phone: z.string().trim().min(7).max(30),

    service: z.enum([
      "bridal-makeup",
      "engagement-makeup",
      "party-makeup",
      "photoshoot-makeup",
      "makeup-masterclasses",
      "other",
    ]),

    event_date: z
      .union([
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        z.literal(""),
      ])
      .optional(),

    message: z.string().trim().max(3000).optional(),
    website: z.string().max(200).optional(),
  })
  .strict();

const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

app.post(
  "/api/inquiries",
  inquiryLimiter,
  route(async (req, res) => {
    const parsed = inquirySchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Please check your booking details",
      });
      return;
    }

    // Honeypot spam protection
    if (parsed.data.website) {
      res.json({ ok: true });
      return;
    }

    if (!db) {
      res.status(503).json({
        error: "Booking service not configured",
      });
      return;
    }

    const {
      website: _website,
      event_date,
      ...fields
    } = parsed.data;

    const { error } = await db
      .from("inquiries")
      .insert({
        ...fields,
        event_date: event_date || null,
      });

    if (error) {
      console.error("Save inquiry:", error);

      res.status(502).json({
        error: "Unable to save inquiry",
      });
      return;
    }

    res.status(201).json({
      ok: true,
      message: "Inquiry received successfully",
    });
  })
);

// ================================================
// ADMIN AUTHENTICATION
// ================================================

const requireAdmin = route(
  async (req, res, next) => {
    if (!db) {
      res.status(503).json({
        error: "Database not configured",
      });
      return;
    }

    const token = req.headers.authorization?.match(
      /^Bearer\s+(.+)$/i
    )?.[1];

    if (!token) {
      res.status(401).json({
        error: "Authentication required",
      });
      return;
    }

    const {
      data: { user },
      error,
    } = await db.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({
        error: "Invalid or expired session",
      });
      return;
    }

    const {
      data: admin,
      error: roleError,
    } = await db
      .from("admin_users")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleError) {
      console.error("Admin lookup:", roleError);

      res.status(503).json({
        error: "Unable to verify admin",
      });
      return;
    }

    if (!admin) {
      res.status(403).json({
        error: "Admin access required",
      });
      return;
    }

    res.locals.adminId = user.id;
    next();
  }
);

// ================================================
// ADMIN INQUIRY MANAGEMENT
// ================================================

app.get(
  "/api/admin/inquiries",
  requireAdmin,
  route(async (_req, res) => {
    const { data, error } = await db!
      .from("inquiries")
      .select(
        "id,name,email,phone,service,event_date,message,status,created_at"
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(200);

    if (error) {
      console.error("Load inquiries:", error);

      res.status(502).json({
        error: "Unable to load inquiries",
      });
      return;
    }

    res.json(data ?? []);
  })
);

app.patch(
  "/api/admin/inquiries/:id",
  requireAdmin,
  route(async (req, res) => {
    const id = z
      .string()
      .uuid()
      .safeParse(req.params.id);

    const payload = z
      .object({
        status: z.enum([
          "new",
          "contacted",
          "confirmed",
          "closed",
        ]),
      })
      .strict()
      .safeParse(req.body);

    if (!id.success || !payload.success) {
      res.status(400).json({
        error: "Invalid inquiry or status",
      });
      return;
    }

    const { data, error } = await db!
      .from("inquiries")
      .update(payload.data)
      .eq("id", id.data)
      .select("id,status")
      .maybeSingle();

    if (error) {
      console.error("Update inquiry:", error);

      res.status(502).json({
        error: "Unable to update inquiry",
      });
      return;
    }

    if (!data) {
      res.status(404).json({
        error: "Inquiry not found",
      });
      return;
    }

    res.json(data);
  })
);

// ================================================
// SERVICE IMAGE PATH VALIDATION
// ================================================

function validImagePath(path: string): boolean {
  const isLocalImage =
    /^\/pictures\/[a-zA-Z0-9/_.-]+$/.test(path) &&
    !path.split("/").includes("..");

  if (isLocalImage) return true;
  if (!supabaseUrl) return false;

  try {
    const expected = new URL(supabaseUrl);
    const incoming = new URL(path);

    const storagePath =
      /^\/storage\/v1\/object\/public\/service-images\/services\/[a-zA-Z0-9_.-]+$/;

    return (
      incoming.protocol === "https:" &&
      incoming.origin === expected.origin &&
      storagePath.test(incoming.pathname) &&
      !incoming.search &&
      !incoming.hash
    );
  } catch {
    return false;
  }
}

// ================================================
// SERVICE VALIDATION
// ================================================

const serviceSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(2)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),

    title: z.string().trim().min(2).max(160),

    description: z
      .string()
      .trim()
      .min(5)
      .max(3000),

    image_path: z
      .string()
      .trim()
      .min(2)
      .max(700)
      .refine(validImagePath, "Invalid image path"),

    price: z
      .number()
      .finite()
      .min(0)
      .max(99999999.99)
      .nullable(),

    display_order: z
      .number()
      .int()
      .min(0)
      .max(10000),

    published: z.boolean(),
  })
  .strict();

// ================================================
// ADMIN SERVICES LIST
// ================================================

app.get(
  "/api/admin/services",
  requireAdmin,
  route(async (_req, res) => {
    const { data, error } = await db!
      .from("services")
      .select(
        "id,slug,title,description,image_path,price,display_order,published,created_at"
      )
      .order("display_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error("List services:", error);

      res.status(502).json({
        error: "Unable to load services",
      });
      return;
    }

    res.json(data ?? []);
  })
);

// ================================================
// CREATE SERVICE
// ================================================

app.post(
  "/api/admin/services",
  requireAdmin,
  route(async (req, res) => {
    const parsed = serviceSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid service details",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { data, error } = await db!
      .from("services")
      .insert(parsed.data)
      .select("*")
      .single();

    if (error) {
      if (error.code === "23505") {
        res.status(409).json({
          error:
            "A service with this identifier already exists",
        });
        return;
      }

      console.error("Create service:", error);

      res.status(502).json({
        error: "Unable to create service",
      });
      return;
    }

    res.status(201).json(data);
  })
);

// ================================================
// UPDATE SERVICE
// ================================================

app.patch(
  "/api/admin/services/:id",
  requireAdmin,
  route(async (req, res) => {
    const id = z
      .string()
      .uuid()
      .safeParse(req.params.id);

    const parsed = serviceSchema.safeParse(req.body);

    if (!id.success || !parsed.success) {
      res.status(400).json({
        error: "Invalid service details",
      });
      return;
    }

    const { data, error } = await db!
      .from("services")
      .update(parsed.data)
      .eq("id", id.data)
      .select("*")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        res.status(409).json({
          error:
            "A service with this identifier already exists",
        });
        return;
      }

      console.error("Update service:", error);

      res.status(502).json({
        error: "Unable to update service",
      });
      return;
    }

    if (!data) {
      res.status(404).json({
        error: "Service not found",
      });
      return;
    }

    res.json(data);
  })
);

// ================================================
// IMAGE UPLOAD CONFIGURATION
// ================================================

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const parseImage = express.raw({
  type: [
    "image/jpeg",
    "image/png",
    "image/webp",
  ],
  limit: "5mb",
});

function identifyImage(
  data: Buffer
): {
  extension: string;
  contentType: string;
} | null {
  // PNG
  if (
    data.length >= 8 &&
    data.subarray(0, 8).equals(
      Buffer.from([
        137, 80, 78, 71,
        13, 10, 26, 10,
      ])
    )
  ) {
    return {
      extension: "png",
      contentType: "image/png",
    };
  }

  // JPEG
  if (
    data.length >= 3 &&
    data.subarray(0, 3).toString("hex") === "ffd8ff"
  ) {
    return {
      extension: "jpg",
      contentType: "image/jpeg",
    };
  }

  // WebP
  if (
    data.length >= 12 &&
    data.toString("ascii", 0, 4) === "RIFF" &&
    data.toString("ascii", 8, 12) === "WEBP"
  ) {
    return {
      extension: "webp",
      contentType: "image/webp",
    };
  }

  return null;
}

// ================================================
// ADMIN SERVICE IMAGE UPLOAD
// ================================================

app.post(
  "/api/admin/services/upload",
  requireAdmin,
  parseImage,
  route(async (req, res) => {
    if (
      !Buffer.isBuffer(req.body) ||
      !req.body.length ||
      req.body.length > MAX_IMAGE_SIZE
    ) {
      res.status(400).json({
        error: "Select an image smaller than 5 MB",
      });
      return;
    }

    const actual = identifyImage(req.body);

    const requestContentType = req
      .get("Content-Type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();

    if (
      !actual ||
      requestContentType !== actual.contentType
    ) {
      res.status(415).json({
        error:
          "Only real PNG, JPEG, and WebP images are supported",
      });
      return;
    }

    const objectPath =
      `services/${randomUUID()}.${actual.extension}`;

    const { error } = await db!
      .storage
      .from("service-images")
      .upload(objectPath, req.body, {
        contentType: actual.contentType,
        cacheControl: "31536000",
        upsert: false,
      });

    if (error) {
      console.error("Upload service image:", error);

      res.status(502).json({
        error:
          "Image upload failed. Check the service-images Storage bucket.",
      });
      return;
    }

    const { data } = db!
      .storage
      .from("service-images")
      .getPublicUrl(objectPath);

    res.status(201).json({
      image_path: data.publicUrl,
    });
  })
);

// ================================================
// CUSTOMER REVIEW PHOTO UPLOAD
// ================================================

// Admin-only photo upload.
// Maximum 5 MB per photo.
// Supported formats: JPG, PNG, WebP.

app.post(
  "/api/admin/testimonials/upload",
  requireAdmin,
  parseImage,
  route(async (req, res) => {
    if (
      !Buffer.isBuffer(req.body) ||
      !req.body.length ||
      req.body.length > MAX_IMAGE_SIZE
    ) {
      res.status(400).json({
        error: "Choose an image up to 5 MB",
      });
      return;
    }

    const actual = identifyImage(req.body);

    const declared = req
      .get("Content-Type")
      ?.split(";")[0]
      .trim()
      .toLowerCase();

    if (
      !actual ||
      declared !== actual.contentType
    ) {
      res.status(415).json({
        error: "Use JPG, PNG or WebP images",
      });
      return;
    }

    const objectPath =
      `reviews/${randomUUID()}.${actual.extension}`;

    const { error } = await db!
      .storage
      .from("service-images")
      .upload(objectPath, req.body, {
        contentType: actual.contentType,
        cacheControl: "31536000",
        upsert: false,
      });

    if (error) {
      console.error("Review photo upload:", error);

      res.status(502).json({
        error:
          "Photo upload failed. Check service-images bucket configuration.",
      });
      return;
    }

    const { data } = db!
      .storage
      .from("service-images")
      .getPublicUrl(objectPath);

    res.status(201).json({
      photo_url: data.publicUrl,
    });
  })
);

// ================================================
// CUSTOMER REVIEW VALIDATION
// ================================================

const testimonialSchema = z
  .object({
    // Customer name
    author: z
      .string()
      .trim()
      .min(2)
      .max(120),

    // Customer feedback
    quote: z
      .string()
      .trim()
      .min(10)
      .max(2000),

    // Optional review context
    context: z
      .string()
      .trim()
      .max(200),

    // Display order
    display_order: z
      .number()
      .int()
      .min(0)
      .max(10000),

    // Publish or draft
    published: z.boolean(),

    // Customer review date
    review_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),

    // Makeup service taken
    service_name: z
      .string()
      .trim()
      .min(1)
      .max(120),

    // Rating: 1 to 5 stars
    rating: z
      .number()
      .int()
      .min(1)
      .max(5)
      .nullable(),

    // Maximum 5 photos per customer review
    photos: z
      .array(
        z.string().url().max(1200)
      )
      .max(5),
  })
  .strict();

// ================================================
// GET ALL CUSTOMER REVIEWS - ADMIN
// ================================================

app.get(
  "/api/admin/testimonials",
  requireAdmin,
  route(async (_req, res) => {
    const { data, error } = await db!
      .from("testimonials")
      .select(
        "id,author,quote,context,display_order,published,created_at,review_date,service_name,rating,photos"
      )
      .order("display_order", {
        ascending: true,
      })
      .order("created_at", {
        ascending: true,
      });

    if (error) {
      console.error("Load testimonials:", error);

      res.status(502).json({
        error: "Unable to load testimonials",
      });
      return;
    }

    res.json(data ?? []);
  })
);

// ================================================
// CREATE CUSTOMER REVIEW
// ================================================

app.post(
  "/api/admin/testimonials",
  requireAdmin,
  route(async (req, res) => {
    const parsed =
      testimonialSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid testimonial details",
        details:
          parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { data, error } = await db!
      .from("testimonials")
      .insert(parsed.data)
      .select("*")
      .single();

    if (error) {
      console.error("Create testimonial:", error);

      res.status(502).json({
        error: "Unable to create testimonial",
      });
      return;
    }

    res.status(201).json(data);
  })
);

// ================================================
// UPDATE CUSTOMER REVIEW
// ================================================

app.patch(
  "/api/admin/testimonials/:id",
  requireAdmin,
  route(async (req, res) => {
    const id = z
      .string()
      .uuid()
      .safeParse(req.params.id);

    const parsed =
      testimonialSchema.safeParse(req.body);

    if (!id.success || !parsed.success) {
      res.status(400).json({
        error: "Invalid testimonial details",
      });
      return;
    }

    const { data, error } = await db!
      .from("testimonials")
      .update(parsed.data)
      .eq("id", id.data)
      .select("*")
      .maybeSingle();

    if (error) {
      console.error("Update testimonial:", error);

      res.status(502).json({
        error: "Unable to update testimonial",
      });
      return;
    }

    if (!data) {
      res.status(404).json({
        error: "Testimonial not found",
      });
      return;
    }

    res.json(data);
  })
);

// ================================================
// COMPANY DETAILS - VALIDATION
// ================================================

const companyDetailsSchema = z
  .object({
    company_name: z
      .string()
      .trim()
      .min(2)
      .max(120),

    instagram_url: z
      .string()
      .trim()
      .max(400)
      .refine(
        (value) => {
          if (!value) return true;

          try {
            const url = new URL(value);

            return (
              url.protocol === "https:" &&
              [
                "instagram.com",
                "www.instagram.com",
              ].includes(url.hostname) &&
              !url.username &&
              !url.password &&
              url.pathname !== "/" &&
              !url.search &&
              !url.hash
            );
          } catch {
            return false;
          }
        },
        "Enter a valid Instagram profile URL"
      ),

    whatsapp_number: z
      .string()
      .trim()
      .regex(
        /^(?:[1-9][0-9]{7,14})?$/,
        "Enter 8-15 digits with country code, without + or spaces"
      ),
  })
  .strict();

// ================================================
// PUBLIC COMPANY DETAILS
// ================================================

app.get(
  "/api/company-details",
  route(async (_req, res) => {
    if (!db) {
      res.status(503).json({
        error: "Database not configured",
      });
      return;
    }

    const { data, error } = await db
      .from("company_details")
      .select(
        "company_name,instagram_url,whatsapp_number"
      )
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error(
        "Public company details:",
        error
      );

      res.status(502).json({
        error: "Unable to load company details",
      });
      return;
    }

    res.json({
      company_name:
        data?.company_name ?? "Cult Contour",
      instagram_url:
        data?.instagram_url ?? "",
      whatsapp_number:
        data?.whatsapp_number ?? "",
    });
  })
);

// ================================================
// ADMIN - GET COMPANY DETAILS
// ================================================

app.get(
  "/api/admin/company-details",
  requireAdmin,
  route(async (_req, res) => {
    const { data, error } = await db!
      .from("company_details")
      .select(
        "company_name,instagram_url,whatsapp_number"
      )
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error(
        "Admin company details:",
        error
      );

      res.status(502).json({
        error: "Unable to load company details",
      });
      return;
    }

    res.json({
      company_name:
        data?.company_name ?? "Cult Contour",
      instagram_url:
        data?.instagram_url ?? "",
      whatsapp_number:
        data?.whatsapp_number ?? "",
    });
  })
);

// ================================================
// ADMIN - SAVE COMPANY DETAILS
// ================================================

app.put(
  "/api/admin/company-details",
  requireAdmin,
  route(async (req, res) => {
    const parsed =
      companyDetailsSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid company details",
        details:
          parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { data, error } = await db!
      .from("company_details")
      .upsert(
        {
          id: 1,
          ...parsed.data,
          updated_at:
            new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      )
      .select(
        "company_name,instagram_url,whatsapp_number"
      )
      .single();

    if (error) {
      console.error(
        "Save company details:",
        error
      );

      res.status(502).json({
        error: "Unable to save company details",
      });
      return;
    }

    res.json(data);
  })
);

// ================================================
// 404 HANDLER
// ================================================

app.use((_req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
  });
});

// ================================================
// GLOBAL ERROR HANDLER
// ================================================

app.use(
  (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    console.error("API error:", err);

    if (
      err instanceof Error &&
      "type" in err &&
      (err as { type?: string }).type ===
        "entity.too.large"
    ) {
      res.status(413).json({
        error: "Image exceeds 5 MB",
      });
      return;
    }

    res.status(500).json({
      error: "Internal server error",
    });
  }
);

// ================================================
// START SERVER
// ================================================

app.listen(port, () => {
  console.log(
    `API running: http://localhost:${port}`
  );

  console.log(
    `Supabase: ${db ? "configured" : "not configured"}`
  );
});
