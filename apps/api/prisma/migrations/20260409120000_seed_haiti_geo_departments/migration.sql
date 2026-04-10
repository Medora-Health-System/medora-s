-- Reference data: 10 Haiti geographic departments (ISO 3166-2 HT-*, French labels from haiti-departments.geojson).
-- Idempotent: safe to re-apply; updates name/sortOrder if code already exists.

INSERT INTO "GeoDepartment" ("id", "code", "name", "sortOrder", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, v.code, v.name, v.sort_order, NOW(), NOW()
FROM (VALUES
  ('HT-AR', 'Artibonite', 1),
  ('HT-CE', 'Centre', 2),
  ('HT-GA', 'Grand''Anse', 3),
  ('HT-NI', 'Nippes', 4),
  ('HT-ND', 'Nord', 5),
  ('HT-NE', 'Nord-Est', 6),
  ('HT-NO', 'Nord-Ouest', 7),
  ('HT-OU', 'Ouest', 8),
  ('HT-SD', 'Sud', 9),
  ('HT-SE', 'Sud-Est', 10)
) AS v(code, name, sort_order)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();
