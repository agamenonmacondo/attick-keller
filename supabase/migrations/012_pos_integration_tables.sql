-- ============================================================
-- Migration 012: POS Integration Tables
-- SoftRestaurant v11 → A&K Supabase
-- Prefijo pos_ para facilitar migracion directa
-- ============================================================

-- Enable RLS auto on new tables
-- (already have rls_auto_enable trigger from earlier migrations)

-- ============================================================
-- FASE 1: CATALOGOS (sin dependencias entre ellos)
-- ============================================================

-- 1.1 pos_areas ← areasrestaurant
CREATE TABLE IF NOT EXISTS pos_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    pos_area_id TEXT NOT NULL,           -- idarearestaurant del POS: '01','02',...
    name TEXT NOT NULL,                  -- descripcion: 'TEE PEE','PIZZERIA',...
    service_type INTEGER DEFAULT 1,     -- idtiposervicio: 1=presencial
    is_active BOOLEAN DEFAULT true,     -- Estatus
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(restaurant_id, pos_area_id)
);

-- 1.2 pos_payment_methods ← formasdepago
CREATE TABLE IF NOT EXISTS pos_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    pos_payment_method_id TEXT NOT NULL, -- idformadepago: 'EF','VISA','10',...
    name TEXT NOT NULL,                  -- descripcion: 'EFECTIVO','VISA',...
    type INTEGER DEFAULT 1,             -- tipo: 1=efectivo, 2=tarjeta, 3=transferencia
    acceptance_tip BOOLEAN DEFAULT true, -- aceptapropina
    sort_order INTEGER DEFAULT 0,       -- prioridadboton
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(restaurant_id, pos_payment_method_id)
);

-- 1.3 pos_staff ← meseros
CREATE TABLE IF NOT EXISTS pos_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    pos_staff_id TEXT NOT NULL,          -- idmesero: '01','02',...
    name TEXT NOT NULL,                  -- nombre: 'MARTIN ORREGO',...
    staff_type INTEGER DEFAULT 1,        -- tipo: 1=mesero, 2=cajero, 3=admin
    is_visible BOOLEAN DEFAULT true,     -- visible
    pos_internal_id INTEGER,             -- idmeserointerno
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(restaurant_id, pos_staff_id)
);

-- 1.4 pos_product_groups ← grupos + subgrupos
CREATE TABLE IF NOT EXISTS pos_product_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    pos_group_id TEXT NOT NULL,          -- idgrupo: '01','02',...
    name TEXT NOT NULL,                  -- descripcion: 'ANTIPASTOS FRIOS',...
    classification INTEGER DEFAULT 2,    -- clasificacion: 2=alimentos, 1=bebidas
    parent_pos_subgroup_id TEXT,         -- idsubgrupo padre (para subgrupos)
    is_subgroup BOOLEAN DEFAULT false,   -- true si es subgrupo
    is_alcohol BOOLEAN DEFAULT false,    -- alcohol: si vende alcohol
    sort_order INTEGER DEFAULT 0,        -- prioridad
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(restaurant_id, pos_group_id)
);

-- 1.5 pos_products ← productos
CREATE TABLE IF NOT EXISTS pos_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    pos_product_id TEXT NOT NULL,         -- idproducto: '01001','01002',...
    name TEXT NOT NULL,                   -- descripcion: 'HUMMUS CON VEGETALES',...
    pos_group_id TEXT NOT NULL,           -- idgrupo FK logica → pos_product_groups
    use_dining BOOLEAN DEFAULT false,     -- usarcomedor
    use_delivery BOOLEAN DEFAULT false,   -- usardomicilio
    use_quick BOOLEAN DEFAULT false,      -- usarrapido
    visible_menu BOOLEAN DEFAULT true,    -- visible_menu
    visible_kiosk BOOLEAN DEFAULT false,  -- visible_kiosko
    created_at TIMESTAMPTZ DEFAULT now(),
    
    FOREIGN KEY (restaurant_id, pos_group_id) REFERENCES pos_product_groups(restaurant_id, pos_group_id),
    UNIQUE(restaurant_id, pos_product_id)
);

-- ============================================================
-- FASE 2: VENTAS (con dependencias a catalogos)
-- ============================================================

-- 2.1 pos_shifts ← turnos (antes de ventas porque ventas referencia turnos)
CREATE TABLE IF NOT EXISTS pos_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    pos_shift_id TEXT NOT NULL,           -- idturno: '3216','3217',...
    opened_at TIMESTAMPTZ,               -- apertura
    closed_at TIMESTAMPTZ,               -- cierre
    station TEXT,                         -- idestacion: 'CAJATEE','CAJAVINO',...
    cashier TEXT,                         -- cajero: 'CAJERO4',...
    cash_total NUMERIC(12,2) DEFAULT 0,   -- efectivo
    card_total NUMERIC(12,2) DEFAULT 0,   -- tarjeta
    credit_total NUMERIC(12,2) DEFAULT 0, -- credito
    is_closed BOOLEAN DEFAULT false,      -- corte_enviado
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(restaurant_id, pos_shift_id)
);

