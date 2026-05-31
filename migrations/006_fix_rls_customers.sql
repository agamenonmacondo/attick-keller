-- Migration 006: Fix RLS policies for customers and customer_stats
-- Problema: Las políticas creadas en 003_rls_fixes.sql están bloqueando
-- las consultas del backend aunque se use service_role

-- ============================================================
-- 1. Eliminar políticas conflictivas existentes
-- ============================================================


