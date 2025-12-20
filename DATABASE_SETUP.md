# Database Setup Instructions

## Run the Database Migration

The error "Could not find the table 'public.projects'" means you need to create the database tables first.

### Steps to set up your database:

1. **Go to your Supabase Dashboard**

   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**

   - Click on "SQL Editor" in the left sidebar

3. **Run the Migration**

   - Click "New Query"
   - Copy and paste the entire content from: `supabase/migrations/001_initial_schema.sql`
   - Click "Run" or press Ctrl+Enter

4. **Verify Tables Created**
   - Go to "Table Editor" in the left sidebar
   - You should now see these tables:
     - profiles
     - projects
     - debug_sessions
     - code_fixes
     - repositories
     - agent_logs

### What the migration creates:

- **profiles**: User profile information
- **projects**: Your debugging projects
- **debug_sessions**: Tracking debugging sessions
- **code_fixes**: Applied code fixes
- **repositories**: Connected Git repositories
- **agent_logs**: AI agent activity logs

All tables include Row Level Security (RLS) policies to ensure users can only access their own data.

---

After running the migration, refresh your app and try creating a project again!
