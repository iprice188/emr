# EMR Business Manager (JoinersMate)

A mobile-first Progressive Web App (PWA) for managing joinery business operations - quotes, invoices, customers, and jobs.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, RLS)
- **PDF Generation**: jsPDF
- **Routing**: React Router v6
- **Deployment**: Vercel

## Project Structure

```
src/
├── components/
│   └── Layout.tsx          # Main layout with header and bottom nav
├── pages/
│   ├── Login.tsx           # Authentication (login only, no signup)
│   ├── Home.tsx            # Dashboard with stats and recent jobs
│   ├── Settings.tsx        # Business settings and templates
│   ├── CustomersList.tsx   # Customer list with search
│   ├── CustomerForm.tsx    # Add/edit customer
│   ├── CustomerDetail.tsx  # Customer details and jobs
│   ├── JobsList.tsx        # Jobs list with status filtering
│   ├── JobForm.tsx         # Add/edit job with cost calculations
│   └── JobDetail.tsx       # Job details with PDF generation/sharing
├── lib/
│   ├── supabase.ts         # Supabase client setup
│   └── pdfGenerator.ts     # Quote and invoice PDF generation
├── types/
│   └── database.ts         # TypeScript types for all entities
└── App.tsx                 # Routes and auth wrapper
```

## Database Schema

### Settings
- One per user (auto-created on login)
- Business details (name, contact, address, logo)
- Financial settings (VAT registration, bank details, default day rate)
- Message templates for quotes and invoices

### Customers
- User-scoped customer records
- Fields: name, phone, email, address, notes
- Related to jobs

### Jobs
- User-scoped job records
- **Status flow**: draft → quoting → quoted → accepted → in_progress → complete → invoiced → paid
- **Pricing**: Materials + Labour + Other Costs = Subtotal → +VAT → Total
- **Labour options**: Days-based (days × day_rate) OR fixed cost
- **Numbers**: invoice_number (shared for quote/invoice, starts at 1001)
- **Dates**: quote_date, quote_valid_until, start_date, end_date, invoice_date, paid_date

### Photos
- Schema exists but not yet implemented
- Will link to jobs with photo_type categories

## Key Features

### 1. Multi-Tenant Architecture
- Each user has completely isolated data
- RLS policies enforce user_id filtering
- Settings, customers, jobs all scoped per user

### 2. Quote Generation
**Auto-numbering**: First quote generates invoice_number (starts at 1001), increments sequentially
**Auto-status**: Sets status to 'quoted', sets quote_date and quote_valid_until (30 days)
**PDF Features**:
- Black header with gradient fade (0-50mm solid, 50-65mm gradient)
- EMR logo at top left (PNG format)
- Quote #[number] centered below title
- Shows: customer info, job details, cost breakdown, VAT, total
- Footer: "Valid for 30 days from [quote_date]"

### 3. Invoice Generation
**Auto-status**: Sets status to 'invoiced' (unless already paid), sets invoice_date
**Uses same number** as quote for continuity
**PDF Features**:
- Same black header with gradient and logo as quote
- Invoice #[number] centered below title
- Shows: customer info, job details, cost breakdown, VAT, total
- Payment details section with bank details
- No quote-specific information (dates, validity)

### 4. Share Functionality (Web Share API)
**Mobile-first**: Opens native share sheet on mobile devices
**Supports**: WhatsApp, Email, SMS, AirDrop, etc.
**Message templates** with placeholder replacement:

**Quote placeholders**:
- `{customer_name}` - Customer's name
- `{job_title}` - Job title
- `{quote_number}` - Quote/invoice number
- `{expiry_date}` - Quote expiry date
- `{company_name}` or `{business_name}` - Business name from settings

**Invoice placeholders**:
- `{customer_name}` - Customer's name
- `{job_title}` - Job title
- `{invoice_number}` - Invoice number
- `{total}` - Formatted total (£X,XXX.XX)
- `{bank_details}` - Bank payment details
- `{company_name}` or `{business_name}` - Business name from settings

**Fallback**: If Web Share API not available (desktop), falls back to download

### 5. Internal vs Customer-Facing Content
**Description field**: Appears on quotes and invoices (customer-facing)
**Notes field**: Internal notes only, never appears on PDFs (private)

