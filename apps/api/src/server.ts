
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

// =====================================================
// CONFIGURATION
// =====================================================

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

app.use(
  (helmet as unknown as () => express.RequestHandler)()
);

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
    Promise.resolve(handler(req, res, next)).catch(next);
  };
};

// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Jovia MUA API running",
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

// =====================================================
// PUBLIC SERVICES AND REVIEWS
// =====================================================

for (const table of ["services", "testimonials"] as const) {
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

// =====================================================
// CONSULTATION INQUIRIES
// =====================================================

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

    const { error } = await db.from("inquiries").insert({
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

// =====================================================
// ROLE TYPES
// =====================================================

type AdminRole =
  | "super_admin"
  | "admin"
  | "manager"
  | "member";

function isAdminRole(value: unknown): value is AdminRole {
  return (
    value === "super_admin" ||
    value === "admin" ||
    value === "manager" ||
    value === "member"
  );
}

function canAccessRoute(
  roleName: AdminRole,
  method: string,
  path: string
): boolean {
  if (
    roleName === "super_admin" ||
    roleName === "admin"
  ) {
    return true;
  }

  if (roleName === "manager") {
    return method === "GET";
  }

  if (roleName === "member") {
    return (
      method === "GET" &&
      [
        "/api/admin/me",
        "/api/admin/inquiries",
        "/api/admin/services",
      ].includes(path)
    );
  }

  return false;
}

// =====================================================
// ADMIN AUTHENTICATION
// =====================================================

const requireAdmin = route(async (req, res, next) => {
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
    error: authError,
  } = await db.auth.getUser(token);

  if (authError || !user) {
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
    .select("user_id,role,full_name,email")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleError) {
    console.error("Admin lookup:", roleError);
    res.status(503).json({
      error: "Unable to verify admin",
    });
    return;
  }

  if (!admin || !isAdminRole(admin.role)) {
    res.status(403).json({
      error: "Admin panel access required",
    });
    return;
  }

  const roleName = admin.role;

  if (!canAccessRoute(roleName, req.method, req.path)) {
    res.status(403).json({
      error:
        roleName === "manager"
          ? "Managers have read-only access"
          : "You do not have permission to access this section",
    });
    return;
  }

  res.locals.adminId = user.id;
  res.locals.adminRole = roleName;
  res.locals.adminEmail = user.email || "";
  res.locals.adminName =
    admin.full_name ||
    user.user_metadata?.full_name ||
    "";

  next();
});

// =====================================================
// USER MANAGEMENT VALIDATION
// =====================================================

const newUserSchema = z
  .object({
    full_name: z.string().trim().min(2).max(100),

    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase()),

    password: z.string().min(12).max(128),

    role: z.enum(["admin", "manager", "member"]),
  })
  .strict();

const updateUserSchema = z
  .object({
    role: z.enum(["admin", "manager", "member"]),
  })
  .strict();

const userCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

// =====================================================
// GET CURRENT ADMIN PROFILE
// =====================================================

app.get("/api/admin/me", requireAdmin, (_req, res) => {
  res.json({
    user_id: res.locals.adminId,
    email: res.locals.adminEmail,
    full_name: res.locals.adminName,
    role: res.locals.adminRole,
  });
});

// =====================================================
// LIST USERS
// =====================================================

app.get(
  "/api/admin/user-access",
  requireAdmin,
  route(async (_req, res) => {
    const { data, error } = await db!
      .from("admin_users")
      .select("user_id,full_name,email,role")
      .order("full_name", {
        ascending: true,
      });

    if (error) {
      console.error("List admin users:", error);
      res.status(502).json({
        error: "Unable to list users",
      });
      return;
    }

    res.json(
      (data ?? []).map((row) => ({
        user_id: row.user_id,
        full_name: row.full_name || "",
        email: row.email || "",
        role: row.role,
      }))
    );
  })
);

// =====================================================
// ADD USER
// =====================================================

app.post(
  "/api/admin/user-access",
  requireAdmin,
  userCreationLimiter,
  route(async (req, res) => {
    const parsed = newUserSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid user details",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { full_name, email, password, role } =
      parsed.data;

    const {
      data: created,
      error: authError,
    } = await db!.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
      },
    });

    if (authError || !created.user) {
      res.status(authError?.status === 422 ? 409 : 400).json({
        error:
          authError?.message ||
          "Unable to create user",
      });
      return;
    }

    const userId = created.user.id;

    const { error: profileError } = await db!
      .from("admin_users")
      .insert({
        user_id: userId,
        full_name,
        email,
        role,
      });

    if (profileError) {
      console.error("Create user profile:", profileError);

      const { error: rollbackError } =
        await db!.auth.admin.deleteUser(userId);

      if (rollbackError) {
        console.error(
          "Account creation rollback failed:",
          rollbackError
        );
      }

      res.status(502).json({
        error:
          "Unable to save user permissions. Account creation was rolled back where possible.",
      });
      return;
    }

    res.status(201).json({
      user_id: userId,
      full_name,
      email,
      role,
    });
  })
);

