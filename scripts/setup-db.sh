#!/usr/bin/env bash
set -euo pipefail

echo "Creating PostgreSQL role and database for Verified Property platform..."

# Create or reset role password so .env credentials always match
sudo -u postgres psql <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'realestate') THEN
    CREATE ROLE realestate LOGIN PASSWORD 'realestate_dev' CREATEDB;
  ELSE
    ALTER ROLE realestate WITH LOGIN PASSWORD 'realestate_dev' CREATEDB;
  END IF;
END
$$;
SQL

DB_EXISTS=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='realestate_db'")
if [ "$DB_EXISTS" != "1" ]; then
  sudo -u postgres psql -c "CREATE DATABASE realestate_db OWNER realestate;"
fi

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE realestate_db TO realestate;"
sudo -u postgres psql -d realestate_db -c "GRANT ALL ON SCHEMA public TO realestate;"
sudo -u postgres psql -d realestate_db -c "ALTER DATABASE realestate_db OWNER TO realestate;"
sudo -u postgres psql -d realestate_db -c "GRANT ALL ON SCHEMA public TO realestate; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO realestate;"

echo ""
echo "Database ready: realestate_db"
echo "User: realestate"
echo "Password: realestate_dev"
echo "Connection: postgresql://realestate:realestate_dev@localhost:5432/realestate_db"
echo ""
echo "Next:"
echo "  npm run db:sync"
echo "  npm run db:seed"
