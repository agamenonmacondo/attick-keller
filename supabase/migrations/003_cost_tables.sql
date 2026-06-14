-- ============================================================
-- MIGRATION: Cost & Inventory Tables for A&K POS Dashboard
-- Date: 2026-05-27
-- Purpose: Create 12 missing tables for ingredients, recipes, 
--          prices, suppliers, purchases, and warehouse data
-- ============================================================

-- Use gen_random_uuid() (Supabase default)
-- uuid-ossp extension already exists

-- ============================================================
-- 1. pos_ingredient_categories (ALTA - catálogo de grupos de insumos)
-- Source: gruposi.csv
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_ingredient_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  pos_category_id TEXT NOT NULL,  -- idgruposi from CSV (e.g. "001", "002")
  name TEXT NOT NULL,              -- descripcion
  classification TEXT,             -- idgruposiclasificacion
  priority INTEGER DEFAULT 0,     -- prioridad
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, pos_category_id)
);

-- ============================================================
-- 2. pos_warehouses (ALTA - almacenes/bodegas)
-- Source: almacen.csv
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  pos_warehouse_id TEXT NOT NULL,  -- idalmacen from CSV (e.g. "01", "02")
  name TEXT NOT NULL,              -- nombre
  warehouse_type INTEGER DEFAULT 1, -- tipo (1=restaurant, 2=bodega)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, pos_warehouse_id)
);

-- ============================================================
-- 3. pos_ingredients (ALTA - insumos)
-- Source: insumos.csv
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  pos_ingredient_id TEXT NOT NULL,  -- idinsumo (e.g. "001002", "002002")
  name TEXT NOT NULL,               -- descripcion (e.g. "FR NARANJA")
  pos_category_id TEXT,             -- idgruposi → pos_ingredient_categories
  unit TEXT,                        -- unidad (e.g. "GR", "LT", "KG")
  is_composite BOOLEAN DEFAULT FALSE, -- elaborado from CSV
  yield NUMERIC(12,4) DEFAULT 1,   -- rendimientoelaborado
  alert_minutes INTEGER,            -- minutosalerta
  prep_minutes INTEGER,             -- minutospreparacion
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, pos_ingredient_id)
);

-- ============================================================
-- 4. pos_ingredient_costs (ALTA - costos por empresa/insumo)
-- Source: insumosdetalle.csv
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_ingredient_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  pos_ingredient_id TEXT NOT NULL,  -- idinsumo → pos_ingredients
  pos_company_id TEXT NOT NULL,     -- idempresa (e.g. "0000000001")
  inventory_track BOOLEAN DEFAULT TRUE, -- inventariable
  cost NUMERIC(15,4) DEFAULT 0,        -- costo
  avg_cost NUMERIC(15,4) DEFAULT 0,     -- costopromedio
  tax1 NUMERIC(8,4) DEFAULT 0,          -- impuesto1
  tax2 NUMERIC(8,4) DEFAULT 0,           -- impuesto2
  tax3 NUMERIC(8,4) DEFAULT 0,           -- impuesto3
  cost_with_tax NUMERIC(15,4) DEFAULT 0, -- costoconimpuestos
  waste NUMERIC(8,4) DEFAULT 0,          -- merma
  deduct BOOLEAN DEFAULT TRUE,           -- descargar
  status INTEGER DEFAULT 1,              -- estatus
  standard_cost NUMERIC(15,4),           -- costoestandar
  pos_area_id TEXT,                       -- idarea
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, pos_ingredient_id, pos_company_id)
);

-- ============================================================
-- 5. pos_product_prices (ALTA - precios de venta por producto/empresa)
-- Source: productosdetalle.csv
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  pos_product_id TEXT NOT NULL,     -- idproducto → pos_products
  pos_company_id TEXT NOT NULL,     -- idempresa
  price NUMERIC(15,4) NOT NULL,    -- precio (selling price)
  tax1 NUMERIC(8,4) DEFAULT 0,     -- impuesto1
  tax2 NUMERIC(8,4) DEFAULT 0,     -- impuesto2
  tax3 NUMERIC(8,4) DEFAULT 0,     -- impuesto3
  price_before_tax NUMERIC(15,4),  -- preciosinimpuestos
  is_blocked BOOLEAN DEFAULT FALSE, -- bloqueado
  is_open_price BOOLEAN DEFAULT FALSE, -- precioabierto
  pos_area_id TEXT,                 -- idarea
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, pos_product_id, pos_company_id)
);

