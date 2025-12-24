# Joiner Business Management Tool - Product Specification

## Overview

A mobile-first PWA for managing quotes, jobs, and invoices for a self-employed joiner. Designed to be simple enough for non-technical users while providing professional output and building valuable business records over time.

**Primary User:** Self-employed joiner, not technically savvy, works primarily from iPhone
**Key Goal:** Generate professional quotes and invoices with minimal data entry, replacing notepad-based workflow gradually

---

## Core Philosophy

- **Low barrier to entry** - Works with his existing workflow, doesn't force new habits
- **Progressive adoption** - Can start minimal (just invoice generation) and add more detail over time
- **Mobile-first** - 90% phone usage, occasional laptop access
- **Professional output** - Clean, branded PDFs that look the part

---

## Technical Stack

### Frontend
- **Framework:** React + Vite
- **Styling:** TailwindCSS (mobile-first)
- **PWA:** Service Worker via Workbox
- **PDF Generation:** @react-pdf/renderer (client-side)
- **Deployment:** Vercel/Netlify (or similar)

### Backend
- **Platform:** Supabase
  - PostgreSQL database
  - Authentication
  - Storage (1GB free tier, photos compressed to ~300KB each)
  - Row Level Security

### Photo Strategy
- Client-side compression before upload
- Max 1920px width, JPEG quality ~80%
- Target: 200-500KB per photo
- Estimated capacity: 2000-5000 photos on free tier

---

## Data Models

### Customers
```
id: uuid (PK)
created_at: timestamp
name: text (required)
phone: text
email: text
address: text
notes: text (e.g., "referred by John", "prefers text")
```

### Jobs
```
id: uuid (PK)
created_at: timestamp
customer_id: uuid (FK)
title: text (e.g., "Kitchen Refit", "Bathroom Door Install")
description: text (free-form notes, scope, requirements)
status: enum [draft, quoting, quoted, accepted, in_progress, complete, invoiced, paid]

# Dates
quote_date: date
quote_valid_until: date (default: +30 days from quote_date)
start_date: date
end_date: date
invoice_date: date
paid_date: date

# Location
job_address: text (if different from customer address)

# Initial Materials (shopping list phase)
materials_notes: text (free-form list of what's needed)

# After getting supplier quotes
materials_cost: decimal (total from all supplier quotes)
supplier_quotes_attachments: text[] (array of storage URLs)

# Labour
labour_days: decimal
labour_day_rate: decimal
labour_cost: decimal (can be calculated or manually entered as fixed price)

# Other
other_costs: decimal
other_costs_notes: text

# Totals (calculated)
subtotal: decimal
vat_amount: decimal (if VAT registered)
total: decimal

# Invoice specific
invoice_number: integer (auto-increment, unique)
payment_reference: text
```

### Photos
```
id: uuid (PK)
job_id: uuid (FK)
created_at: timestamp
storage_path: text (Supabase Storage URL)
caption: text
photo_type: enum [site_visit, progress, completion, other]
```

### Settings (single row, user-specific)
```
id: uuid (PK)
user_id: uuid (FK to auth.users)

# Business Details
business_name: text
contact_name: text
phone: text
email: text
address: text
logo_url: text (Supabase Storage)

# Financial
default_day_rate: decimal
vat_registered: boolean (default: false)
vat_number: text (nullable, required if vat_registered = true)
bank_details: text (for invoice payment info)

# Message Templates
quote_message_template: text
invoice_message_template: text

# Quote Settings
default_quote_validity_days: integer (default: 30)
```

---

## User Flows

### 1. Creating a Quote

**Stage 1: Initial Job Creation (on-site or immediately after)**
1. Navigate to "New Job" from home screen
2. Select existing customer OR create new customer
   - If new: name (required), phone, address
3. Add job title (e.g., "Kitchen Refit")
4. Add description/notes (free-form brain dump)
5. Optional: add materials notes (shopping list)
6. Save as Draft
7. Status = "draft" or "quoting"

**Stage 2: Getting Supplier Quotes (offline, traditional workflow)**
- Takes materials list to suppliers
- Gets quotes (Howdens, builders merchants, etc.)
- Does calculations on paper/notepad if needed

**Stage 3: Finalizing Quote (back in app)**
1. Open saved job
2. Enter materials cost (single number from supplier quotes)
3. Optional: attach photos of supplier quotes
4. Enter labour:
   - Either: days × day rate (auto-calculates)
   - Or: fixed labour cost
