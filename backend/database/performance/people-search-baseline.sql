-- Baseline: the former single-query OR filter across both joined tables.
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT people.id
FROM people
JOIN users AS managed_users
  ON managed_users.person_id = people.id
 AND managed_users.deleted_at IS NULL
WHERE people.deleted_at IS NULL
  AND (
    LOWER(COALESCE(people.first_name, '') || ' ' || COALESCE(people.middle_names, '') || ' ' || COALESCE(people.first_surname, '') || ' ' || COALESCE(people.second_surname, '')) LIKE :term
    OR LOWER(people.identification) LIKE :term
    OR LOWER(managed_users.username) LIKE :term
    OR LOWER(managed_users.email) LIKE :term
  )
ORDER BY LOWER(COALESCE(people.first_name, '') || ' ' || COALESCE(people.middle_names, '') || ' ' || COALESCE(people.first_surname, '') || ' ' || COALESCE(people.second_surname, '')) ASC,
         people.id ASC
LIMIT 10 OFFSET 0;