-- ============================================================
-- 6. pos_product_recipes (ALTA - recetas: producto → insumos)
-- Source: costos.csv
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_product_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  pos_product_id TEXT NOT NULL,     -- idproducto → pos_products
  pos_ingredient_id TEXT NOT NULL,  -- idinsumo → pos_ingredients
  quantity NUMERIC(15,4) NOT NULL,  -- cantidad
  pos_company_id TEXT,              -- idempresa
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, pos_product_id, pos_ingredient_id, pos_company_id)
);

-- ============================================================
-- 7. pos_composite_ingredients (MEDIA - ingredientes compuestos/sub-recetas)
-- Source: elaborados.csv
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_composite_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  composite_id TEXT NOT NULL,      -- idelaborado (parent ingredient)
  ingredient_id TEXT NOT NULL,     -- idinsumo (child ingredient)
  quantity NUMERIC(15,4) NOT NULL, -- cantidad
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, composite_id, ingredient_id)
);

-- ============================================================
-- 8. pos_suppliers (MEDIA - proveedores)
-- Source: proveedores.csv
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  pos_supplier_id TEXT NOT NULL,      -- idproveedor
  name TEXT NOT NULL,                 -- nombre
  business_name TEXT,                 -- razonsocial
  address TEXT,                       -- direccion
  postal_code TEXT,                   -- codigopostal
  phone TEXT,                         -- telefono
  fax TEXT,                           -- fax
  email TEXT,                         -- email
  rfc TEXT,                           -- rfc
  credit BOOLEAN DEFAULT FALSE,      -- credito
  use_assigned_costs BOOLEAN DEFAULT FALSE, -- usarcostosasignados
  status INTEGER DEFAULT 1,          -- estatus
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, pos_supplier_id)
);

-- ============================================================
-- 9. pos_purchases (MEDIA - órdenes de compra)
-- Source: compras.csv
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  pos_purchase_id TEXT NOT NULL,      -- idcompra
  pos_company_id TEXT,                -- idempresa
  folio TEXT,                          -- folio
  applied_date TIMESTAMPTZ,           -- fechaaplicacion
  pos_supplier_id TEXT,               -- idproveedor → pos_suppliers
  invoice_folio TEXT,                  -- foliofactura
  invoice_date TIMESTAMPTZ,           -- fechafactura
  is_cancelled BOOLEAN DEFAULT FALSE, -- cancelado
  due_date TIMESTAMPTZ,               -- fechavencimiento
  cancelled_by TEXT,                   -- usuariocancelo
  created_by TEXT,                     -- usuario
  reference TEXT,                      -- referencia
  discount NUMERIC(15,4) DEFAULT 0,   -- descuento
  subtotal NUMERIC(15,4) DEFAULT 0,   -- subtotal
  tax1 NUMERIC(15,4) DEFAULT 0,        -- impuesto1
  tax2 NUMERIC(15,4) DEFAULT 0,        -- impuesto2
  tax3 NUMERIC(15,4) DEFAULT 0,        -- impuesto3
  total NUMERIC(15,4) DEFAULT 0,        -- total
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, pos_purchase_id)
);