5. Optional: other costs
6. Review calculated total (materials + labour + other)
7. Set quote date (defaults to today)
8. Tap "Generate Quote"
9. PDF generates client-side
10. Review in-app
11. Tap "Share Quote"
12. Native share sheet opens with:
    - Pre-filled message: "Hi [Customer Name], see attached your quote for [Job Description]. Valid until [Date]. Let me know if you have any questions. Thanks, [Business Name]"
    - PDF attached
13. Select WhatsApp/Messages/Email
14. Send
15. Status → "quoted"

### 2. Quote Accepted → Job in Progress

1. Open job
2. Tap "Mark as Accepted"
3. Set start date
4. Optional: set estimated end date
5. Status → "accepted"
6. During job:
   - Can add progress photos
   - Can add notes
   - Can update costs if needed

### 3. Completing Job & Invoicing

1. Open job
2. Tap "Mark Complete"
3. Review final costs (edit if needed)
4. Tap "Generate Invoice"
5. Invoice number auto-assigned
6. PDF generates with:
   - Invoice number
   - Issue date
   - Due date (if configured)
   - Itemized breakdown
   - Payment details
   - VAT breakdown (if registered)
7. Tap "Share Invoice"
8. Share sheet with pre-filled message:
   - "Hi [Customer Name], please find attached invoice #[Number] for [Job Description]. Total: £[Amount]. Payment details: [Bank Details]. Thanks, [Business Name]"
9. Send via chosen method
10. Status → "invoiced"

### 4. Recording Payment

1. Open job
2. Tap "Mark as Paid"
3. Set payment date
4. Status → "paid"

---

## Key Screens/Views

### Home Dashboard
**Purpose:** Quick overview and primary navigation

**Content:**
- Header: Business name/logo
- Quick stats cards:
  - Jobs this week (count)
  - Outstanding quotes (count)
  - Unpaid invoices (count + total £)
- Primary action button: "+ New Job"
- Quick actions:
  - View Jobs
  - View Customers
  - View Calendar
- Recent jobs list (last 5, with status badges)

### Jobs List
**Purpose:** View and filter all jobs

**Features:**
- Search bar (searches customer name, job title, description)
- Filter chips: All / Quotes / Active / Complete / Invoiced / Paid
- Sort: Recent first (default), Oldest first, Customer name
- Job cards showing:
  - Customer name
  - Job title
  - Status badge
  - Date (contextual based on status)
  - Total amount
- Tap card → Job Detail

### Job Detail
**Purpose:** Complete view of single job with all actions

**Sections:**
- Header: Job title, status badge, customer name
- Quick actions row:
  - Generate Quote (if appropriate status)
  - Generate Invoice (if appropriate status)
  - Mark as Accepted/Complete/Paid (contextual)
- Customer info (tap to view customer detail)
- Dates section
- Description/notes
- Materials:
  - Notes
  - Cost
  - Attached supplier quotes (thumbnails, tap to view)
- Labour:
  - Days × rate OR fixed cost
- Other costs
- Photos gallery (if any)
- Totals breakdown:
  - Materials: £X
  - Labour: £X
  - Other: £X
  - Subtotal: £X
  - VAT (if applicable): £X
  - Total: £X
- Edit button (opens edit mode)
- Delete job (with confirmation)

### Job Edit Mode
**Purpose:** Modify job details

**Form sections:**
- Job title
- Description
- Materials notes
- Materials cost
- Labour (days + rate OR fixed cost toggle)
- Other costs + notes
- Dates
- Status dropdown
- Photos (add/remove)
- Save / Cancel buttons

### New Job / Edit Job Form
**Simple, mobile-optimized form:**
- Customer (searchable dropdown + "Add New" button)
- Job title (text input)
- Description (textarea)
- Materials notes (textarea)
- Start date (optional, date picker)
- Save as Draft button

### Customer List
**Purpose:** Manage customer database

**Features:**
- Search bar
- Alphabetical list
- Customer cards showing:
  - Name
  - Phone
  - Number of jobs
- Tap → Customer Detail
- "+ New Customer" button

### Customer Detail
**Purpose:** View customer info and job history

**Sections:**
- Customer info (editable)
  - Name
  - Phone
  - Email
  - Address
  - Notes
- Job history:
  - List of all jobs for this customer
  - Totals: X jobs, £X total value
  - Filter: All / Active / Complete
