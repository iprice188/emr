# EMR Business Manager

A mobile-first PWA for managing quotes, jobs, and invoices for a self-employed joiner.

## Tech Stack

- **Frontend:** React + Vite + TypeScript
- **Styling:** TailwindCSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage)
- **PDF Generation:** @react-pdf/renderer
- **PWA:** Vite PWA Plugin + Workbox

## Getting Started

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### 2. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once your project is created, go to the SQL Editor
3. Copy the contents of `supabase/migrations/001_initial_schema.sql`
4. Paste and run it in the SQL Editor

This will create:
- Database tables (customers, jobs, photos, settings)
- Row Level Security policies
- Auto-increment invoice numbers
- Default settings for new users

### 3. Supabase Storage Setup

1. Go to Storage in your Supabase dashboard
2. Create a new bucket called `photos`
3. Set it to **Private** (access controlled by RLS)
4. Create a new bucket called `documents` for supplier quotes
5. Set it to **Private**

### 4. Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Get your Supabase credentials:
   - Go to Settings > API in your Supabase dashboard
   - Copy the Project URL and anon/public key

3. Fill in your `.env` file:
   ```
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

### 5. Install Dependencies

```bash
npm install
```

### 6. Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 7. Build for Production

```bash
npm run build
```

### 8. Preview Production Build

```bash
npm run preview
```

## Project Structure

```
joinersmate/
├── src/
│   ├── components/       # Reusable UI components
│   ├── lib/             # Supabase client and utilities
│   ├── pages/           # Page components (routes)
│   ├── types/           # TypeScript type definitions
│   ├── App.tsx          # Main app with routing
│   ├── main.tsx         # App entry point
│   └── index.css        # Global styles + Tailwind
├── supabase/
│   └── migrations/      # Database schema SQL files
├── docs/                # Documentation and specs
├── public/              # Static assets
└── index.html           # HTML entry point
```

## Features

### Phase 1 & 2 (Current)
- ✅ Customer database management
- ✅ Job creation and tracking
- ✅ Quote generation with professional PDFs
- ✅ Invoice generation with auto-incrementing numbers
- ✅ Status workflow (draft → quoted → invoiced → paid)
- ✅ Cost breakdown (materials, labour, other)
- ✅ VAT calculations
- ✅ Web Share API integration
- ✅ PWA with offline support

### Phase 3 (Planned)
- Calendar view
- Photo uploads with compression
- Progress tracking
- Search and advanced filters

### Phase 4 (Planned)
- Reporting and analytics
- Data export
- Performance optimizations
- Template jobs

## Development Notes

### Testing on iPhone

1. Deploy to Vercel/Netlify (automatic with GitHub)
2. Visit the URL on your iPhone
3. Tap Share → Add to Home Screen
4. App installs as a PWA with native feel

### Database Schema Updates

If you need to modify the database:
1. Create a new migration file: `supabase/migrations/002_your_change.sql`
2. Run it in Supabase SQL Editor
3. Update TypeScript types in `src/types/database.ts`

## License

Private project - All rights reserved
