--
-- Minimal PostgreSQL seed containing only the admin user (for login)
--

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- Only seeding the users table with the admin account
COPY public.users (
    id,
    email,
    password_hash,
    first_name,
    last_name,
    role,
    job_title,
    status,
    profile_picture_url,
    refresh_token,
    created_at,
    updated_at,
    official_job_title_id
) FROM stdin;
3f37e3bf-a19a-461b-941b-dee6afc9f8d9	admin@smartskill.com	$2b$12$ogvBqiur5L0SRz71/sKpVeZLuE7rgrUIIibfYAzZvVSsFyCAhahkG	Admin	abrghaze	admin	System Administrator	active	http://localhost:5000/uploads/a4af5b04-789b-4938-ba48-064b9b6b7717-1756741835230.jpg	\N	2025-08-18 01:20:37.115822+02	2025-09-10 20:07:29.52228+02	\N
\.