- Actions:
  - Edit Customer
  - Create New Job for Customer
  - Delete Customer (only if no jobs)

### Calendar View
**Purpose:** Visual timeline of scheduled jobs

**Features:**
- Month view (default)
- Week view (swipeable)
- Day view (swipeable)
- Jobs shown on their start dates
- Color coding by status:
  - Accepted: Blue
  - In Progress: Orange
  - Complete: Green
- Tap date → see all jobs that day
- Tap job → Job Detail
- Can drag/drop to reschedule (nice-to-have)

### Quote/Invoice Preview
**Purpose:** View generated PDF before sharing

**Features:**
- Full-screen PDF view
- Action buttons:
  - Share (primary)
  - Download
  - Print (if available)
  - Close

### Settings
**Purpose:** Configure business details and app behavior

**Sections:**

**Business Details:**
- Business name
- Contact name
- Phone
- Email
- Address
- Upload logo

**Financial:**
- Default day rate (£)
- VAT registered (toggle)
  - If yes: VAT number field appears
- Bank details (for invoice payment info)

**Quote Settings:**
- Quote validity period (days, default 30)

**Message Templates:**
- Quote message template (editable text with placeholders)
- Invoice message template (editable text with placeholders)
- Placeholders available:
  - {customer_name}
  - {job_title}
  - {total}
  - {invoice_number}
  - {expiry_date}
  - {business_name}

**About:**
- App version
- Contact support (email link)

---

## PDF Templates

### Quote PDF Structure
```
[Logo] [Business Name]
       [Address]
       [Phone]
       [Email]

QUOTE

Date: [Quote Date]
Quote Valid Until: [Expiry Date]
Quote Number: [ID or Reference]

Bill To:
[Customer Name]
[Customer Address]

Job: [Job Title]
[Job Description]

---

ITEMS:
Materials                    £[amount]
Labour ([X] days)            £[amount]
Other costs                  £[amount]
                            --------
Subtotal                     £[amount]
[VAT (20%)]                  £[amount]  // only if VAT registered
                            --------
TOTAL                        £[amount]
                            ========

[If VAT registered: VAT Registration Number: [number]]

Quote valid for [X] days from date above.

Payment terms: [From settings or default text]

---
[Business Footer / Contact Info]
WE WON'T BE BEATEN ON PRICE
```

### Invoice PDF Structure
```
[Logo] [Business Name]
       [Address]
       [Phone]
       [Email]
       [VAT Number if registered]

INVOICE

Invoice Number: [Auto-increment]
Invoice Date: [Date]
Due Date: [Configurable]

Bill To:
[Customer Name]
[Customer Address]

Job: [Job Title]
[Job Description]

---

ITEMS:
Materials                    £[amount]
Labour ([X] days)            £[amount]
Other costs                  £[amount]
                            --------
Subtotal                     £[amount]
[VAT (20%)]                  £[amount]  // only if VAT registered
                            --------
AMOUNT DUE                   £[amount]
                            ========

Payment Details:
[Bank details from settings]

Payment Reference: [Invoice Number or custom]

---
[Business Footer / Contact Info]
```

**Styling:**
- Clean, professional, black and white
- Use business logo/branding provided
- Clear hierarchy and spacing
- Mobile-friendly layout (readable on phone)
- Print-friendly

---

## Feature Priority / Phasing

### Phase 1: MVP (Core Invoice Generation)
**Goal:** Solve immediate need for bigger jobs requiring invoices

**Features:**
- Customer database (create, view, list)
- Job creation (minimal fields)
- Materials cost (single number)
- Labour cost (days × rate OR fixed)
- Invoice PDF generation
- Invoice sharing with pre-filled messages
- Basic job list
- Settings (business details, VAT toggle, bank details)

**Success Metric:** Brother-in-law uses it for next big job's invoice

### Phase 2: Quote Generation & Workflow
**Goal:** Replace notepad for quote process

**Features:**
- Quote PDF generation
- Quote sharing with pre-filled messages
- Status workflow (draft → quoted → accepted → invoiced → paid)
- Materials notes field
- Attach supplier quote photos
- Quote validity dates
- Customer detail view with job history

**Success Metric:** Creates quotes in-app instead of notepad

### Phase 3: Calendar & Photos
**Goal:** Full job management and documentation

**Features:**
- Calendar view (month/week/day)
- Photo uploads (compressed, captioned)
- Progress tracking
- Job scheduling
- Enhanced job detail view
- Search and filters