// =====================================================
// UPDATE USER ROLE
// =====================================================

app.patch(
  "/api/admin/user-access/:id",
  requireAdmin,
  route(async (req, res) => {
    const id = z
      .string()
      .uuid()
      .safeParse(req.params.id);

    const parsed = updateUserSchema.safeParse(req.body);

    if (!id.success || !parsed.success) {
      res.status(400).json({
        error: "Invalid user or role",
      });
      return;
    }

    if (id.data === res.locals.adminId) {
      res.status(409).json({
        error: "You cannot change your own role",
      });
      return;
    }

    const { data: target, error: lookupError } =
      await db!
        .from("admin_users")
        .select("user_id,role,email")
        .eq("user_id", id.data)
        .maybeSingle();

    if (lookupError) {
      console.error("Role lookup:", lookupError);
      res.status(502).json({
        error: "Unable to verify user role",
      });
      return;
    }

    if (!target) {
      res.status(404).json({
        error: "User not found",
      });
      return;
    }

    if (target.role === "super_admin") {
      res.status(403).json({
        error: "Super Admin role is protected",
      });
      return;
    }

    // Only the owner can change another Admin's role.
    if (
      target.role === "admin" &&
      res.locals.adminRole !== "super_admin"
    ) {
      res.status(403).json({
        error: "Only Super Admin can change an Admin's role",
      });
      return;
    }

    if (
      target.role === "admin" &&
      parsed.data.role !== "admin"
    ) {
      const { count, error: countError } = await db!
        .from("admin_users")
        .select("user_id", {
          count: "exact",
          head: true,
        })
        .in("role", ["admin", "super_admin"]);

      if (
        countError ||
        count === null ||
        count <= 1
      ) {
        res.status(409).json({
          error: "At least one administrator must remain",
        });
        return;
      }
    }

    const { data, error } = await db!
      .from("admin_users")
      .update({
        role: parsed.data.role,
      })
      .eq("user_id", id.data)
      .select("user_id,full_name,email,role")
      .single();

    if (error) {
      console.error("Update user role:", error);
      res.status(502).json({
        error: "Unable to update user role",
      });
      return;
    }

    res.json(data);
  })
);

// =====================================================
// REMOVE USER
// =====================================================

