-- Snapshot the reporting country on bookings; preserve historical unknowns.
ALTER TABLE systema.packages ADD COLUMN country text NOT NULL DEFAULT '' CHECK (country = '' OR country ~ '^[A-Z]{2}$');
ALTER TABLE systema.bookings ADD COLUMN country text NOT NULL DEFAULT '' CHECK (country = '' OR country ~ '^[A-Z]{2}$');
-- Existing private-schema grants and RLS policies remain in effect.
