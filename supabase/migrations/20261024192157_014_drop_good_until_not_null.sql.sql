-- Make good_until nullable since the app no longer uses it
ALTER TABLE listings ALTER COLUMN good_until DROP NOT NULL;
