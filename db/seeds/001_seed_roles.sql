INSERT INTO roles (id, code, name)
VALUES
  ('role-survivor', 'survivor', 'Survivor'),
  ('role-supporter', 'supporter', 'Supporter/Caregiver'),
  ('role-organization', 'organization', 'Organization Representative'),
  ('role-moderator', 'moderator', 'Moderator'),
  ('role-admin', 'admin', 'Platform Administrator')
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;