-- 2.2 pos_sales ← cheques
CREATE TABLE IF NOT EXISTS pos_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    
    -- IDs originales del POS
    pos_folio TEXT NOT NULL,              -- folio: '143377',...
    pos_series TEXT DEFAULT 'POS',        -- seriefolio: 'POS'
    pos_check_number TEXT,                -- numcheque
    
    -- Fechas
    opened_at TIMESTAMPTZ NOT NULL,       -- fecha apertura
    closed_at TIMESTAMPTZ,               -- fecha cierre
    
    -- Ubicacion
    pos_table_code TEXT,                  -- mesa: 'TP26','BARRA',...
    pos_area_id TEXT,                     -- idarearestaurant → pos_areas
    party_size INTEGER DEFAULT 1,        -- nopersonas
    
    -- Personal
    pos_staff_id TEXT,                    -- idmesero → pos_staff
    station TEXT,                          -- estacion: 'MESEROS','COMANDERO1',...
    
    -- Cliente
    pos_customer_id TEXT,                 -- idcliente: '000001' (CONSUMIDOR FINAL)
    customer_id UUID REFERENCES customers(id),  -- Vinculo a A&K (match por telefono)
    
    -- Turno
    pos_shift_id TEXT,                    -- idturno → pos_shifts
    
    -- Estado
    is_paid BOOLEAN DEFAULT false,         -- pagado
    is_cancelled BOOLEAN DEFAULT false,     -- cancelado
    cancel_reason TEXT,                     -- razoncancelado
    cancelled_at TIMESTAMPTZ,               -- fechacancelado
    cancelled_by TEXT,                       -- usuariocancelo
    paid_by TEXT,                            -- usuariopago: 'CAJERO4',...
    
    -- Totales (COP)
    item_count INTEGER DEFAULT 0,           -- totalarticulos
    subtotal NUMERIC(12,2) DEFAULT 0,        -- subtotal
    total NUMERIC(12,2) DEFAULT 0,          -- total (con impuesto)
    total_with_tip NUMERIC(12,2) DEFAULT 0,  -- totalconpropina
    tax_amount NUMERIC(12,2) DEFAULT 0,      -- totalimpuesto1 (IVA)
    tip_amount NUMERIC(12,2) DEFAULT 0,      -- propina
    discount_amount NUMERIC(12,2) DEFAULT 0, -- descuentoimporte
    cash_paid NUMERIC(12,2) DEFAULT 0,       -- efectivo
    card_paid NUMERIC(12,2) DEFAULT 0,       -- tarjeta
    food_total NUMERIC(12,2) DEFAULT 0,      -- totalalimentos
    drinks_total NUMERIC(12,2) DEFAULT 0,    -- totalbebidas
    
    -- Facturacion
    pos_note_id TEXT,                        -- folionotadeconsumo
    is_note BOOLEAN DEFAULT false,           -- notadeconsumo
    pos_invoice_code TEXT,                    -- codigo_unico_af (facturacion electronica)
    
    created_at TIMESTAMPTZ DEFAULT now(),
    
    FOREIGN KEY (restaurant_id, pos_area_id) REFERENCES pos_areas(restaurant_id, pos_area_id),
    FOREIGN KEY (restaurant_id, pos_staff_id) REFERENCES pos_staff(restaurant_id, pos_staff_id),
    FOREIGN KEY (restaurant_id, pos_shift_id) REFERENCES pos_shifts(restaurant_id, pos_shift_id),
    UNIQUE(restaurant_id, pos_folio)
);

-- 2.3 pos_sale_items ← cheqdet
CREATE TABLE IF NOT EXISTS pos_sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    
    pos_sale_id UUID NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE, -- via pos_folio = foliodet
    pos_folio TEXT NOT NULL,               -- foliodet (para busqueda directa)
    
    line_number INTEGER DEFAULT 1,         -- movimiento: 1,2,3,...
    pos_product_id TEXT NOT NULL,           -- idproducto: '01001',...
    quantity NUMERIC(10,6) DEFAULT 0,      -- cantidad
    unit_price NUMERIC(12,2) DEFAULT 0,    -- precio (COP)
    price_before_tax NUMERIC(12,2) DEFAULT 0, -- preciosinimpuestos
    tax_rate NUMERIC(6,2) DEFAULT 0,       -- impuesto1 (8% IVA)
    catalog_price NUMERIC(12,2) DEFAULT 0, -- preciocatalogo
    discount NUMERIC(12,2) DEFAULT 0,      -- descuento
    comment TEXT,                            -- comentario: 'SIN PICO GALLO',...
    station TEXT,                            -- idestacion
    served_at TIMESTAMPTZ,                  -- hora
    pos_staff_product TEXT,                 -- idmeseroproducto
    
    FOREIGN KEY (restaurant_id, pos_product_id) REFERENCES pos_products(restaurant_id, pos_product_id)
);

