-- Agent run logs table for LangGraph observability
CREATE TABLE IF NOT EXISTS agent_run_logs (
  id          SERIAL PRIMARY KEY,
  thread_id   TEXT NOT NULL,
  project_id  INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  node_name   TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'running',
  cost_credits NUMERIC(10, 4) DEFAULT 0,
  error       TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_run_logs_project_id ON agent_run_logs (project_id);
CREATE INDEX IF NOT EXISTS idx_agent_run_logs_thread_id ON agent_run_logs (thread_id);
CREATE INDEX IF NOT EXISTS idx_agent_run_logs_created_at ON agent_run_logs (created_at DESC);