app.delete(
  "/api/admin/user-access/:id",
  requireAdmin,
  route(async (req, res) => {
    const id = z
      .string()
      .uuid()
      .safeParse(req.params.id);

    if (!id.success) {
      res.status(400).json({
        error: "Invalid user ID",
      });
      return;
    }

    if (id.data === res.locals.adminId) {
      res.status(409).json({
        error: "You cannot remove your own account",
      });
      return;
    }

    const { data: target, error: lookupError } =
      await db!
        .from("admin_users")
        .select("user_id,role,email,full_name")
        .eq("user_id", id.data)
        .maybeSingle();

    if (lookupError) {
      console.error("User removal lookup:", lookupError);
      res.status(502).json({
        error: "Unable to verify the selected user",
      });
      return;
    }

    if (!target) {
      res.status(404).json({
        error: "User not found",
      });
      return;
    }

    if (target.role === "super_admin") {
      res.status(403).json({
        error: "Super Admin cannot be removed",
      });
      return;
    }

    if (
      target.role === "admin" &&
      res.locals.adminRole !== "super_admin"
    ) {
      res.status(403).json({
        error: "Only Super Admin can remove another Admin",
      });
      return;
    }

    if (target.role === "admin") {
      const { count, error: countError } = await db!
        .from("admin_users")
        .select("user_id", {
          count: "exact",
          head: true,
        })
        .in("role", ["admin", "super_admin"]);

      if (
        countError ||
        count === null ||
        count <= 1
      ) {
        res.status(409).json({
          error: "The last administrator cannot be removed",
        });
        return;
      }
    }

    // Revoke application access before deleting the Auth account.
    const { error: revokeError } = await db!
      .from("admin_users")
      .delete()
      .eq("user_id", id.data);

    if (revokeError) {
      console.error("Revoke admin access:", revokeError);
      res.status(502).json({
        error: "Unable to revoke user access",
      });
      return;
    }

    const { error: deleteAuthError } =
      await db!.auth.admin.deleteUser(id.data);

    if (deleteAuthError) {
      console.error("Delete user auth:", deleteAuthError);

      res.status(502).json({
        error:
          "Admin access was revoked, but the login account could not be deleted. Complete cleanup in Supabase Auth.",
      });
      return;
    }

    res.json({
      success: true,
      user_id: id.data,
    });
  })
);

// =====================================================
// ADMIN BOOKINGS
// =====================================================

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

// =====================================================
// SERVICE IMAGE PATH VALIDATION
// =====================================================

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
      !incoming.hash &&
      !incoming.username &&
      !incoming.password
    );
  } catch {
    return false;
  }
}

// =====================================================
// SERVICE SCHEMA
// =====================================================

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

// =====================================================
// LIST SERVICES
// =====================================================

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

// =====================================================
// CREATE SERVICE
// =====================================================

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
      console.error("Create service:", error);

      res.status(error.code === "23505" ? 409 : 502).json({
        error:
          error.code === "23505"
            ? "Service identifier already exists"
            : "Unable to create service",
      });
      return;
    }

    res.status(201).json(data);
  })
);

