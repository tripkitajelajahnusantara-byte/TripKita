-- Run before deploying the API. Stores the places a trip visits as a JSON
-- array, in route order. packages.destination keeps the province for search;
-- existing packages start with no listed places until the provider adds them.
BEGIN;
ALTER TABLE packages
    ADD COLUMN IF NOT EXISTS destinations TEXT;
COMMIT;
