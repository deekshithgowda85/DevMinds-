-- Multi-Agent Debugger Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  email TEXT,
  role TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  repository_url TEXT,
  language TEXT,
  framework TEXT,
  status TEXT DEFAULT 'active', -- active, archived, completed
  stars INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Debug Sessions table
CREATE TABLE IF NOT EXISTS debug_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  session_name TEXT,
  status TEXT DEFAULT 'active', -- active, completed, failed
  error_count INTEGER DEFAULT 0,
  fixes_applied INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Code Fixes table
CREATE TABLE IF NOT EXISTS code_fixes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES debug_sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  file_path TEXT,
  error_type TEXT,
  error_message TEXT,
  fix_description TEXT,
  code_before TEXT,
  code_after TEXT,
  status TEXT DEFAULT 'pending', -- pending, applied, rejected
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  applied_at TIMESTAMP WITH TIME ZONE
);

-- Repositories table
CREATE TABLE IF NOT EXISTS repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  url TEXT,
  branch TEXT DEFAULT 'main',
  last_sync TIMESTAMP WITH TIME ZONE,
  file_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Agent Logs table
CREATE TABLE IF NOT EXISTS agent_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES debug_sessions(id) ON DELETE CASCADE,
  agent_name TEXT,
  action TEXT,
  input_data JSONB,
  output_data JSONB,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_debug_sessions_user_id ON debug_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_debug_sessions_project_id ON debug_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_code_fixes_session_id ON code_fixes(session_id);
CREATE INDEX IF NOT EXISTS idx_code_fixes_user_id ON code_fixes(user_id);
CREATE INDEX IF NOT EXISTS idx_repositories_user_id ON repositories(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_session_id ON agent_logs(session_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE debug_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_fixes ENABLE ROW LEVEL SECURITY;
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for projects
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for debug_sessions
CREATE POLICY "Users can view own debug sessions" ON debug_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own debug sessions" ON debug_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own debug sessions" ON debug_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own debug sessions" ON debug_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for code_fixes
CREATE POLICY "Users can view own code fixes" ON code_fixes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own code fixes" ON code_fixes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own code fixes" ON code_fixes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own code fixes" ON code_fixes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for repositories
CREATE POLICY "Users can view own repositories" ON repositories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own repositories" ON repositories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own repositories" ON repositories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own repositories" ON repositories
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for agent_logs
CREATE POLICY "Users can view own agent logs" ON agent_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM debug_sessions
      WHERE debug_sessions.id = agent_logs.session_id
      AND debug_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own agent logs" ON agent_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM debug_sessions
      WHERE debug_sessions.id = agent_logs.session_id
      AND debug_sessions.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repositories_updated_at BEFORE UPDATE ON repositories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