// =====================================================
// UPDATE SERVICE
// =====================================================

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
      console.error("Update service:", error);
      res.status(error.code === "23505" ? 409 : 502).json({
        error:
          error.code === "23505"
            ? "Service identifier already exists"
            : "Unable to update service",
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

// =====================================================
// UPLOAD CONFIGURATION
// =====================================================

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

  if (
    data.length >= 3 &&
    data.subarray(0, 3).toString("hex") === "ffd8ff"
  ) {
    return {
      extension: "jpg",
      contentType: "image/jpeg",
    };
  }

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

type ImageFolder = "services" | "reviews" | "artists";
type ImageField = "image_path" | "photo_url";

async function uploadAdminImage(
  req: Request,
  res: Response,
  folder: ImageFolder,
  responseField: ImageField
): Promise<void> {
  if (!db) {
    res.status(503).json({
      error: "Database not configured",
    });
    return;
  }

  if (
    !Buffer.isBuffer(req.body) ||
    !req.body.length ||
    req.body.length > MAX_IMAGE_SIZE
  ) {
    res.status(400).json({
      error: "Select an image up to 5 MB",
    });
    return;
  }

  const actual = identifyImage(req.body);

  const declared = req
    .get("Content-Type")
    ?.split(";")[0]
    .trim()
    .toLowerCase();

  if (!actual || declared !== actual.contentType) {
    res.status(415).json({
      error:
        "Only genuine JPG, PNG, or WebP images are supported",
    });
    return;
  }

  const objectPath =
    `${folder}/${randomUUID()}.${actual.extension}`;

  const { error } = await db.storage
    .from("service-images")
    .upload(objectPath, req.body, {
      contentType: actual.contentType,
      cacheControl:
        folder === "artists" ? "3600" : "31536000",
      upsert: false,
    });

  if (error) {
    console.error("Upload image:", error);
    res.status(502).json({
      error: "Image upload failed. Check the Storage bucket.",
    });
    return;
  }

  const { data } = db.storage
    .from("service-images")
    .getPublicUrl(objectPath);

  res.status(201).json({
    [responseField]: data.publicUrl,
  });
}

// =====================================================
// IMAGE UPLOAD ENDPOINTS
// =====================================================

app.post(
  "/api/admin/services/upload",
  requireAdmin,
  parseImage,
  route(async (req, res) => {
    await uploadAdminImage(
      req,
      res,
      "services",
      "image_path"
    );
  })
);

app.post(
  "/api/admin/testimonials/upload",
  requireAdmin,
  parseImage,
  route(async (req, res) => {
    await uploadAdminImage(
      req,
      res,
      "reviews",
      "photo_url"
    );
  })
);

app.post(
  "/api/admin/artist-details/upload",
  requireAdmin,
  parseImage,
  route(async (req, res) => {
    await uploadAdminImage(
      req,
      res,
      "artists",
      "photo_url"
    );
  })
);

// =====================================================
// TESTIMONIAL VALIDATION
// =====================================================

const testimonialSchema = z
  .object({
    author: z.string().trim().min(2).max(120),

    quote: z.string().trim().min(10).max(2000),

    context: z.string().trim().max(200),

    display_order: z
      .number()
      .int()
      .min(0)
      .max(10000),

    published: z.boolean(),

    review_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable(),

    service_name: z
      .string()
      .trim()
      .min(1)
      .max(120),

    rating: z
      .number()
      .int()
      .min(1)
      .max(5)
      .nullable(),

    photos: z
      .array(z.string().url().max(1200))
      .max(5),
  })
  .strict();

// =====================================================
// LIST REVIEWS
// =====================================================

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

// =====================================================
// CREATE REVIEW
// =====================================================

app.post(
  "/api/admin/testimonials",
  requireAdmin,
  route(async (req, res) => {
    const parsed = testimonialSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid testimonial details",
        details: parsed.error.flatten().fieldErrors,
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

// =====================================================
// UPDATE REVIEW
// =====================================================

app.patch(
  "/api/admin/testimonials/:id",
  requireAdmin,
  route(async (req, res) => {
    const id = z
      .string()
      .uuid()
      .safeParse(req.params.id);

    const parsed = testimonialSchema.safeParse(req.body);

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

// =====================================================
// COMPANY DETAILS VALIDATION
// =====================================================

const companyDetailsSchema = z
  .object({
    company_name: z.string().trim().min(2).max(120),

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

// =====================================================
// PUBLIC COMPANY DETAILS
// =====================================================

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
      console.error("Public company details:", error);
      res.status(502).json({
        error: "Unable to load company details",
      });
      return;
    }

    res.json({
      company_name:
        data?.company_name ?? "Jovia MUA",
      instagram_url:
        data?.instagram_url ?? "",
      whatsapp_number:
        data?.whatsapp_number ?? "",
    });
  })
);

// =====================================================
// ADMIN COMPANY DETAILS
// =====================================================

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
      console.error("Admin company details:", error);
      res.status(502).json({
        error: "Unable to load company details",
      });
      return;
    }

    res.json({
      company_name:
        data?.company_name ?? "Jovia MUA",
      instagram_url:
        data?.instagram_url ?? "",
      whatsapp_number:
        data?.whatsapp_number ?? "",
    });
  })
);

app.put(
  "/api/admin/company-details",
  requireAdmin,
  route(async (req, res) => {
    const parsed = companyDetailsSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid company details",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { data, error } = await db!
      .from("company_details")
      .upsert(
        {
          id: 1,
          ...parsed.data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select(
        "company_name,instagram_url,whatsapp_number"
      )
      .single();

    if (error) {
      console.error("Save company details:", error);
      res.status(502).json({
        error: "Unable to save company details",
      });
      return;
    }

    res.json(data);
  })
);

// =====================================================
// ARTIST DETAILS
// =====================================================

const artistFields =
  "section_label,artist_name,professional_title,biography,photo_url";

const defaultArtist = {
  section_label: "THE ARTIST",
  artist_name: "Namrata Vij",
  professional_title:
    "International Luxury Makeup Artist · Beauty Educator · Entrepreneur",
  biography:
    "Namrata Vij is an international luxury makeup artist known for creating modern, timeless, and sophisticated beauty experiences. From bridal transformations and destination weddings to editorial campaigns, fashion shows and special events, she creates looks that feel effortlessly elegant and uniquely personal.\n\nHolding an MBA in Marketing from the University of Technology Sydney and founder of Jovia MUA, Namrata brings together artistic excellence and a deep understanding of client experience.",
  photo_url: "/pictures/home-self.png" as string | null,
};

function validArtistPhoto(
  value: string | null
): boolean {
  if (
    value === null ||
    value === "/pictures/home-self.png"
  ) {
    return true;
  }

  if (!supabaseUrl) return false;

  try {
    const actual = new URL(value);
    const expected = new URL(supabaseUrl);

    return (
      actual.protocol === "https:" &&
      actual.origin === expected.origin &&
      /^\/storage\/v1\/object\/public\/service-images\/artists\/[a-zA-Z0-9_.-]+$/.test(
        actual.pathname
      ) &&
      !actual.search &&
      !actual.hash &&
      !actual.username &&
      !actual.password
    );
  } catch {
    return false;
  }
}

const artistDetailsSchema = z
  .object({
    section_label: z
      .string()
      .trim()
      .min(2)
      .max(80),

    artist_name: z
      .string()
      .trim()
      .min(2)
      .max(160),

    professional_title: z
      .string()
      .trim()
      .min(2)
      .max(400),

    biography: z
      .string()
      .trim()
      .min(20)
      .max(10000),

    photo_url: z
      .string()
      .max(1200)
      .nullable()
      .refine(
        validArtistPhoto,
        "Invalid artist photo URL"
      ),
  })
  .strict();

// =====================================================
// PUBLIC ARTIST DETAILS
// =====================================================

app.get(
  "/api/artist-details",
  route(async (_req, res) => {
    if (!db) {
      res.status(503).json({
        error: "Database not configured",
      });
      return;
    }

    const { data, error } = await db
      .from("artist_details")
      .select(artistFields)
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("Public artist details:", error);
      res.status(502).json({
        error: "Unable to load artist details",
      });
      return;
    }

    res.json(data ?? defaultArtist);
  })
);

// =====================================================
// ADMIN ARTIST DETAILS
// =====================================================

app.get(
  "/api/admin/artist-details",
  requireAdmin,
  route(async (_req, res) => {
    const { data, error } = await db!
      .from("artist_details")
      .select(artistFields)
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("Admin artist details:", error);
      res.status(502).json({
        error: "Unable to load artist details",
      });
      return;
    }

    res.json(data ?? defaultArtist);
  })
);

app.put(
  "/api/admin/artist-details",
  requireAdmin,
  route(async (req, res) => {
    const parsed = artistDetailsSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid artist details",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const { data, error } = await db!
      .from("artist_details")
      .upsert(
        {
          id: 1,
          ...parsed.data,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select(artistFields)
      .single();

    if (error) {
      console.error("Save artist details:", error);
      res.status(502).json({
        error: "Unable to save artist details",
      });
      return;
    }

    res.json(data);
  })
);

// =====================================================
// 404 HANDLER
// =====================================================

app.use((_req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
  });
});

// =====================================================
// GLOBAL ERROR HANDLER
// =====================================================

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

// =====================================================
// START SERVER
// =====================================================

app.listen(port, () => {
  console.log(
    `API running: http://localhost:${port}`
  );

  console.log(
    `Supabase: ${
      db ? "configured" : "not configured"
    }`
  );
});