**Success Metric:** Uses app for all job planning and documentation

### Phase 4: Polish & Optimization
**Goal:** Refinement based on real usage

**Features:**
- Offline mode with sync
- Enhanced reporting (monthly earnings, outstanding invoices)
- Bulk actions
- Data export
- Customer communication history
- Template jobs for common work types
- Performance optimization
- UX refinements based on feedback

---

## Technical Implementation Notes

### Authentication
- Simple email/password via Supabase Auth
- Single user (no need for multi-user at this stage)
- Keep logged in (refresh tokens)
- Future: Could add magic link email auth for simpler login

### Database Design Considerations
- Use Supabase Realtime if multiple devices need instant sync
- Row Level Security policies to ensure data privacy
- Soft deletes (archive) rather than hard deletes for customers/jobs
- Auto-increment invoice numbers using Postgres sequence
- Indexes on frequently queried fields (customer_id, status, dates)

### PWA Configuration
**manifest.json:**
```json
{
  "name": "Joiner Business Manager",
  "short_name": "Joiner App",
  "description": "Manage quotes, jobs and invoices",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "orientation": "portrait",
  "icons": [
    // Multiple sizes for iOS
  ]
}
```

**Service Worker Strategy:**
- Cache-first for static assets
- Network-first for data
- Queue photo uploads if offline
- Background sync when connection restored
- Workbox for easy configuration

### Photo Upload Flow
1. User selects/captures photo
2. Client-side compression (canvas API)
   - Resize to max 1920px width
   - Convert to JPEG at 80% quality
   - Create blob
3. Upload to Supabase Storage
4. Store URL in photos table
5. If offline: queue in IndexedDB, sync when online

