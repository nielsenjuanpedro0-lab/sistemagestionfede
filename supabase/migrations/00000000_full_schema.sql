-- ============================================================================
-- Schema completo para base nueva de Fede (MundoApple) — desde cero, sin datos.
-- Reconstruido a partir de los .sql sueltos del repo + uso real en el código,
-- porque nunca existió un schema.sql maestro (las tablas originales se
-- crearon a mano en el dashboard de Supabase). Revisado con cuidado pero
-- probá el sistema a fondo antes de darlo por definitivo.
-- ============================================================================

-- ── Organizations ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'active',
  trial_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Profiles ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  initials TEXT,
  color TEXT DEFAULT '#3b82f6',
  role TEXT NOT NULL DEFAULT 'seller', -- 'owner' | 'seller'
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  deposit_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Helper: org del usuario logueado ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ── Deposits (depósitos/sucursales) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deposits (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Stock (equipos) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  deposit BIGINT REFERENCES public.deposits(id) ON DELETE SET NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  storage TEXT,
  color TEXT,
  condition TEXT DEFAULT 'new', -- 'new' | 'used'
  battery TEXT,
  imei TEXT UNIQUE,
  price NUMERIC,
  cost_price NUMERIC,
  currency TEXT NOT NULL DEFAULT 'USD',
  supplier_id BIGINT,
  upc TEXT,
  status TEXT NOT NULL DEFAULT 'available', -- 'available' | 'sold'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Sales (ventas) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sales (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  deposit_id BIGINT REFERENCES public.deposits(id) ON DELETE SET NULL,
  seller_id UUID,
  seller_name TEXT,
  brand TEXT,
  model TEXT,
  storage TEXT,
  color TEXT,
  imei TEXT,
  price NUMERIC,
  cost_price NUMERIC,
  currency TEXT NOT NULL DEFAULT 'ARS',
  payments JSONB,
  customer JSONB,
  accessories JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Settings (config del negocio) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.settings (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  shop_name TEXT,
  address TEXT,
  phone TEXT,
  instagram TEXT,
  warranty_text TEXT,
  exchange_rate NUMERIC DEFAULT 1000
);

-- ── Accessories ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.accessories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  org_id UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  deposit_id BIGINT REFERENCES public.deposits(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  compatible_model TEXT,
  color TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  cost_price NUMERIC,
  sale_price NUMERIC,
  currency TEXT NOT NULL DEFAULT 'USD'
);

-- ── Expenses (gastos) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.expenses (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS',
  category TEXT NOT NULL DEFAULT 'Operativo',
  deposit_id BIGINT REFERENCES public.deposits(id) ON DELETE SET NULL,
  seller_id UUID,
  seller_name TEXT
);

-- ── Customers (captura de datos del cliente en venta/reparación) ───────
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dni TEXT,
  phone TEXT,
  email TEXT,
  instagram TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Suppliers (proveedores — opcional al cargar stock) ──────────────────
CREATE TABLE IF NOT EXISTS public.suppliers (
  id BIGSERIAL PRIMARY KEY,
  org_id UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Repairs (servicio técnico) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  org_id UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  device_brand TEXT NOT NULL,
  device_model TEXT NOT NULL,
  device_color TEXT,
  device_password TEXT,
  issue_description TEXT,
  visual_condition TEXT,
  status TEXT NOT NULL DEFAULT 'INGRESADO', -- INGRESADO, REVISION, REPUESTO, REPARADO, ENTREGADO, CANCELADO
  budget NUMERIC,
  deposit_paid NUMERIC DEFAULT 0,
  deposit_id BIGINT REFERENCES public.deposits(id) ON DELETE SET NULL,
  assigned_technician TEXT,
  notes TEXT,
  cost NUMERIC,
  labor_cost NUMERIC DEFAULT 0
);

-- ── Spare parts (repuestos con stock) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.spare_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'ARS',
  stock INTEGER NOT NULL DEFAULT 0,
  deposit_id BIGINT REFERENCES public.deposits(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Repuestos usados por reparación (snapshot) ──────────────────────────
CREATE TABLE IF NOT EXISTS public.repair_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  repair_id UUID NOT NULL REFERENCES public.repairs(id) ON DELETE CASCADE,
  spare_part_id UUID NOT NULL REFERENCES public.spare_parts(id),
  spare_part_name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  cost_price NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ARS'
);

-- ── Product catalog (lookup para Carga EAN) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL DEFAULT public.current_user_org_id() REFERENCES public.organizations(id) ON DELETE CASCADE,
  upc TEXT UNIQUE,
  brand TEXT,
  model TEXT,
  category TEXT,
  storage TEXT,
  color TEXT
);

-- ============================================================================
-- RLS — aislamiento por organización en todas las tablas
-- ============================================================================

ALTER TABLE public.organizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessories     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repairs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spare_parts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_parts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;

-- Organizations: cada usuario ve/gestiona solo la suya
DROP POLICY IF EXISTS "Users see own org" ON public.organizations;
CREATE POLICY "Users see own org" ON public.organizations
  FOR SELECT USING (id = public.current_user_org_id());

-- Profiles
DROP POLICY IF EXISTS "Users can see profiles in their org" ON public.profiles;
CREATE POLICY "Users can see profiles in their org" ON public.profiles
  FOR SELECT USING (org_id = public.current_user_org_id() OR id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can update profiles in their org" ON public.profiles;
CREATE POLICY "Users can update profiles in their org" ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR (org_id = public.current_user_org_id() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner'));

DROP POLICY IF EXISTS "Owners can delete profiles" ON public.profiles;
CREATE POLICY "Owners can delete profiles" ON public.profiles
  FOR DELETE USING (org_id = public.current_user_org_id() AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'owner');

-- Tenant isolation genérica para el resto de las tablas
DO $$
DECLARE
  t TEXT;
  tables TEXT[] := ARRAY['deposits','stock','sales','settings','accessories','expenses','customers','suppliers','repairs','spare_parts','repair_parts','product_catalog'];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation Policy" ON public.%I', t);
    EXECUTE format('CREATE POLICY "Tenant Isolation Policy" ON public.%I FOR ALL USING (org_id = public.current_user_org_id()) WITH CHECK (org_id = public.current_user_org_id())', t);
  END LOOP;
END
$$;

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- RPCs
-- ============================================================================

-- Crea org + perfil owner para el primer login (bootstrap manual, no hay
-- alta pública en este sistema — se corre una sola vez para Fede)
CREATE OR REPLACE FUNCTION public.create_new_tenant(org_name TEXT, user_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO public.organizations (name) VALUES (org_name) RETURNING id INTO new_org_id;

  INSERT INTO public.profiles (id, name, email, role, org_id, initials, color)
  VALUES (
    auth.uid(), user_name,
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'owner', new_org_id, UPPER(LEFT(user_name, 2)), '#f59e0b'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, role = 'owner', org_id = new_org_id,
    initials = EXCLUDED.initials, color = EXCLUDED.color;

  RETURN new_org_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_new_tenant(TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.decrement_accessory_stock(acc_id UUID, qty INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.accessories SET stock = stock - qty WHERE id = acc_id AND stock >= qty;
END;
$$;
GRANT EXECUTE ON FUNCTION public.decrement_accessory_stock(UUID, INT) TO authenticated;

CREATE OR REPLACE FUNCTION public.decrement_spare_part_stock(part_id UUID, qty INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.spare_parts SET stock = stock - qty
  WHERE id = part_id AND org_id = public.current_user_org_id();
END;
$$;
GRANT EXECUTE ON FUNCTION public.decrement_spare_part_stock(UUID, INTEGER) TO authenticated;

CREATE OR REPLACE FUNCTION public.increment_spare_part_stock(part_id UUID, qty INTEGER)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.spare_parts SET stock = stock + qty
  WHERE id = part_id AND org_id = public.current_user_org_id();
END;
$$;
GRANT EXECUTE ON FUNCTION public.increment_spare_part_stock(UUID, INTEGER) TO authenticated;

-- Panel superadmin (solo lo usa Juan para soporte, email fijo abajo)
CREATE OR REPLACE FUNCTION public.get_all_organizations()
RETURNS TABLE (
  id UUID, name TEXT, plan TEXT, trial_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ, user_count BIGINT, owner_email TEXT
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, o.name, o.plan, o.trial_expires_at, o.created_at,
    COUNT(p.id)::bigint AS user_count,
    MAX(CASE WHEN p.role = 'owner' THEN p.email END) AS owner_email
  FROM public.organizations o
  LEFT JOIN public.profiles p ON p.org_id = o.id
  GROUP BY o.id, o.name, o.plan, o.trial_expires_at, o.created_at
$$;
GRANT EXECUTE ON FUNCTION public.get_all_organizations() TO authenticated;

CREATE OR REPLACE FUNCTION public.activate_organization(org_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'asciacontacto@gmail.com' THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;
  UPDATE public.organizations SET plan = 'active', trial_expires_at = NULL WHERE id = org_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.activate_organization(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_organization(org_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID := org_id;
BEGIN
  IF (SELECT email FROM auth.users WHERE id = auth.uid()) != 'asciacontacto@gmail.com' THEN
    RAISE EXCEPTION 'Permission denied';
  END IF;

  DELETE FROM public.repair_parts rp WHERE rp.org_id = v_id;
  DELETE FROM public.spare_parts sp WHERE sp.org_id = v_id;
  DELETE FROM public.repairs r WHERE r.org_id = v_id;
  DELETE FROM public.sales s WHERE s.org_id = v_id;
  DELETE FROM public.stock st WHERE st.org_id = v_id;
  DELETE FROM public.accessories ac WHERE ac.org_id = v_id;
  DELETE FROM public.expenses e WHERE e.org_id = v_id;
  DELETE FROM public.customers c WHERE c.org_id = v_id;
  DELETE FROM public.suppliers su WHERE su.org_id = v_id;
  DELETE FROM public.product_catalog pc WHERE pc.org_id = v_id;
  DELETE FROM public.deposits dep WHERE dep.org_id = v_id;
  DELETE FROM public.settings se WHERE se.org_id = v_id;
  DELETE FROM public.profiles p WHERE p.org_id = v_id;
  DELETE FROM public.organizations o WHERE o.id = v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.delete_organization(UUID) TO authenticated;
