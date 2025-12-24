-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE job_status AS ENUM (
  'draft',
  'quoting',
  'quoted',
  'accepted',
  'in_progress',
  'complete',
  'invoiced',
  'paid'
);

CREATE TYPE photo_type AS ENUM (
  'site_visit',
  'progress',
  'completion',
  'other'
);

-- Customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT
);

-- Jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status job_status DEFAULT 'draft',

  -- Dates
  quote_date DATE,
  quote_valid_until DATE,
  start_date DATE,
  end_date DATE,
  invoice_date DATE,
  paid_date DATE,

  -- Location
  job_address TEXT,

  -- Materials
  materials_notes TEXT,
  materials_cost DECIMAL(10, 2),
  supplier_quotes_attachments TEXT[],

  -- Labour
  labour_days DECIMAL(5, 2),
  labour_day_rate DECIMAL(10, 2),
  labour_cost DECIMAL(10, 2),

  -- Other
  other_costs DECIMAL(10, 2),
  other_costs_notes TEXT,

  -- Totals (calculated)
  subtotal DECIMAL(10, 2),
  vat_amount DECIMAL(10, 2),
  total DECIMAL(10, 2),

  -- Invoice specific
  invoice_number INTEGER,
  payment_reference TEXT
);

-- Photos table
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  storage_path TEXT NOT NULL,
  caption TEXT,
  photo_type photo_type DEFAULT 'other'
);

-- Settings table (single row per user)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,

  -- Business details
  business_name TEXT,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  logo_url TEXT,

  -- Financial
  default_day_rate DECIMAL(10, 2),
  vat_registered BOOLEAN DEFAULT FALSE,
  vat_number TEXT,
  bank_details TEXT,

  -- Message templates
  quote_message_template TEXT DEFAULT 'Hi {customer_name},

See attached your quote for {job_title}.

Valid until {expiry_date}.

Let me know if you have any questions.

Thanks,
{business_name}',
  invoice_message_template TEXT DEFAULT 'Hi {customer_name},

Please find attached invoice #{invoice_number} for {job_title}.

Total: £{total}

Payment details:
{bank_details}

Thanks,
{business_name}',

  -- Quote settings
  default_quote_validity_days INTEGER DEFAULT 30
);

-- Create indexes for better query performance
CREATE INDEX idx_customers_user_id ON customers(user_id);
CREATE INDEX idx_customers_name ON customers(name);
CREATE INDEX idx_jobs_user_id ON jobs(user_id);
CREATE INDEX idx_jobs_customer_id ON jobs(customer_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_quote_date ON jobs(quote_date);
CREATE INDEX idx_jobs_invoice_date ON jobs(invoice_date);
CREATE INDEX idx_photos_job_id ON photos(job_id);

-- Create a sequence for invoice numbers per user
CREATE SEQUENCE invoice_number_seq;

-- Function to auto-increment invoice numbers per user
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL AND NEW.status = 'invoiced' THEN
    NEW.invoice_number := (
      SELECT COALESCE(MAX(invoice_number), 0) + 1
      FROM jobs
      WHERE user_id = NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invoice numbers
CREATE TRIGGER set_invoice_number
BEFORE INSERT OR UPDATE ON jobs
FOR EACH ROW
EXECUTE FUNCTION generate_invoice_number();

-- Row Level Security (RLS) policies
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Customers policies
CREATE POLICY "Users can view their own customers"
  ON customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own customers"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own customers"
  ON customers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own customers"
  ON customers FOR DELETE
  USING (auth.uid() = user_id);

-- Jobs policies
CREATE POLICY "Users can view their own jobs"
  ON jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own jobs"
  ON jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs"
  ON jobs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own jobs"
  ON jobs FOR DELETE
  USING (auth.uid() = user_id);

-- Photos policies
CREATE POLICY "Users can view photos for their jobs"
  ON photos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = photos.job_id AND jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert photos for their jobs"
  ON photos FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = photos.job_id AND jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can update photos for their jobs"
  ON photos FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = photos.job_id AND jobs.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete photos for their jobs"
  ON photos FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM jobs WHERE jobs.id = photos.job_id AND jobs.user_id = auth.uid()
  ));

-- Settings policies
CREATE POLICY "Users can view their own settings"
  ON settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to create default settings for new users
CREATE OR REPLACE FUNCTION create_user_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create settings when user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_settings();
