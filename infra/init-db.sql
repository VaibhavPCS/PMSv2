-- Auto-create all service databases on first boot.
-- postgres:16 runs all .sql files in /docker-entrypoint-initdb.d/
-- The default DB (pms_auth) is already created by POSTGRES_DB env var.

CREATE DATABASE pms_workspace;
CREATE DATABASE pms_project;
CREATE DATABASE pms_task;
CREATE DATABASE pms_notification;
CREATE DATABASE pms_analytics;
CREATE DATABASE pms_meeting;
CREATE DATABASE pms_chat;

-- Grant the pms user full access to all databases
GRANT ALL PRIVILEGES ON DATABASE pms_auth         TO pms;
GRANT ALL PRIVILEGES ON DATABASE pms_workspace    TO pms;
GRANT ALL PRIVILEGES ON DATABASE pms_project      TO pms;
GRANT ALL PRIVILEGES ON DATABASE pms_task         TO pms;
GRANT ALL PRIVILEGES ON DATABASE pms_notification TO pms;
GRANT ALL PRIVILEGES ON DATABASE pms_analytics    TO pms;
GRANT ALL PRIVILEGES ON DATABASE pms_meeting      TO pms;
GRANT ALL PRIVILEGES ON DATABASE pms_chat         TO pms;