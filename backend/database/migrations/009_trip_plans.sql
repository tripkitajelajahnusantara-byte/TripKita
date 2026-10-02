CREATE TABLE IF NOT EXISTS trip_plans (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    destination VARCHAR(120) NOT NULL,
    target_date VARCHAR(10) NOT NULL,
    participants INTEGER NOT NULL CHECK (participants BETWEEN 1 AND 100),
    target_budget BIGINT NOT NULL CHECK (target_budget > 0),
    checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
    savings_logs JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(20) NOT NULL DEFAULT 'SAVED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_plans_customer_updated
    ON trip_plans (customer_id, updated_at DESC);

ALTER TABLE trip_plans ENABLE ROW LEVEL SECURITY;