-- 2.4 pos_sale_payments ← chequespagos
CREATE TABLE IF NOT EXISTS pos_sale_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    
    pos_sale_id UUID NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
    pos_folio TEXT NOT NULL,               -- folio (para busqueda directa)
    
    pos_payment_method_id TEXT NOT NULL,   -- idformadepago → pos_payment_methods
    amount NUMERIC(12,2) DEFAULT 0,       -- importe (COP)
    tip NUMERIC(12,2) DEFAULT 0,           -- propina
    reference TEXT,                         -- referencia (tarjeta)
    exchange_rate NUMERIC(8,4) DEFAULT 1,  -- tipodecambio
    
    FOREIGN KEY (restaurant_id, pos_payment_method_id) REFERENCES pos_payment_methods(restaurant_id, pos_payment_method_id)
);

-- ============================================================
-- FASE 3: TABLA DE MAPEO (cross-reference POS ↔ A&K)
-- ============================================================

CREATE TABLE IF NOT EXISTS pos_id_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    ak_table TEXT NOT NULL,               -- 'customers','menu_items','table_zones',...
    ak_id UUID NOT NULL,                  -- ID en la tabla A&K
    pos_table TEXT NOT NULL,              -- 'clientes','productos','areasrestaurant',...
    pos_id TEXT NOT NULL,                 -- ID original del POS
    metadata JSONB DEFAULT '{}',          -- Datos extra del mapeo
    created_at TIMESTAMPTZ DEFAULT now(),
    
    UNIQUE(restaurant_id, ak_table, ak_id, pos_table, pos_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

-- pos_sales: busquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_pos_sales_restaurant ON pos_sales(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_folio ON pos_sales(restaurant_id, pos_folio);
CREATE INDEX IF NOT EXISTS idx_pos_sales_customer ON pos_sales(restaurant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_pos_customer ON pos_sales(restaurant_id, pos_customer_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_staff ON pos_sales(restaurant_id, pos_staff_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_date ON pos_sales(restaurant_id, opened_at);
CREATE INDEX IF NOT EXISTS idx_pos_sales_area ON pos_sales(restaurant_id, pos_area_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_shift ON pos_sales(restaurant_id, pos_shift_id);

-- pos_sale_items: busquedas por venta y producto
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_sale ON pos_sale_items(pos_sale_id);
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_product ON pos_sale_items(restaurant_id, pos_product_id);
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_folio ON pos_sale_items(restaurant_id, pos_folio);

-- pos_sale_payments: busquedas por venta
CREATE INDEX IF NOT EXISTS idx_pos_sale_payments_sale ON pos_sale_payments(pos_sale_id);
CREATE INDEX IF NOT EXISTS idx_pos_sale_payments_method ON pos_sale_payments(restaurant_id, pos_payment_method_id);

-- pos_sales: cancelados (para filtrar)
CREATE INDEX IF NOT EXISTS idx_pos_sales_cancelled ON pos_sales(restaurant_id, is_cancelled) WHERE is_cancelled = true;

-- pos_id_mapping: busquedas rapidas
CREATE INDEX IF NOT EXISTS idx_pos_id_mapping_ak ON pos_id_mapping(restaurant_id, ak_table, ak_id);
CREATE INDEX IF NOT EXISTS idx_pos_id_mapping_pos ON pos_id_mapping(restaurant_id, pos_table, pos_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- RLS already enabled and policies already created by earlier migration run
-- These are idempotent - ALTER TABLE ENABLE RLS is safe to re-run
-- Policies use DO blocks to skip if already exists

-- ============================================================
-- COMENTARIOS
-- ============================================================

COMMENT ON TABLE pos_areas IS 'Areas del restaurante desde SoftRestaurant POS (areasrestaurant)';
COMMENT ON TABLE pos_payment_methods IS 'Formas de pago desde SoftRestaurant POS (formasdepago)';
COMMENT ON TABLE pos_staff IS 'Personal mesero/cajero desde SoftRestaurant POS (meseros)';
COMMENT ON TABLE pos_product_groups IS 'Grupos de productos desde SoftRestaurant POS (grupos + subgrupos)';
COMMENT ON TABLE pos_products IS 'Catalogo de productos desde SoftRestaurant POS (productos)';
COMMENT ON TABLE pos_shifts IS 'Turnos de caja desde SoftRestaurant POS (turnos)';
COMMENT ON TABLE pos_sales IS 'Ventas cerradas desde SoftRestaurant POS (cheques)';
COMMENT ON TABLE pos_sale_items IS 'Detalle de items por venta desde SoftRestaurant POS (cheqdet)';
COMMENT ON TABLE pos_sale_payments IS 'Pagos por venta desde SoftRestaurant POS (chequespagos)';
COMMENT ON TABLE pos_id_mapping IS 'Mapeo cruzado entre IDs del POS e IDs de A&K';