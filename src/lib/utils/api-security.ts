/**
 * API Security Utilities — shared helpers for all API routes.
 *
 * Provides:
 * - handleApiError: sanitize errors before sending to client
 * - requireAuth: middleware-style auth check
 * - rateLimit: simple in-memory rate limiter
 * - COLUMN_ALLOWLIST: for pos-upload sanitization
 * - maskPII: removed — PII access controlled by getAdminUser (admin-only routes)
 * - ROLE_HIERARCHY: for privilege escalation prevention
 */

import { NextRequest, NextResponse } from "next/server"
import { getAdminUser, getStaffUser, getStaffOrLeaderUser, type AdminUser } from "@/lib/utils/admin-auth"
import { RESTAURANT_ID } from "@/lib/utils/constants"

// ─── Error Handler ────────────────────────────────────
// Never leak internal error details to the client

export function handleApiError(error: unknown, context: string): NextResponse {
  console.error("[" + context + "]", error)
  const isDev = process.env.NODE_ENV === "development"
  const message = error instanceof Error ? error.message : String(error)
  return NextResponse.json(
    { error: isDev ? message : "Error interno del servidor" },
    { status: 500 }
  )
}

// ─── Auth Middleware Helpers ─────────────────────────

/** Require admin (store_admin or super_admin) */
export async function requireAdmin(request: NextRequest): Promise<AdminUser | NextResponse> {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  return admin
}

/** Require staff (admin, host, or leader) */
export async function requireStaff(request: NextRequest): Promise<AdminUser | NextResponse> {
  const staff = await getStaffUser(request)
  if (!staff) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  return staff
}

/** Require admin or leader */
export async function requireStaffOrLeader(request: NextRequest): Promise<AdminUser | NextResponse> {
  const user = await getStaffOrLeaderUser(request)
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  return user
}

/** Require super_admin only */
export async function requireSuperAdmin(request: NextRequest): Promise<AdminUser | NextResponse> {
  const admin = await getAdminUser(request)
  if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  if (admin.role !== "super_admin") {
    return NextResponse.json({ error: "Requiere super_admin" }, { status: 403 })
  }
  return admin
}

/** Type guard: check if result is an error response */
export function isAuthError(result: AdminUser | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}

// ─── Role Hierarchy ───────────────────────────────

const ADMIN_CREATABLE_ROLES = ["colaborador", "reservante", "lider_area", "host"]
const SUPER_CREATABLE_ROLES = ["store_admin", "super_admin", ...ADMIN_CREATABLE_ROLES]

export function canCreateRole(actorRole: string, targetRole: string): boolean {
  if (actorRole === "super_admin") return SUPER_CREATABLE_ROLES.includes(targetRole)
  if (actorRole === "store_admin") return ADMIN_CREATABLE_ROLES.includes(targetRole)
  return false
}

// ─── Rate Limiter (in-memory, per-instance) ────────────
// TODO: Migrate to Upstash Redis or Vercel Edge KV for multi-instance support.
// The in-memory Map works for single-instance but in Vercel serverless each
// instance has its own Map, so an attacker can bypass by hitting different
// instances. For now this provides basic protection against naive abuse.

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export function rateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  entry.count++
  if (entry.count > maxRequests) return false
  return true
}

export function getClientIP(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown"
}

// ─── Column Allowlist (pos-upload) ───────────────

export const POS_UPLOAD_COLUMN_ALLOWLIST: Record<string, string[]> = {
  pos_sales: ["pos_folio", "pos_series", "pos_staff_id", "opened_at", "closed_at", "total", "tip", "tax1", "tax2", "is_paid", "is_cancelled", "restaurant_id", "pos_area_id", "pos_payment_method_id", "party_size", "service_time_minutes"],
  pos_sale_items: ["id", "pos_folio", "pos_series", "pos_product_id", "quantity", "unit_price", "total_price", "pos_product_group_id"],
  pos_products: ["pos_product_id", "pos_product_group_id", "name", "price", "cost", "is_active", "restaurant_id"],
  pos_product_groups: ["pos_product_group_id", "name", "group_number", "is_active", "restaurant_id"],
  pos_staff: ["pos_staff_id", "name", "pos_area_id", "is_active", "restaurant_id"],
  pos_areas: ["pos_area_id", "name", "restaurant_id"],
  pos_sale_payments: ["id", "pos_folio", "pos_series", "pos_payment_method_id", "amount", "tip_amount", "restaurant_id"],
  pos_payment_methods: ["pos_payment_method_id", "name", "restaurant_id"],
}

export function filterRowColumns(table: string, row: Record<string, unknown>): Record<string, unknown> {
  const allowed = POS_UPLOAD_COLUMN_ALLOWLIST[table]
  if (!allowed) return {}
  const filtered: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in row) filtered[key] = row[key]
  }
  filtered.restaurant_id = RESTAURANT_ID
  return filtered
}

// ─── Validation helpers ────────────────────────────

export function validateEmail(email: unknown): email is string {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function validateUUID(id: unknown): id is string {
  return typeof id === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}