-- ============================================================
-- 10. pos_purchase_items (MEDIA - items de compra)
-- Source: comprasmovtos.csv
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_purchase_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  pos_purchase_id TEXT NOT NULL,      -- idcompra → pos_purchases
  pos_ingredient_id TEXT NOT NULL,    -- idinsumo → pos_ingredients
  cost NUMERIC(15,4) DEFAULT 0,       -- costo
  discount NUMERIC(15,4) DEFAULT 0,   -- descuento
  tax1 NUMERIC(8,4) DEFAULT 0,        -- impuesto1
  tax1_amount NUMERIC(15,4) DEFAULT 0, -- impuesto1importe
  tax2 NUMERIC(8,4) DEFAULT 0,        -- impuesto2
  tax2_amount NUMERIC(15,4) DEFAULT 0, -- impuesto2importe
  tax3 NUMERIC(8,4) DEFAULT 0,        -- impuesto3
  tax3_amount NUMERIC(15,4) DEFAULT 0, -- impuesto3importe
  amount_before_tax NUMERIC(15,4) DEFAULT 0, -- importesinimpuestos
  amount_with_tax NUMERIC(15,4) DEFAULT 0,   -- importeconimpuestos
  pos_warehouse_id TEXT,              -- idalmacen → pos_warehouses
  quantity NUMERIC(15,4) DEFAULT 0,    -- cantidad
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 11. pos_stock_thresholds (BAJA - alertas de stock mínimo)
-- Source: stockinsumos.csv
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_stock_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  pos_ingredient_id TEXT NOT NULL,    -- idinsumo → pos_ingredients
  pos_warehouse_id TEXT,              -- idalmacen → pos_warehouses
  min_stock NUMERIC(15,4) DEFAULT 0,   -- stockminimo
  ideal_stock NUMERIC(15,4) DEFAULT 0, -- stockideal
  max_stock NUMERIC(15,4) DEFAULT 0,   -- stockmaximo
  pos_company_id TEXT,                 -- idempresa
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 12. pos_recipe_warehouses (BAJA - qué insumo sale de qué almacén por producto)
-- Source: recetasalmacenes.csv
-- ============================================================
CREATE TABLE IF NOT EXISTS pos_recipe_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  pos_product_id TEXT NOT NULL,        -- idproducto → pos_products
  pos_area_id TEXT,                    -- idarearestaurant → pos_areas
  pos_warehouse_id TEXT,               -- idalmacen → pos_warehouses
  pos_company_id TEXT,                 -- idempresa
  pos_ingredient_id TEXT NOT NULL,     -- idinsumo → pos_ingredients
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, pos_product_id, pos_ingredient_id, pos_warehouse_id)
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON pos_ingredients(restaurant_id, pos_category_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_costs_ingredient ON pos_ingredient_costs(restaurant_id, pos_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_product_recipes_product ON pos_product_recipes(restaurant_id, pos_product_id);
CREATE INDEX IF NOT EXISTS idx_product_recipes_ingredient ON pos_product_recipes(restaurant_id, pos_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_product_prices_product ON pos_product_prices(restaurant_id, pos_product_id);
CREATE INDEX IF NOT EXISTS idx_composite_ingredients_parent ON pos_composite_ingredients(restaurant_id, composite_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON pos_purchases(restaurant_id, pos_supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON pos_purchases(restaurant_id, applied_date);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON pos_purchase_items(restaurant_id, pos_purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_ingredient ON pos_purchase_items(restaurant_id, pos_ingredient_id);
CREATE INDEX IF NOT EXISTS idx_recipe_warehouses_product ON pos_recipe_warehouses(restaurant_id, pos_product_id);
CREATE INDEX IF NOT EXISTS idx_recipe_warehouses_ingredient ON pos_recipe_warehouses(restaurant_id, pos_ingredient_id);

-- ============================================================
-- RLS Policies (match existing table pattern)
-- ============================================================
ALTER TABLE pos_ingredient_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_ingredient_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_product_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_product_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_composite_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_stock_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE pos_recipe_warehouses ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Service role full access on ingredient_categories" ON pos_ingredient_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on warehouses" ON pos_warehouses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on ingredients" ON pos_ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on ingredient_costs" ON pos_ingredient_costs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on product_prices" ON pos_product_prices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on product_recipes" ON pos_product_recipes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on composite_ingredients" ON pos_composite_ingredients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on suppliers" ON pos_suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on purchases" ON pos_purchases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on purchase_items" ON pos_purchase_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on stock_thresholds" ON pos_stock_thresholds FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access on recipe_warehouses" ON pos_recipe_warehouses FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- COMMENTS
-- ============================================================
COMMENT ON TABLE pos_ingredient_categories IS 'Grupos de insumos (verdurasy, abarrotes, carnes, etc.)';
COMMENT ON TABLE pos_warehouses IS 'Almacenes/bodegas del restaurante';
COMMENT ON TABLE pos_ingredients IS 'Insumos del restaurante (ingredientes base y compuestos)';
COMMENT ON TABLE pos_ingredient_costs IS 'Costos de insumos por empresa (costo, costo promedio, impuestos)';
COMMENT ON TABLE pos_product_prices IS 'Precios de venta por producto y empresa';
COMMENT ON TABLE pos_product_recipes IS 'Recetas: relación producto → insumo con cantidad (BOM)';
COMMENT ON TABLE pos_composite_ingredients IS 'Ingredientes compuestos: sub-recetas de insumo elaborado';
COMMENT ON TABLE pos_suppliers IS 'Proveedores del restaurante';
COMMENT ON TABLE pos_purchases IS 'Órdenes de compra a proveedores';
COMMENT ON TABLE pos_purchase_items IS 'Items de compra (insumos comprados con costo)';
COMMENT ON TABLE pos_stock_thresholds IS 'Alertas de stock mínimo/ideal/máximo por insumo y almacén';
COMMENT ON TABLE pos_recipe_warehouses IS 'De qué almacén sale cada insumo por producto (receta por zona)';