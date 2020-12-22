#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE TABLE users (
        discord_id VARCHAR(64) PRIMARY KEY NOT NULL,
        github_username VARCHAR(64) NOT NULL
    );

    CREATE TABLE guilds (
        guild_id VARCHAR(64) PRIMARY KEY NOT NULL
    );

    CREATE TABLE guilds_users (
        guild_id VARCHAR(64) NOT NULL,
        discord_id VARCHAR(64) NOT NULL,
        FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
        FOREIGN KEY (discord_id) REFERENCES users(discord_id) ON DELETE CASCADE,
        unique (guild_id, discord_id)
    );

EOSQL
