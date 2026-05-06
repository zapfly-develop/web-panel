-- Backfill role separation after the new enum values are committed.
DO $$
BEGIN
    IF to_regclass('"Rider"') IS NOT NULL THEN
        EXECUTE 'UPDATE "User"
            SET "role" = ''RIDER''
            WHERE "role" = ''CUSTOMER''
              AND EXISTS (
                SELECT 1 FROM "Rider" WHERE "Rider"."userId" = "User"."id"
              )';
    END IF;
END $$;

UPDATE "User"
SET "role" = 'MERCHANT'
WHERE "role" = 'CUSTOMER'
  AND EXISTS (
    SELECT 1 FROM "Merchant" WHERE "Merchant"."userId" = "User"."id"
  );
