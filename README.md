# SKN - School Management System

A comprehensive school management system built with React, TypeScript, and Supabase.

## Features

- **Student Management**: Complete student records, enrollment, and profile management
- **Academic Management**: Classes, subjects, teachers, and academic years
- **Attendance Tracking**: Daily attendance recording and reporting
- **Exam Management**: Exam scheduling, results, and report cards
- **Financial Management**: Fee payments, discounts, salary payments, and accounting
- **Library Management**: Book catalog, loans, and returns
- **Transport Management**: Transport routes and student transport assignments
- **ID Card System**: Student and staff ID card generation
- **User Management**: Role-based access control for staff and administrators

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: Shadcn UI (Radix UI + Tailwind CSS)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router DOM
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts for data visualization
- **Date Handling**: date-fns + Persian (Shamsi) calendar support

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for backend)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/shamekhanaenoor-oss/SKN.git
   cd SKN
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   VITE_SUPABASE_PROJECT_ID=your_project_id
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open your browser at `http://localhost:8080`

### Database Setup

The project includes Supabase migrations in the `supabase/migrations/` directory. Run these migrations in your Supabase project to set up the database schema.

## Project Structure

```
SKN/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/         # Page components
│   ├── lib/           # Utilities and hooks
│   ├── hooks/         # Custom React hooks
│   ├── integrations/  # Third-party integrations
│   └── test/          # Test files
├── supabase/          # Database migrations and config
├── public/            # Static assets
└── config files       # Vite, Tailwind, TypeScript configs
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests

## Deployment

The project is configured for deployment on Netlify. See `netlify.toml` for deployment configuration.

## License

This project is licensed under the MIT License.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.