### 6. Labour Pricing Flexibility
Two modes in job form:
- **Days-based**: Enter days + day_rate → auto-calculates labour_cost
- **Fixed**: Enter labour_cost directly
JobForm auto-detects which mode based on what's populated when editing

### 7. Quick Customer Creation
Modal in JobForm allows creating new customer without leaving the page

## Configuration

### Environment Variables (.env)
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Database Setup
Run these SQL migrations in Supabase SQL Editor:
1. Initial schema (tables, RLS policies) - already applied
2. `add-notes-column.sql` - Adds internal notes field to jobs

### Logo Assets
- **App header**: `/public/emr-logo.png` (w-48 / 192px width)
- **PDFs**: `/public/emr-logo.png` (60mm wide in PDFs)
- Black background logo works with black header design

## Styling Conventions

### Colors
- **Primary**: Black (`bg-black`, `text-black`)
- **Accents**: Gray scale for secondary elements
- **Status colors**: Defined in `getStatusColor()` functions (blue for quoting, green for paid, etc.)

### Buttons
- `btn-primary`: Black background, white text
- `btn-secondary`: White background, black border, black text

### Mobile-First
- Sticky header at top
- Fixed bottom navigation (Home, Jobs, Customers, Settings)
- `pb-20` on main content to avoid bottom nav overlap
- Touch-friendly tap targets

## PDF Generation

### Header Design
- Black rectangle: 0-50mm
- Gradient fade: 50-65mm (15 steps from black to white)
- Logo: positioned at 10mm from top, 60mm wide
- Content starts at 65mm

### Cost Breakdown Table
- Gray header row
- Materials, Labour, Other Costs rows
- Notes for each cost item (smaller gray text)
- Subtotal line separator
- VAT row (if applicable)
- Total in highlighted gray box

## Development

### Start Dev Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Type Check
```bash
npm run type-check
```

## Deployment

- **Platform**: Vercel
- **Repo**: https://github.com/iprice188/emr.git
- **Branch**: main
- **Auto-deploy**: Pushes to main trigger automatic deployment
- **Environment**: Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel

## Authentication

- **Email/password only** (no sign-up in UI)
- Users created manually via Supabase dashboard
- Settings auto-created on first login via `ensureUserSettings()` in Login.tsx
- No email confirmation required

## Common Workflows

### Adding a Job
1. Create customer (if new) via Customers page or quick-create modal
2. Create job → status: 'draft'
3. Fill in costs, labour details
4. Generate quote → status: 'quoted', assigns number (e.g., #1001), sets dates
5. Share quote via WhatsApp/Email
6. Update status to 'accepted' manually when customer accepts
7. Work on job → update status to 'in_progress', then 'complete'
8. Generate invoice → status: 'invoiced', sets invoice_date
9. Share invoice
10. Mark as 'paid' manually when payment received

### Customizing Templates
1. Go to Settings
2. Scroll to "Message Templates"
3. Edit Quote/Invoice templates
4. Use placeholders for dynamic content
5. Test by sharing a quote/invoice

## Future Enhancements

### Photo Upload (Pending)
- Schema exists in database
- Categories: site_visit, progress, completion, other
- Will integrate with Supabase Storage
- Display in job detail page

### Potential Features
- Payment tracking/reminders
- Expense tracking
- Time tracking for jobs
- Calendar integration
- Reports/analytics
- Multi-language support

## Troubleshooting

### Quote/Invoice Numbers
- Numbers start at 1001 minimum
- Sequential per user
- Shared between quote and invoice for same job
- Generated when quote is first created

### PDF Issues
- Logo must be in `/public/` folder
- Logo path: `/emr-logo.png` (served from public)
- Browser caching: Hard refresh to see logo updates

### Share Not Working
- Web Share API only works on mobile browsers and HTTPS
- Desktop browsers fall back to download
- User can cancel share (AbortError is ignored)

## Git Workflow

- Main branch for production
- Push to main triggers Vercel deployment
- Commit messages include Claude Code attribution

## Support

- Issues: https://github.com/anthropics/claude-code/issues
- Claude Code docs: https://docs.claude.com/en/docs/claude-code

---

**Last Updated**: December 2025
**Version**: 1.0
**Status**: Production Ready (except photo upload feature)
