-- Run only against a disposable or representative database after migrations.
-- Change the term to a value that matches representative rows (3+ characters).
ANALYZE people;
ANALYZE users;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT people.id
FROM people
JOIN users AS managed_users
  ON managed_users.person_id = people.id
 AND managed_users.deleted_at IS NULL
WHERE people.deleted_at IS NULL
  AND people.id IN (
    SELECT id
    FROM people
    WHERE deleted_at IS NULL
      AND LOWER(COALESCE(first_name, '') || ' ' || COALESCE(middle_names, '') || ' ' || COALESCE(first_surname, '') || ' ' || COALESCE(second_surname, '')) LIKE :term
    UNION ALL
    SELECT id
    FROM people
    WHERE deleted_at IS NULL
      AND LOWER(identification) LIKE :term
    UNION ALL
    SELECT person_id
    FROM users
    WHERE deleted_at IS NULL
      AND LOWER(username) LIKE :term
    UNION ALL
    SELECT person_id
    FROM users
    WHERE deleted_at IS NULL
      AND LOWER(email) LIKE :term
  )
ORDER BY LOWER(COALESCE(people.first_name, '') || ' ' || COALESCE(people.middle_names, '') || ' ' || COALESCE(people.first_surname, '') || ' ' || COALESCE(people.second_surname, '')) ASC,
         people.id ASC
LIMIT 10 OFFSET 0;
