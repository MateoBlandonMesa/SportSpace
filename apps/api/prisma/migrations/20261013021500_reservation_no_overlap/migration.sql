CREATE EXTENSION IF NOT EXISTS btree_gist;

DROP FUNCTION IF EXISTS reservation_tstzrange(timestamp with time zone, timestamp with time zone);

ALTER TABLE "Reservation" ADD COLUMN IF NOT EXISTS "span" tstzrange;

CREATE OR REPLACE FUNCTION reservation_set_span()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW."span" := tstzrange(NEW."startsAt", NEW."endsAt", '[)');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reservation_span_tg ON "Reservation";
CREATE TRIGGER reservation_span_tg
BEFORE INSERT OR UPDATE OF "startsAt", "endsAt"
ON "Reservation"
FOR EACH ROW
EXECUTE FUNCTION reservation_set_span();

UPDATE "Reservation"
SET "span" = tstzrange("startsAt", "endsAt", '[)')
WHERE "span" IS NULL;

ALTER TABLE "Reservation" ALTER COLUMN "span" SET NOT NULL;

ALTER TABLE "Reservation" DROP CONSTRAINT IF EXISTS "Reservation_no_overlap";
ALTER TABLE "Reservation"
  ADD CONSTRAINT "Reservation_no_overlap"
  EXCLUDE USING gist (
    "spaceId" WITH =,
    "span" WITH &&
  )
  WHERE (status IN ('PENDING', 'APPROVED'));
