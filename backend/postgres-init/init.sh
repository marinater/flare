#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE TABLE users (
        discord_id VARCHAR(64) PRIMARY KEY NOT NULL,
        github_username VARCHAR(64) NOT NULL
    );
EOSQL
