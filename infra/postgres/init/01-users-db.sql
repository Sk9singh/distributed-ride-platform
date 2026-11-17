-- Database-per-service, enforced by Postgres permissions rather than convention.
-- user_svc owns users_db and nothing else; later phases add ride_svc/rides_db, etc.
-- If ride-service ever tried to read users_db, Postgres itself would refuse the connection.

CREATE ROLE user_svc LOGIN PASSWORD 'user_svc';

CREATE DATABASE users_db OWNER user_svc;
CREATE DATABASE users_db_test OWNER user_svc;  -- used by integration tests

-- By default every role may CONNECT to every database. Turn that off.
REVOKE CONNECT ON DATABASE users_db FROM PUBLIC;
REVOKE CONNECT ON DATABASE users_db_test FROM PUBLIC;