### PDF Generation
- Use @react-pdf/renderer
- Create reusable components for quote/invoice templates
- Generate on button press (don't pre-generate)
- Convert to blob for Web Share API
- Fallback to download if share not available

### Web Share API Implementation
```javascript
async function shareQuote(job, pdfBlob) {
  const file = new File([pdfBlob], `quote-${job.id}.pdf`, {
    type: 'application/pdf'
  });
  
  const message = generateQuoteMessage(job);
  
  if (navigator.share && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `Quote - ${job.title}`,
        text: message,
        files: [file]
      });
    } catch (err) {
      // User cancelled or error
      // Fallback to download
    }
  } else {
    // Fallback: download PDF
    downloadPDF(pdfBlob, `quote-${job.id}.pdf`);
  }
}
```

### Error Handling
- Toast notifications for errors
- Retry logic for network failures
- Graceful degradation (e.g., offline mode)
- Form validation with helpful messages
- Loading states for async operations

### Performance Considerations
- Lazy load routes (React.lazy)
- Optimize images (both UI assets and user photos)
- Virtual scrolling for long lists (if needed)
- Debounce search inputs
- Minimize bundle size
- Service Worker caching for instant loads

---

## Non-Functional Requirements

### Browser Support
- iOS Safari 15+ (primary)
- Chrome/Edge (desktop fallback)
- No need for legacy IE or older browsers

### Performance Targets
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse PWA score: 90+
- Photo uploads: < 5s per photo

### Accessibility
- Semantic HTML
- ARIA labels where needed
- Touch targets min 44×44px (Apple HIG)
- Readable contrast ratios
- Support for iOS text size settings

### Security
- HTTPS only
- Supabase Row Level Security
- Sanitize user inputs
- Secure file uploads (validate file types)
- Auth token refresh handling

### Data Backup
- Everything in Supabase (cloud-backed)
- User can export data (future feature)
- Photos backed up in Supabase Storage

---

## Future Considerations (Beyond MVP)

### Potential Enhancements
- Multi-user (if he hires someone)
- Expense tracking (materials purchased, mileage)
- Customer payment reminders
- Recurring jobs (annual maintenance)
- Materials inventory management
- Time tracking (clock in/out per job)
- Integration with accounting software (Xero, QuickBooks)
- Customer portal (view quotes/invoices online)
- Digital signatures on quotes/contracts
- Payment processing (Stripe integration)
- Automated backup/export to Google Drive
- Job templates for common work types
- Profit margin calculations and reporting

### Things to Explicitly NOT Build (Keep Scope Tight)
- Full accounting system (let his accountant handle that)
- Payroll management
- Complex project management (Gantt charts, dependencies)
- Team collaboration features (unless he scales significantly)
- Customer relationship management (CRM) features
- Marketing automation
- Social media integration beyond basic sharing

---

## Success Criteria

### Adoption Metrics
- Uses app for all invoices (100% adoption for new jobs)
- Creates at least 50% of quotes in-app within 3 months
- Customer database has >20 customers within 6 months
- Positive feedback / continues using after 3 months

### Quality Metrics
- Generates professional-looking PDFs
- No data loss or corruption
- Fast enough that it doesn't slow him down
- Minimal bugs that affect core workflow

### Business Value
- Saves time vs paper-based process
- Professional appearance improves customer perception
- Building valuable customer/job history
- Can track outstanding payments easily
- Saves subscription fees vs commercial alternatives (£150-300/year)

---

## Branding & Design

**Logo:** To be provided (simple, clean, black and white)

**Color Scheme:**
- Primary: Black (#000000)
- Background: White (#FFFFFF)
- Accent: Could add a subtle color for CTAs/status badges
- Status colors:
  - Draft: Grey
  - Quoted: Blue
  - Accepted: Orange
  - In Progress: Orange
  - Complete: Green
  - Invoiced: Purple
  - Paid: Green

**Typography:**
- Clean, readable sans-serif
- Large enough for phone use (min 16px body text)
- Clear hierarchy

**UI Style:**
- Clean, minimal
- Big touch targets
- Clear visual feedback for actions
- Card-based layouts for mobile
- Bottom navigation or fixed header for main actions

---

## Development Approach

### Setup
1. Create Supabase project
2. Set up database schema with migrations
3. Configure Row Level Security policies
4. Set up Supabase Storage buckets
5. Create React app with Vite
6. Install dependencies (Tailwind, Supabase client, react-pdf, etc.)
7. Set up PWA configuration

### Development Flow
1. Build Phase 1 features first (focus on invoice generation)
2. Test with real data and workflow
3. Get feedback from brother-in-law
4. Iterate on UX based on feedback
5. Add Phase 2 features
6. Repeat feedback loop

### Testing Strategy
- Manual testing on actual iPhone
- Test PWA installation and offline behavior
- Test share functionality with various apps
- Test PDF generation on different devices
- Test photo compression and upload
- Validate forms and error handling
- Test with real job data

### Deployment
- Deploy to Vercel/Netlify
- Custom domain (optional)
- SSL automatic
- Continuous deployment from git main branch
- Environment variables for Supabase keys

---

## Questions to Answer During Development

1. **Invoice numbering:** Reset annually? Prefix with year? Just sequential?
2. **Quote expiry:** Auto-expire quotes? Send reminder?
3. **Payment terms:** Default to "Due on receipt" or net 14/30 days?
4. **Currency:** Assume GBP, but allow changing symbol in settings?
5. **Decimals:** Always show 2 decimal places for currency?
6. **Customer required fields:** Just name, or require phone as well?
7. **Job deletion:** Hard delete or soft delete (archive)?
8. **Photo limits:** Max photos per job? Max total storage usage warning?

---

## Contact & Feedback

**Developer:** Ian (you)
**End User:** Brother-in-law (joiner)
**Feedback mechanism:** Direct conversation + in-app thumbs up/down or feedback form (Phase 4)

---

## Version History

- **v1.0** - Initial spec (December 2024)
  - Core feature set defined
  - Technical approach decided
  - Phased development plan

---

## Appendix: Sample Data

### Example Job Entry
```
Customer: John Smith
Job Title: Kitchen Refit
Description: Replace 3 internal doors, install new door handles and bathroom fittings
Materials Notes:
- 3x internal doors (2'6", 2'3", 2'0")
- Antique brass handles and hinges
- Bathroom bolt and latches

Materials Cost: £952.22 (from Howdens quote C29/0352666)
Labour: 5 days × £200/day = £1000
Other Costs: £50 (delivery)

Total: £2002.22 (£2402.66 inc VAT if registered)
```

### Example Quote Message
```
Hi John,

See attached your quote for the Kitchen Refit we discussed.

Valid until 30th January 2025.

Let me know if you have any questions.

Thanks,
[Business Name]
```

### Example Invoice Message
```
Hi John,

Please find attached invoice #0047 for Kitchen Refit.

Total: £2,402.66

Payment details:
Sort Code: 12-34-56
Account: 12345678
Reference: INV0047

Thanks,
[Business Name]
```

---

## End of Specification

This spec is intended as a living document and will be updated as development progresses and requirements evolve based on real-world usage.
