--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: add_manager_to_department(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_manager_to_department(manager_uuid uuid, dept_uuid uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$

BEGIN

  INSERT INTO department_managers (department_id, user_id)

  VALUES (dept_uuid, manager_uuid)

  ON CONFLICT (department_id, user_id) DO NOTHING;

END;

$$;


ALTER FUNCTION public.add_manager_to_department(manager_uuid uuid, dept_uuid uuid) OWNER TO postgres;

--
-- Name: add_user_to_department(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_user_to_department(user_uuid uuid, dept_uuid uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$

BEGIN

  INSERT INTO user_departments (user_id, department_id, assigned_at)

  VALUES (user_uuid, dept_uuid, NOW())

  ON CONFLICT (user_id, department_id) DO NOTHING;

END;

$$;


ALTER FUNCTION public.add_user_to_department(user_uuid uuid, dept_uuid uuid) OWNER TO postgres;

--
-- Name: add_user_to_department_if_not_exists(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.add_user_to_department_if_not_exists(user_uuid uuid, dept_uuid uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$

BEGIN

  INSERT INTO user_departments (user_id, department_id, assigned_at)

  VALUES (user_uuid, dept_uuid, NOW())

  ON CONFLICT (user_id, department_id) DO NOTHING;

END;

$$;


ALTER FUNCTION public.add_user_to_department_if_not_exists(user_uuid uuid, dept_uuid uuid) OWNER TO postgres;

--
-- Name: assign_skills_from_job_titles(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.assign_skills_from_job_titles(p_user_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$

DECLARE

    skill_record RECORD;

    current_level INTEGER;

    required_level INTEGER;

BEGIN

    -- Loop through all skill requirements for user's job titles

    FOR skill_record IN

        SELECT 

            jtsr.skill_id,

            jtsr.required_level,

            COALESCE(us.level, 0) as current_level

        FROM user_job_titles ujt

        JOIN job_title_skill_requirements jtsr ON ujt.job_title_id = jtsr.job_title_id

        LEFT JOIN user_skills us ON us.user_id = p_user_id AND us.skill_id = jtsr.skill_id

        WHERE ujt.user_id = p_user_id AND ujt.is_active = TRUE

    LOOP

        -- Use the higher level between current and required

        current_level := skill_record.current_level;

        required_level := skill_record.required_level;

        

        -- If user doesn't have this skill, or if required level is higher, assign/update it

        IF current_level = 0 OR required_level > current_level THEN

            INSERT INTO user_skills (user_id, skill_id, level, last_updated_at)

            VALUES (p_user_id, skill_record.skill_id, required_level, CURRENT_TIMESTAMP)

            ON CONFLICT (user_id, skill_id) 

            DO UPDATE SET 

                level = GREATEST(user_skills.level, required_level),

                last_updated_at = CURRENT_TIMESTAMP;

        END IF;

    END LOOP;

END;

$$;


ALTER FUNCTION public.assign_skills_from_job_titles(p_user_id uuid) OWNER TO postgres;

--
-- Name: auto_assign_job_title_on_completion(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.auto_assign_job_title_on_completion() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      DECLARE
          target_user_id UUID;
          job_title_id INTEGER;
          existing_assignment RECORD;
      BEGIN
          -- Only process if progress is 100%
          IF NEW.progress_percentage < 100.00 THEN
              RETURN NEW;
          END IF;
          
          -- Get target user and job title
          SELECT 
              CASE 
                  WHEN NEW.assignment_type = 'individual' THEN NEW.target_id
                  ELSE NULL
              END,
              NEW.job_title_id
          INTO target_user_id, job_title_id;
          
          -- Skip if it's a team objective
          IF target_user_id IS NULL THEN
              RETURN NEW;
          END IF;
          
          -- Check if user already has this job title
          SELECT id INTO existing_assignment
          FROM user_job_titles
          WHERE user_id = target_user_id 
          AND job_title_id = job_title_id 
          AND is_active = true;
          
          -- If user doesn't have this job title, assign it
          IF existing_assignment IS NULL THEN
              INSERT INTO user_job_titles (user_id, job_title_id, assigned_by, assigned_at, is_active)
              VALUES (target_user_id, job_title_id, NEW.assigned_by, CURRENT_TIMESTAMP, true);
              
              -- Update objective status to completed
              UPDATE job_title_objectives 
              SET status = 'completed'
              WHERE id = NEW.id;
          END IF;
          
          RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.auto_assign_job_title_on_completion() OWNER TO postgres;

--
-- Name: calculate_objective_progress(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.calculate_objective_progress(objective_id uuid) RETURNS numeric
    LANGUAGE plpgsql
    AS $$
      DECLARE
          total_skills INTEGER;
          met_skills INTEGER;
          progress DECIMAL(5,2);
          target_user_id UUID;
          job_title_id_val INTEGER;
      BEGIN
          -- Get the target user ID and job title ID
          SELECT
              CASE
                  WHEN jto.assignment_type = 'individual' THEN jto.target_id
                  ELSE NULL
              END,
              jto.job_title_id
          INTO target_user_id, job_title_id_val
          FROM job_title_objectives jto
          WHERE jto.id = objective_id;

          -- If it's a team objective, we can't calculate individual progress
          IF target_user_id IS NULL THEN
              RETURN 0.00;
          END IF;

          -- Count total required skills
          SELECT COUNT(*) INTO total_skills
          FROM job_title_skill_requirements jtsr
          WHERE jtsr.job_title_id = job_title_id_val;

          -- Count skills that are met
          SELECT COUNT(*) INTO met_skills
          FROM job_title_skill_requirements jtsr
          JOIN user_skills us ON jtsr.skill_id = us.skill_id
          WHERE jtsr.job_title_id = job_title_id_val
          AND us.user_id = target_user_id
          AND us.level >= jtsr.required_level;

          -- Calculate progress percentage
          IF total_skills = 0 THEN
              progress := 100.00;
          ELSE
              progress := (met_skills::DECIMAL / total_skills::DECIMAL) * 100.00;
          END IF;

          RETURN progress;
      END;
      $$;


ALTER FUNCTION public.calculate_objective_progress(objective_id uuid) OWNER TO postgres;

--
-- Name: get_current_objective_manager(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_current_objective_manager(objective_id_param uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_manager_id UUID;
    team_id_param UUID;
BEGIN
    -- First try to get team_id from objective_assignments
    SELECT oa.team_id INTO team_id_param
    FROM objective_assignments oa
    WHERE oa.objective_id = objective_id_param AND oa.assignee_type = 'TEAM'
    LIMIT 1;
    
    -- If no team assignment, try to get from objective itself
    IF team_id_param IS NULL THEN
        SELECT o.team_id INTO team_id_param
        FROM objectives o
        WHERE o.id = objective_id_param
        LIMIT 1;
    END IF;
    
    -- Get current manager for the team
    IF team_id_param IS NOT NULL THEN
        SELECT get_current_team_manager(team_id_param) INTO current_manager_id;
    END IF;
    
    RETURN current_manager_id;
END;
$$;


ALTER FUNCTION public.get_current_objective_manager(objective_id_param uuid) OWNER TO postgres;

--
-- Name: get_current_team_manager(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.get_current_team_manager(team_id_param uuid) RETURNS uuid
    LANGUAGE plpgsql
    AS $$
DECLARE
    current_manager_id UUID;
BEGIN
    SELECT manager_id INTO current_manager_id
    FROM team_management_history
    WHERE team_id = team_id_param AND is_active = TRUE
    ORDER BY assigned_at DESC
    LIMIT 1;
    
    RETURN current_manager_id;
END;
$$;


ALTER FUNCTION public.get_current_team_manager(team_id_param uuid) OWNER TO postgres;

--
-- Name: handle_department_team_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_department_team_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

  -- If a team is added to a department

  IF TG_OP = 'INSERT' THEN

    -- Sync department memberships for all users in this team

    PERFORM sync_team_department_memberships(NEW.team_id);

    RETURN NEW;

  END IF;

  

  -- If a team is removed from a department

  IF TG_OP = 'DELETE' THEN

    -- Sync department memberships for all users in this team

    PERFORM sync_team_department_memberships(OLD.team_id);

    RETURN OLD;

  END IF;

  

  RETURN NULL;

END;

$$;


ALTER FUNCTION public.handle_department_team_change() OWNER TO postgres;

--
-- Name: handle_team_manager_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_team_manager_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

  -- If team manager changed

  IF OLD.manager_user_id IS DISTINCT FROM NEW.manager_user_id THEN

    -- If old manager exists, sync their department memberships

    IF OLD.manager_user_id IS NOT NULL THEN

      PERFORM sync_user_department_memberships(OLD.manager_user_id);

    END IF;

    

    -- If new manager exists, sync their department memberships

    IF NEW.manager_user_id IS NOT NULL THEN

      PERFORM sync_user_department_memberships(NEW.manager_user_id);

    END IF;

  END IF;

  

  RETURN NEW;

END;

$$;


ALTER FUNCTION public.handle_team_manager_change() OWNER TO postgres;

--
-- Name: handle_team_member_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.handle_team_member_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

  -- If a user is added to a team

  IF TG_OP = 'INSERT' THEN

    -- Sync department memberships for the new team member

    PERFORM sync_user_department_memberships(NEW.user_id);

    RETURN NEW;

  END IF;

  

  -- If a user is removed from a team

  IF TG_OP = 'DELETE' THEN

    -- Sync department memberships for the removed team member

    PERFORM sync_user_department_memberships(OLD.user_id);

    RETURN OLD;

  END IF;

  

  -- If team membership is updated

  IF TG_OP = 'UPDATE' THEN

    -- Sync department memberships for the user

    PERFORM sync_user_department_memberships(NEW.user_id);

    RETURN NEW;

  END IF;

  

  RETURN NULL;

END;

$$;


ALTER FUNCTION public.handle_team_member_change() OWNER TO postgres;

--
-- Name: recalculate_team_progress(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.recalculate_team_progress() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      DECLARE
          parent_id UUID;
          total_progress INTEGER;
          total_targets INTEGER;
          new_team_progress INTEGER;
      BEGIN
          -- Check if this is a partial target (has parent_objective_id)
          IF NEW.parent_objective_id IS NOT NULL THEN
              parent_id := NEW.parent_objective_id;
              
              -- Calculate the sum of all partial target progress
              SELECT 
                  COALESCE(SUM(progress), 0),
                  COUNT(*)
              INTO total_progress, total_targets
              FROM objectives
              WHERE parent_objective_id = parent_id;
              
              -- Calculate the average (team progress)
              IF total_targets > 0 THEN
                  new_team_progress := ROUND(total_progress::DECIMAL / total_targets);
              ELSE
                  new_team_progress := 0;
              END IF;
              
              -- Update the parent team objective progress
              UPDATE objectives 
              SET progress = new_team_progress, updated_at = NOW()
              WHERE id = parent_id;
              
              -- Log the update
              RAISE NOTICE 'Updated team objective % progress to % (sum: %, targets: %)', 
                  parent_id, new_team_progress, total_progress, total_targets;
          END IF;
          
          RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.recalculate_team_progress() OWNER TO postgres;

--
-- Name: remove_manager_from_department(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.remove_manager_from_department(manager_uuid uuid, dept_uuid uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$

BEGIN

  DELETE FROM department_managers 

  WHERE user_id = manager_uuid AND department_id = dept_uuid;

END;

$$;


ALTER FUNCTION public.remove_manager_from_department(manager_uuid uuid, dept_uuid uuid) OWNER TO postgres;

--
-- Name: remove_skills_from_job_title(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.remove_skills_from_job_title(p_user_id uuid, p_job_title_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$

DECLARE

    skill_record RECORD;

    other_job_titles_count INTEGER;

    max_required_level INTEGER;

BEGIN

    -- For each skill in the removed job title, check if it's still required by other job titles

    FOR skill_record IN

        SELECT jtsr.skill_id, jtsr.required_level

        FROM job_title_skill_requirements jtsr

        WHERE jtsr.job_title_id = p_job_title_id

    LOOP

        -- Check if this skill is still required by other active job titles

        SELECT COUNT(*)

        INTO other_job_titles_count

        FROM user_job_titles ujt

        JOIN job_title_skill_requirements jtsr2 ON ujt.job_title_id = jtsr2.job_title_id

        WHERE ujt.user_id = p_user_id 

        AND ujt.is_active = TRUE 

        AND jtsr2.skill_id = skill_record.skill_id

        AND ujt.job_title_id != p_job_title_id;

        

        -- If no other job titles require this skill, remove it from user_skills

        IF other_job_titles_count = 0 THEN

            DELETE FROM user_skills 

            WHERE user_id = p_user_id AND skill_id = skill_record.skill_id;

        ELSE

            -- If other job titles still require this skill, update to the highest required level

            SELECT MAX(jtsr3.required_level)

            INTO max_required_level

            FROM user_job_titles ujt2

            JOIN job_title_skill_requirements jtsr3 ON ujt2.job_title_id = jtsr3.job_title_id

            WHERE ujt2.user_id = p_user_id 

            AND ujt2.is_active = TRUE 

            AND jtsr3.skill_id = skill_record.skill_id;

            

            UPDATE user_skills 

            SET level = max_required_level, last_updated_at = CURRENT_TIMESTAMP

            WHERE user_id = p_user_id AND skill_id = skill_record.skill_id;

        END IF;

    END LOOP;

END;

$$;


ALTER FUNCTION public.remove_skills_from_job_title(p_user_id uuid, p_job_title_id integer) OWNER TO postgres;

--
-- Name: remove_user_from_department(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.remove_user_from_department(user_uuid uuid, dept_uuid uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$

BEGIN

  DELETE FROM user_departments 

  WHERE user_id = user_uuid AND department_id = dept_uuid;

END;

$$;


ALTER FUNCTION public.remove_user_from_department(user_uuid uuid, dept_uuid uuid) OWNER TO postgres;

--
-- Name: remove_user_from_department_if_no_teams(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.remove_user_from_department_if_no_teams(user_uuid uuid, dept_uuid uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$

BEGIN

  -- Only remove if user has no teams in this department

  IF NOT EXISTS (

    SELECT 1 FROM team_members tm

    JOIN department_teams dt ON tm.team_id = dt.team_id

    WHERE tm.user_id = user_uuid AND dt.department_id = dept_uuid

  ) THEN

    DELETE FROM user_departments 

    WHERE user_id = user_uuid AND department_id = dept_uuid;

  END IF;

END;

$$;


ALTER FUNCTION public.remove_user_from_department_if_no_teams(user_uuid uuid, dept_uuid uuid) OWNER TO postgres;

--
-- Name: set_latest_job_title_as_official(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_latest_job_title_as_official() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    -- When a new job title is assigned to a user, make it their official job title

    IF NEW.is_active = TRUE THEN

        UPDATE users 

        SET 

            official_job_title_id = NEW.job_title_id,

            job_title = (SELECT title FROM job_titles WHERE id = NEW.job_title_id),

            updated_at = now()

        WHERE id = NEW.user_id;

    END IF;

    

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.set_latest_job_title_as_official() OWNER TO postgres;

--
-- Name: set_user_official_job_title(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_user_official_job_title(p_user_id uuid, p_job_title_id integer) RETURNS boolean
    LANGUAGE plpgsql
    AS $$

DECLARE

    job_title_exists BOOLEAN;

    user_has_job_title BOOLEAN;

BEGIN

    -- Check if the job title exists

    SELECT EXISTS(SELECT 1 FROM job_titles WHERE id = p_job_title_id) INTO job_title_exists;

    IF NOT job_title_exists THEN

        RETURN FALSE;

    END IF;

    

    -- Check if the user has this job title assigned

    SELECT EXISTS(

        SELECT 1 FROM user_job_titles 

        WHERE user_id = p_user_id AND job_title_id = p_job_title_id AND is_active = TRUE

    ) INTO user_has_job_title;

    IF NOT user_has_job_title THEN

        RETURN FALSE;

    END IF;

    

    -- Update the user's official job title

    UPDATE users 

    SET 

        official_job_title_id = p_job_title_id,

        job_title = (SELECT title FROM job_titles WHERE id = p_job_title_id),

        updated_at = now()

    WHERE id = p_user_id;

    

    RETURN TRUE;

END;

$$;


ALTER FUNCTION public.set_user_official_job_title(p_user_id uuid, p_job_title_id integer) OWNER TO postgres;

--
-- Name: sync_all_department_memberships(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_all_department_memberships() RETURNS void
    LANGUAGE plpgsql
    AS $$

DECLARE

  user_record RECORD;

BEGIN

  -- Clear all existing department memberships

  DELETE FROM user_departments;

  

  -- Re-add department memberships based on current team assignments (members and managers)

  FOR user_record IN

    SELECT DISTINCT user_id FROM (

      -- Team members

      SELECT tm.user_id

      FROM team_members tm

      

      UNION

      

      -- Team managers

      SELECT t.manager_user_id as user_id

      FROM teams t

      WHERE t.manager_user_id IS NOT NULL

    ) all_users

  LOOP

    PERFORM sync_user_department_memberships(user_record.user_id);

  END LOOP;

END;

$$;


ALTER FUNCTION public.sync_all_department_memberships() OWNER TO postgres;

--
-- Name: sync_team_department_memberships(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_team_department_memberships(team_uuid uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$

DECLARE

  user_record RECORD;

BEGIN

  -- Get all users in this team (members and manager)

  FOR user_record IN

    SELECT user_id FROM (

      -- Team members

      SELECT tm.user_id

      FROM team_members tm

      WHERE tm.team_id = team_uuid

      

      UNION

      

      -- Team manager

      SELECT t.manager_user_id as user_id

      FROM teams t

      WHERE t.id = team_uuid AND t.manager_user_id IS NOT NULL

    ) all_team_users

  LOOP

    -- Sync department memberships for each user

    PERFORM sync_user_department_memberships(user_record.user_id);

  END LOOP;

END;

$$;


ALTER FUNCTION public.sync_team_department_memberships(team_uuid uuid) OWNER TO postgres;

--
-- Name: sync_user_department_memberships(uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.sync_user_department_memberships(user_uuid uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$

DECLARE

  dept_record RECORD;

BEGIN

  -- Get all departments where user has teams (as member or manager)

  FOR dept_record IN

    SELECT DISTINCT dt.department_id

    FROM (

      -- User as team member

      SELECT tm.team_id

      FROM team_members tm

      WHERE tm.user_id = user_uuid

      

      UNION

      

      -- User as team manager

      SELECT t.id as team_id

      FROM teams t

      WHERE t.manager_user_id = user_uuid

    ) user_teams

    JOIN department_teams dt ON user_teams.team_id = dt.team_id

  LOOP

    -- Add user to department if not already a member

    PERFORM add_user_to_department_if_not_exists(user_uuid, dept_record.department_id);

  END LOOP;

  

  -- Remove user from departments where they have no teams (as member or manager)

  DELETE FROM user_departments ud

  WHERE ud.user_id = user_uuid

    AND NOT EXISTS (

      SELECT 1 FROM (

        -- User as team member

        SELECT tm.team_id

        FROM team_members tm

        WHERE tm.user_id = user_uuid

        

        UNION

        

        -- User as team manager

        SELECT t.id as team_id

        FROM teams t

        WHERE t.manager_user_id = user_uuid

      ) user_teams

      JOIN department_teams dt ON user_teams.team_id = dt.team_id

      WHERE dt.department_id = ud.department_id

    );

END;

$$;


ALTER FUNCTION public.sync_user_department_memberships(user_uuid uuid) OWNER TO postgres;

--
-- Name: trigger_assign_skills_on_job_title_add(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_assign_skills_on_job_title_add() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    -- Assign skills when a new job title is added to a user

    PERFORM assign_skills_from_job_titles(NEW.user_id);

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.trigger_assign_skills_on_job_title_add() OWNER TO postgres;

--
-- Name: trigger_remove_skills_on_job_title_remove(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_remove_skills_on_job_title_remove() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    -- Remove or update skills when a job title is removed from a user

    PERFORM remove_skills_from_job_title(OLD.user_id, OLD.job_title_id);

    RETURN OLD;

END;

$$;


ALTER FUNCTION public.trigger_remove_skills_on_job_title_remove() OWNER TO postgres;

--
-- Name: trigger_update_skills_on_job_title_deactivate(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_update_skills_on_job_title_deactivate() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                -- If job title is being deactivated, update skills but keep them (skills persist)
                IF OLD.is_active = TRUE AND NEW.is_active = FALSE THEN
                    PERFORM update_skills_on_job_title_removal(NEW.user_id, NEW.job_title_id);
                -- If job title is being reactivated, assign its skills
                ELSIF OLD.is_active = FALSE AND NEW.is_active = TRUE THEN
                    PERFORM assign_skills_from_job_titles(NEW.user_id);
                END IF;
                RETURN NEW;
            END;
            $$;


ALTER FUNCTION public.trigger_update_skills_on_job_title_deactivate() OWNER TO postgres;

--
-- Name: trigger_update_skills_on_job_title_remove(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.trigger_update_skills_on_job_title_remove() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
            BEGIN
                -- Update skills when a job title is removed from a user (skills persist)
                PERFORM update_skills_on_job_title_removal(OLD.user_id, OLD.job_title_id);
                RETURN OLD;
            END;
            $$;


ALTER FUNCTION public.trigger_update_skills_on_job_title_remove() OWNER TO postgres;

--
-- Name: update_job_title_objectives_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_job_title_objectives_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.update_job_title_objectives_updated_at() OWNER TO postgres;

--
-- Name: update_objective_progress_on_skill_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_objective_progress_on_skill_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      DECLARE
          objective_record RECORD;
      BEGIN
          -- Update progress for all job title objectives for this user
          FOR objective_record IN
              SELECT id FROM job_title_objectives 
              WHERE target_id = NEW.user_id AND status != 'completed'
          LOOP
              UPDATE job_title_objectives 
              SET progress_percentage = calculate_objective_progress(objective_record.id)
              WHERE id = objective_record.id;
          END LOOP;
          
          RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_objective_progress_on_skill_change() OWNER TO postgres;

--
-- Name: update_parent_objective_progress(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_parent_objective_progress() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
        -- Only update if this is a child objective (has parent_objective_id)
        IF NEW.parent_objective_id IS NOT NULL THEN
          -- Calculate average progress of all child objectives
          UPDATE objectives 
          SET progress = (
            SELECT COALESCE(AVG(progress), 0)::INTEGER
            FROM objectives 
            WHERE parent_objective_id = NEW.parent_objective_id
          ),
          status = CASE 
            WHEN (
              SELECT COALESCE(AVG(progress), 0)::INTEGER
              FROM objectives 
              WHERE parent_objective_id = NEW.parent_objective_id
            ) = 100 THEN 'completed'
            WHEN (
              SELECT COALESCE(AVG(progress), 0)::INTEGER
              FROM objectives 
              WHERE parent_objective_id = NEW.parent_objective_id
            ) > 0 THEN 'in_progress'
            ELSE 'not_started'
          END
          WHERE id = NEW.parent_objective_id;
        END IF;
        
        RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_parent_objective_progress() OWNER TO postgres;

--
-- Name: update_skills_on_job_title_removal(uuid, integer); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_skills_on_job_title_removal(p_user_id uuid, p_job_title_id integer) RETURNS void
    LANGUAGE plpgsql
    AS $$
            DECLARE
                skill_record RECORD;
                other_job_titles_count INTEGER;
                max_required_level INTEGER;
            BEGIN
                -- For each skill in the removed job title, check if it's still required by other job titles
                FOR skill_record IN
                    SELECT jtsr.skill_id, jtsr.required_level
                    FROM job_title_skill_requirements jtsr
                    WHERE jtsr.job_title_id = p_job_title_id
                LOOP
                    -- Check if this skill is still required by other active job titles
                    SELECT COUNT(*)
                    INTO other_job_titles_count
                    FROM user_job_titles ujt
                    JOIN job_title_skill_requirements jtsr2 ON ujt.job_title_id = jtsr2.job_title_id
                    WHERE ujt.user_id = p_user_id 
                    AND ujt.is_active = TRUE 
                    AND jtsr2.skill_id = skill_record.skill_id
                    AND ujt.job_title_id != p_job_title_id;
                    
                    -- Skills always persist - never remove them from user_skills
                    -- Only update the level if other job titles still require this skill
                    IF other_job_titles_count > 0 THEN
                        -- If other job titles still require this skill, update to the highest required level
                        SELECT MAX(jtsr3.required_level)
                        INTO max_required_level
                        FROM user_job_titles ujt2
                        JOIN job_title_skill_requirements jtsr3 ON ujt2.job_title_id = jtsr3.job_title_id
                        WHERE ujt2.user_id = p_user_id 
                        AND ujt2.is_active = TRUE 
                        AND jtsr3.skill_id = skill_record.skill_id;
                        
                        UPDATE user_skills 
                        SET level = max_required_level, last_updated_at = CURRENT_TIMESTAMP
                        WHERE user_id = p_user_id AND skill_id = skill_record.skill_id;
                    END IF;
                    -- If no other job titles require this skill, keep the current level (skills persist)
                END LOOP;
            END;
            $$;


ALTER FUNCTION public.update_skills_on_job_title_removal(p_user_id uuid, p_job_title_id integer) OWNER TO postgres;

--
-- Name: update_team_management_history(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_team_management_history() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
      BEGIN
          -- If manager_user_id changed
          IF OLD.manager_user_id IS DISTINCT FROM NEW.manager_user_id THEN
              -- Mark old manager as inactive (only if they exist and are active)
              IF OLD.manager_user_id IS NOT NULL THEN
                  UPDATE team_management_history
                  SET is_active = FALSE, removed_at = CURRENT_TIMESTAMP
                  WHERE team_id = NEW.id 
                    AND manager_id = OLD.manager_user_id 
                    AND is_active = TRUE; 
              END IF;

              -- Add new manager as active
              IF NEW.manager_user_id IS NOT NULL THEN
                  -- First, ensure any existing active entry for this manager is deactivated
                  UPDATE team_management_history
                  SET is_active = FALSE, removed_at = CURRENT_TIMESTAMP
                  WHERE team_id = NEW.id 
                    AND manager_id = NEW.manager_user_id 
                    AND is_active = TRUE;
                  
                  -- Then insert new active entry (this should work now)
                  INSERT INTO team_management_history (team_id, manager_id, assigned_at, is_active, reason)
                  VALUES (NEW.id, NEW.manager_user_id, CURRENT_TIMESTAMP, TRUE, 'Team management change');
              END IF;
          END IF;

          RETURN NEW;
      END;
      $$;


ALTER FUNCTION public.update_team_management_history() OWNER TO postgres;

--
-- Name: update_team_manager(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_team_manager(team_uuid uuid, new_manager_uuid uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
      DECLARE
        old_manager_uuid UUID;
      BEGIN
        -- Get the current manager
        SELECT manager_user_id INTO old_manager_uuid
        FROM teams
        WHERE id = team_uuid;
        
        -- If there's a current manager, deactivate their record
        IF old_manager_uuid IS NOT NULL THEN
          UPDATE team_management_history 
          SET is_active = FALSE, removed_at = NOW()
          WHERE team_id = team_uuid AND manager_id = old_manager_uuid AND is_active = TRUE;
        END IF;
        
        -- If there's a new manager, add their record
        IF new_manager_uuid IS NOT NULL THEN
          INSERT INTO team_management_history (team_id, manager_id, assigned_at, is_active)
          VALUES (team_uuid, new_manager_uuid, NOW(), TRUE);
        END IF;
        
        -- Update the team's manager_user_id
        UPDATE teams 
        SET manager_user_id = new_manager_uuid
        WHERE id = team_uuid;
      END;
      $$;


ALTER FUNCTION public.update_team_manager(team_uuid uuid, new_manager_uuid uuid) OWNER TO postgres;

--
-- Name: update_team_manager_safe(uuid, uuid); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_team_manager_safe(team_uuid uuid, new_manager_uuid uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
      DECLARE
        old_manager_uuid UUID;
      BEGIN
        -- Get the current manager
        SELECT manager_user_id INTO old_manager_uuid
        FROM teams
        WHERE id = team_uuid;
        
        -- If there's a current manager, deactivate their record
        IF old_manager_uuid IS NOT NULL THEN
          UPDATE team_management_history 
          SET is_active = FALSE, removed_at = NOW()
          WHERE team_id = team_uuid AND manager_id = old_manager_uuid AND is_active = TRUE;
        END IF;
        
        -- If there's a new manager, add their record
        IF new_manager_uuid IS NOT NULL THEN
          INSERT INTO team_management_history (team_id, manager_id, assigned_at, is_active)
          VALUES (team_uuid, new_manager_uuid, NOW(), TRUE);
        END IF;
        
        -- Update the team's manager_user_id (this will trigger the department sync)
        UPDATE teams 
        SET manager_user_id = new_manager_uuid
        WHERE id = team_uuid;
      END;
      $$;


ALTER FUNCTION public.update_team_manager_safe(team_uuid uuid, new_manager_uuid uuid) OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    actor_user_id uuid,
    action text,
    entity_type text,
    entity_id uuid,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.activity_log OWNER TO postgres;

--
-- Name: department_teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.department_teams (
    id integer NOT NULL,
    department_id uuid NOT NULL,
    team_id uuid NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.department_teams OWNER TO postgres;

--
-- Name: department_teams_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.department_teams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.department_teams_id_seq OWNER TO postgres;

--
-- Name: department_teams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.department_teams_id_seq OWNED BY public.department_teams.id;


--
-- Name: departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.departments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'active'::text,
    manager_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.departments OWNER TO postgres;

--
-- Name: files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.files (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    owner_user_id uuid,
    original_name text,
    mime_type text,
    size_bytes bigint,
    storage_key text,
    public_url text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.files OWNER TO postgres;

--
-- Name: individual_targets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.individual_targets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    objective_id uuid NOT NULL,
    user_id uuid NOT NULL,
    team_id uuid,
    custom_title character varying(255),
    custom_description text,
    custom_deadline date,
    custom_file_path character varying(500),
    progress integer DEFAULT 0,
    status character varying(50) DEFAULT 'not_started'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT individual_targets_progress_check CHECK (((progress >= 0) AND (progress <= 100))),
    CONSTRAINT individual_targets_status_check CHECK (((status)::text = ANY ((ARRAY['not_started'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'overdue'::character varying])::text[])))
);


ALTER TABLE public.individual_targets OWNER TO postgres;

--
-- Name: job_title_objectives; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_title_objectives (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_type character varying(20) NOT NULL,
    target_id uuid NOT NULL,
    job_title_id integer NOT NULL,
    assigned_by uuid NOT NULL,
    parent_objective_id uuid,
    notes text,
    status character varying(20) DEFAULT 'assigned'::character varying,
    progress_percentage numeric(5,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT job_title_objectives_assignment_type_check CHECK (((assignment_type)::text = ANY ((ARRAY['individual'::character varying, 'team'::character varying])::text[]))),
    CONSTRAINT job_title_objectives_progress_percentage_check CHECK (((progress_percentage >= (0)::numeric) AND (progress_percentage <= (100)::numeric))),
    CONSTRAINT job_title_objectives_status_check CHECK (((status)::text = ANY ((ARRAY['assigned'::character varying, 'in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying, 'ready'::character varying])::text[])))
);


ALTER TABLE public.job_title_objectives OWNER TO postgres;

--
-- Name: job_title_skill_requirements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_title_skill_requirements (
    id integer NOT NULL,
    job_title_id integer NOT NULL,
    skill_id uuid NOT NULL,
    required_level integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT job_title_skill_requirements_required_level_check CHECK (((required_level >= 1) AND (required_level <= 5)))
);


ALTER TABLE public.job_title_skill_requirements OWNER TO postgres;

--
-- Name: job_title_skill_requirements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_title_skill_requirements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_title_skill_requirements_id_seq OWNER TO postgres;

--
-- Name: job_title_skill_requirements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_title_skill_requirements_id_seq OWNED BY public.job_title_skill_requirements.id;


--
-- Name: job_title_target_progress; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_title_target_progress (
    id integer NOT NULL,
    target_id integer NOT NULL,
    skill_id uuid NOT NULL,
    required_level integer NOT NULL,
    current_level integer DEFAULT 0 NOT NULL,
    is_completed boolean DEFAULT false,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.job_title_target_progress OWNER TO postgres;

--
-- Name: job_title_target_progress_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_title_target_progress_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_title_target_progress_id_seq OWNER TO postgres;

--
-- Name: job_title_target_progress_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_title_target_progress_id_seq OWNED BY public.job_title_target_progress.id;


--
-- Name: job_title_targets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_title_targets (
    id integer NOT NULL,
    employee_id uuid NOT NULL,
    job_title_id integer NOT NULL,
    assigned_by uuid NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone,
    status character varying(50) DEFAULT 'assigned'::character varying,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT job_title_targets_status_check CHECK (((status)::text = ANY ((ARRAY['assigned'::character varying, 'in_progress'::character varying, 'completed'::character varying])::text[])))
);


ALTER TABLE public.job_title_targets OWNER TO postgres;

--
-- Name: job_title_targets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_title_targets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_title_targets_id_seq OWNER TO postgres;

--
-- Name: job_title_targets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_title_targets_id_seq OWNED BY public.job_title_targets.id;


--
-- Name: job_titles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.job_titles (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.job_titles OWNER TO postgres;

--
-- Name: job_titles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.job_titles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.job_titles_id_seq OWNER TO postgres;

--
-- Name: job_titles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.job_titles_id_seq OWNED BY public.job_titles.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    type text,
    title text,
    body text,
    entity_type text,
    entity_id uuid,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: objective_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.objective_assignments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    objective_id uuid,
    assignee_type text NOT NULL,
    user_id uuid,
    team_id uuid,
    CONSTRAINT objective_assignments_assignee_type_check CHECK ((assignee_type = ANY (ARRAY['USER'::text, 'TEAM'::text])))
);


ALTER TABLE public.objective_assignments OWNER TO postgres;

--
-- Name: objective_attachments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.objective_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    objective_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_size bigint,
    mime_type character varying(100),
    uploaded_by uuid NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now(),
    is_individual_target_file boolean DEFAULT false,
    individual_target_id uuid
);


ALTER TABLE public.objective_attachments OWNER TO postgres;

--
-- Name: objective_contributions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.objective_contributions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    parent_objective_id uuid NOT NULL,
    assignee_user_id uuid NOT NULL,
    task_description text NOT NULL,
    status text DEFAULT 'not_started'::text,
    progress integer DEFAULT 0,
    notes text,
    deadline date,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    individual_description text,
    individual_file text,
    CONSTRAINT objective_contributions_progress_check CHECK (((progress >= 0) AND (progress <= 100))),
    CONSTRAINT objective_contributions_status_check CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text, 'overdue'::text])))
);


ALTER TABLE public.objective_contributions OWNER TO postgres;

--
-- Name: TABLE objective_contributions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.objective_contributions IS 'Individual contributions/tasks for team-level objectives';


--
-- Name: COLUMN objective_contributions.parent_objective_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.objective_contributions.parent_objective_id IS 'Reference to the parent team objective';


--
-- Name: COLUMN objective_contributions.assignee_user_id; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.objective_contributions.assignee_user_id IS 'User assigned to this specific contribution';


--
-- Name: COLUMN objective_contributions.task_description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.objective_contributions.task_description IS 'Description of the specific task/contribution';


--
-- Name: COLUMN objective_contributions.progress; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.objective_contributions.progress IS 'Progress percentage (0-100) for this contribution';


--
-- Name: COLUMN objective_contributions.individual_description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.objective_contributions.individual_description IS 'Individual description specific to this team member';


--
-- Name: COLUMN objective_contributions.individual_file; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.objective_contributions.individual_file IS 'Individual file attachment specific to this team member';


--
-- Name: objective_updates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.objective_updates (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    objective_id uuid,
    author_user_id uuid,
    progress integer,
    notes text,
    proof_file_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    status text DEFAULT 'pending'::text,
    CONSTRAINT objective_updates_progress_check CHECK (((progress >= 0) AND (progress <= 100))),
    CONSTRAINT objective_updates_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


ALTER TABLE public.objective_updates OWNER TO postgres;

--
-- Name: objectives; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.objectives (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title text NOT NULL,
    description text,
    category text NOT NULL,
    skill_id uuid,
    target_level integer,
    deadline date,
    progress integer DEFAULT 0,
    status text DEFAULT 'not_started'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    objective_type text DEFAULT 'individual'::text,
    parent_objective_id uuid,
    CONSTRAINT objectives_category_check CHECK ((category = ANY (ARRAY['personal_improvement'::text, 'company_project'::text, 'training'::text, 'certification'::text]))),
    CONSTRAINT objectives_objective_type_check CHECK ((objective_type = ANY (ARRAY['individual'::text, 'team'::text]))),
    CONSTRAINT objectives_status_check CHECK ((status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text, 'overdue'::text])))
);


ALTER TABLE public.objectives OWNER TO postgres;

--
-- Name: progress_update_request_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.progress_update_request_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    request_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path character varying(500) NOT NULL,
    file_size bigint NOT NULL,
    mime_type character varying(100),
    uploaded_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.progress_update_request_files OWNER TO postgres;

--
-- Name: progress_update_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.progress_update_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    objective_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    manager_id uuid NOT NULL,
    requested_progress integer NOT NULL,
    current_progress integer NOT NULL,
    description text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    manager_comment text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    reviewed_at timestamp with time zone,
    CONSTRAINT progress_update_requests_current_progress_check CHECK (((current_progress >= 0) AND (current_progress <= 100))),
    CONSTRAINT progress_update_requests_requested_progress_check CHECK (((requested_progress >= 0) AND (requested_progress <= 100))),
    CONSTRAINT progress_update_requests_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


ALTER TABLE public.progress_update_requests OWNER TO postgres;

--
-- Name: skill_requests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skill_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    requester_user_id uuid,
    type text NOT NULL,
    skill_id uuid,
    requested_skill_name text,
    current_level integer,
    target_level integer,
    reason text,
    status text NOT NULL,
    manager_id uuid,
    admin_id uuid,
    manager_comment text,
    admin_comment text,
    certificate_file_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    seen_by_user boolean DEFAULT false,
    is_dismissed boolean DEFAULT false NOT NULL,
    finalized_at timestamp with time zone,
    granted_level integer,
    user_id uuid,
    requested_level integer,
    CONSTRAINT skill_requests_status_check CHECK ((status = ANY (ARRAY['pending_manager'::text, 'pending_admin'::text, 'approved'::text, 'rejected'::text]))),
    CONSTRAINT skill_requests_type_check CHECK ((type = ANY (ARRAY['add_existing'::text, 'upgrade'::text, 'create_new'::text])))
);


ALTER TABLE public.skill_requests OWNER TO postgres;

--
-- Name: skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skills (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    category text,
    description text,
    max_level integer DEFAULT 5,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT skills_type_check CHECK ((type = ANY (ARRAY['hard'::text, 'soft'::text])))
);


ALTER TABLE public.skills OWNER TO postgres;

--
-- Name: team_management_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_management_history (
    id integer NOT NULL,
    team_id uuid NOT NULL,
    manager_id uuid NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    removed_at timestamp without time zone,
    is_active boolean DEFAULT true,
    assigned_by uuid,
    reason text
);


ALTER TABLE public.team_management_history OWNER TO postgres;

--
-- Name: team_management_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.team_management_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.team_management_history_id_seq OWNER TO postgres;

--
-- Name: team_management_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.team_management_history_id_seq OWNED BY public.team_management_history.id;


--
-- Name: team_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_members (
    team_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role_in_team text,
    joined_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.team_members OWNER TO postgres;

--
-- Name: teams; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teams (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    description text,
    manager_user_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.teams OWNER TO postgres;

--
-- Name: user_departments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_departments (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    department_id uuid NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    joined_at timestamp with time zone DEFAULT now(),
    role_in_department text DEFAULT 'member'::text
);


ALTER TABLE public.user_departments OWNER TO postgres;

--
-- Name: TABLE user_departments; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE public.user_departments IS 'Junction table for many-to-many relationship between users and departments';


--
-- Name: COLUMN user_departments.joined_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.user_departments.joined_at IS 'When the user joined this department';


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    first_name text NOT NULL,
    last_name text NOT NULL,
    role text NOT NULL,
    job_title text,
    status text DEFAULT 'active'::text,
    profile_picture_url text,
    refresh_token text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    official_job_title_id integer,
    CONSTRAINT users_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'manager'::text, 'employee'::text])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: user_department_view; Type: VIEW; Schema: public; Owner: postgres
--

CREATE VIEW public.user_department_view AS
 SELECT u.id AS user_id,
    u.first_name,
    u.last_name,
    u.email,
    u.role,
    d.id AS department_id,
    d.name AS department_name,
    ud.assigned_at AS joined_at
   FROM ((public.users u
     JOIN public.user_departments ud ON ((u.id = ud.user_id)))
     JOIN public.departments d ON ((ud.department_id = d.id)))
  WHERE (u.status = 'active'::text);


ALTER VIEW public.user_department_view OWNER TO postgres;

--
-- Name: user_departments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_departments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_departments_id_seq OWNER TO postgres;

--
-- Name: user_departments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_departments_id_seq OWNED BY public.user_departments.id;


--
-- Name: user_job_titles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_job_titles (
    id integer NOT NULL,
    user_id uuid NOT NULL,
    job_title_id integer NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    assigned_by uuid,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.user_job_titles OWNER TO postgres;

--
-- Name: user_job_titles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_job_titles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_job_titles_id_seq OWNER TO postgres;

--
-- Name: user_job_titles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_job_titles_id_seq OWNED BY public.user_job_titles.id;


--
-- Name: user_skill_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_skill_history (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    skill_id uuid,
    from_level integer,
    to_level integer,
    reason text,
    approved_by uuid,
    approved_at timestamp with time zone,
    attachment_file_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_skill_history OWNER TO postgres;

--
-- Name: user_skills; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_skills (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    skill_id uuid,
    level integer NOT NULL,
    last_updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT user_skills_level_check CHECK (((level >= 1) AND (level <= 5)))
);


ALTER TABLE public.user_skills OWNER TO postgres;

--
-- Name: department_teams id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_teams ALTER COLUMN id SET DEFAULT nextval('public.department_teams_id_seq'::regclass);


--
-- Name: job_title_skill_requirements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_skill_requirements ALTER COLUMN id SET DEFAULT nextval('public.job_title_skill_requirements_id_seq'::regclass);


--
-- Name: job_title_target_progress id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_target_progress ALTER COLUMN id SET DEFAULT nextval('public.job_title_target_progress_id_seq'::regclass);


--
-- Name: job_title_targets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_targets ALTER COLUMN id SET DEFAULT nextval('public.job_title_targets_id_seq'::regclass);


--
-- Name: job_titles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_titles ALTER COLUMN id SET DEFAULT nextval('public.job_titles_id_seq'::regclass);


--
-- Name: team_management_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_management_history ALTER COLUMN id SET DEFAULT nextval('public.team_management_history_id_seq'::regclass);


--
-- Name: user_departments id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_departments ALTER COLUMN id SET DEFAULT nextval('public.user_departments_id_seq'::regclass);


--
-- Name: user_job_titles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_job_titles ALTER COLUMN id SET DEFAULT nextval('public.user_job_titles_id_seq'::regclass);


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: department_teams department_teams_department_id_team_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_teams
    ADD CONSTRAINT department_teams_department_id_team_id_key UNIQUE (department_id, team_id);


--
-- Name: department_teams department_teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_teams
    ADD CONSTRAINT department_teams_pkey PRIMARY KEY (id);


--
-- Name: departments departments_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_name_key UNIQUE (name);


--
-- Name: departments departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_pkey PRIMARY KEY (id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: individual_targets individual_targets_objective_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.individual_targets
    ADD CONSTRAINT individual_targets_objective_id_user_id_key UNIQUE (objective_id, user_id);


--
-- Name: individual_targets individual_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.individual_targets
    ADD CONSTRAINT individual_targets_pkey PRIMARY KEY (id);


--
-- Name: job_title_objectives job_title_objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_objectives
    ADD CONSTRAINT job_title_objectives_pkey PRIMARY KEY (id);


--
-- Name: job_title_skill_requirements job_title_skill_requirements_job_title_id_skill_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_skill_requirements
    ADD CONSTRAINT job_title_skill_requirements_job_title_id_skill_id_key UNIQUE (job_title_id, skill_id);


--
-- Name: job_title_skill_requirements job_title_skill_requirements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_skill_requirements
    ADD CONSTRAINT job_title_skill_requirements_pkey PRIMARY KEY (id);


--
-- Name: job_title_target_progress job_title_target_progress_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_target_progress
    ADD CONSTRAINT job_title_target_progress_pkey PRIMARY KEY (id);


--
-- Name: job_title_target_progress job_title_target_progress_target_id_skill_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_target_progress
    ADD CONSTRAINT job_title_target_progress_target_id_skill_id_key UNIQUE (target_id, skill_id);


--
-- Name: job_title_targets job_title_targets_employee_id_job_title_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_targets
    ADD CONSTRAINT job_title_targets_employee_id_job_title_id_key UNIQUE (employee_id, job_title_id);


--
-- Name: job_title_targets job_title_targets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_targets
    ADD CONSTRAINT job_title_targets_pkey PRIMARY KEY (id);


--
-- Name: job_titles job_titles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_titles
    ADD CONSTRAINT job_titles_pkey PRIMARY KEY (id);


--
-- Name: job_titles job_titles_title_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_titles
    ADD CONSTRAINT job_titles_title_key UNIQUE (title);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: objective_assignments objective_assignments_objective_id_assignee_type_user_id_te_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_assignments
    ADD CONSTRAINT objective_assignments_objective_id_assignee_type_user_id_te_key UNIQUE (objective_id, assignee_type, user_id, team_id);


--
-- Name: objective_assignments objective_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_assignments
    ADD CONSTRAINT objective_assignments_pkey PRIMARY KEY (id);


--
-- Name: objective_attachments objective_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_attachments
    ADD CONSTRAINT objective_attachments_pkey PRIMARY KEY (id);


--
-- Name: objective_contributions objective_contributions_parent_objective_id_assignee_user_i_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_contributions
    ADD CONSTRAINT objective_contributions_parent_objective_id_assignee_user_i_key UNIQUE (parent_objective_id, assignee_user_id, task_description);


--
-- Name: objective_contributions objective_contributions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_contributions
    ADD CONSTRAINT objective_contributions_pkey PRIMARY KEY (id);


--
-- Name: objective_contributions objective_contributions_unique_contribution; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_contributions
    ADD CONSTRAINT objective_contributions_unique_contribution UNIQUE (parent_objective_id, assignee_user_id, task_description, individual_description, individual_file);


--
-- Name: CONSTRAINT objective_contributions_unique_contribution ON objective_contributions; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON CONSTRAINT objective_contributions_unique_contribution ON public.objective_contributions IS 'Prevents exact duplicate contributions but allows multiple contributions per user per objective';


--
-- Name: objective_updates objective_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_updates
    ADD CONSTRAINT objective_updates_pkey PRIMARY KEY (id);


--
-- Name: objectives objectives_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT objectives_pkey PRIMARY KEY (id);


--
-- Name: progress_update_request_files progress_update_request_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_update_request_files
    ADD CONSTRAINT progress_update_request_files_pkey PRIMARY KEY (id);


--
-- Name: progress_update_requests progress_update_requests_objective_id_employee_id_status_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_update_requests
    ADD CONSTRAINT progress_update_requests_objective_id_employee_id_status_key UNIQUE (objective_id, employee_id, status);


--
-- Name: progress_update_requests progress_update_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_update_requests
    ADD CONSTRAINT progress_update_requests_pkey PRIMARY KEY (id);


--
-- Name: skill_requests skill_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_requests
    ADD CONSTRAINT skill_requests_pkey PRIMARY KEY (id);


--
-- Name: skills skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skills
    ADD CONSTRAINT skills_pkey PRIMARY KEY (id);


--
-- Name: team_management_history team_management_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_management_history
    ADD CONSTRAINT team_management_history_pkey PRIMARY KEY (id);


--
-- Name: team_management_history team_management_history_team_id_manager_id_is_active_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_management_history
    ADD CONSTRAINT team_management_history_team_id_manager_id_is_active_key UNIQUE (team_id, manager_id, is_active);


--
-- Name: team_members team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_pkey PRIMARY KEY (team_id, user_id);


--
-- Name: teams teams_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_name_key UNIQUE (name);


--
-- Name: teams teams_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_pkey PRIMARY KEY (id);


--
-- Name: user_departments user_departments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_departments
    ADD CONSTRAINT user_departments_pkey PRIMARY KEY (id);


--
-- Name: user_departments user_departments_user_id_department_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_departments
    ADD CONSTRAINT user_departments_user_id_department_id_key UNIQUE (user_id, department_id);


--
-- Name: user_job_titles user_job_titles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_job_titles
    ADD CONSTRAINT user_job_titles_pkey PRIMARY KEY (id);


--
-- Name: user_job_titles user_job_titles_user_id_job_title_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_job_titles
    ADD CONSTRAINT user_job_titles_user_id_job_title_id_key UNIQUE (user_id, job_title_id);


--
-- Name: user_skill_history user_skill_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_skill_history
    ADD CONSTRAINT user_skill_history_pkey PRIMARY KEY (id);


--
-- Name: user_skills user_skills_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_pkey PRIMARY KEY (id);


--
-- Name: user_skills user_skills_user_id_skill_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_user_id_skill_id_key UNIQUE (user_id, skill_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_log_actor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_log_actor ON public.activity_log USING btree (actor_user_id);


--
-- Name: idx_activity_log_entity; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_activity_log_entity ON public.activity_log USING btree (entity_type, entity_id);


--
-- Name: idx_department_teams_department_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_department_teams_department_id ON public.department_teams USING btree (department_id);


--
-- Name: idx_department_teams_team_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_department_teams_team_id ON public.department_teams USING btree (team_id);


--
-- Name: idx_departments_manager_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_departments_manager_user_id ON public.departments USING btree (manager_user_id);


--
-- Name: idx_individual_targets_objective_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_individual_targets_objective_id ON public.individual_targets USING btree (objective_id);


--
-- Name: idx_individual_targets_team_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_individual_targets_team_id ON public.individual_targets USING btree (team_id);


--
-- Name: idx_individual_targets_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_individual_targets_user_id ON public.individual_targets USING btree (user_id);


--
-- Name: idx_job_title_objectives_assigned_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_title_objectives_assigned_by ON public.job_title_objectives USING btree (assigned_by);


--
-- Name: idx_job_title_objectives_assignment_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_title_objectives_assignment_type ON public.job_title_objectives USING btree (assignment_type);


--
-- Name: idx_job_title_objectives_job_title_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_title_objectives_job_title_id ON public.job_title_objectives USING btree (job_title_id);


--
-- Name: idx_job_title_objectives_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_title_objectives_status ON public.job_title_objectives USING btree (status);


--
-- Name: idx_job_title_objectives_target_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_title_objectives_target_id ON public.job_title_objectives USING btree (target_id);


--
-- Name: idx_job_title_skill_requirements_job_title_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_title_skill_requirements_job_title_id ON public.job_title_skill_requirements USING btree (job_title_id);


--
-- Name: idx_job_title_skill_requirements_skill_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_title_skill_requirements_skill_id ON public.job_title_skill_requirements USING btree (skill_id);


--
-- Name: idx_job_title_target_progress_skill_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_title_target_progress_skill_id ON public.job_title_target_progress USING btree (skill_id);


--
-- Name: idx_job_title_target_progress_target_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_title_target_progress_target_id ON public.job_title_target_progress USING btree (target_id);


--
-- Name: idx_job_title_targets_assigned_by; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_title_targets_assigned_by ON public.job_title_targets USING btree (assigned_by);


--
-- Name: idx_job_title_targets_employee_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_title_targets_employee_id ON public.job_title_targets USING btree (employee_id);


--
-- Name: idx_job_title_targets_job_title_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_job_title_targets_job_title_id ON public.job_title_targets USING btree (job_title_id);


--
-- Name: idx_notifications_user_read; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_notifications_user_read ON public.notifications USING btree (user_id, read_at);


--
-- Name: idx_objective_attachments_individual_target_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_objective_attachments_individual_target_id ON public.objective_attachments USING btree (individual_target_id);


--
-- Name: idx_objective_attachments_objective_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_objective_attachments_objective_id ON public.objective_attachments USING btree (objective_id);


--
-- Name: idx_objective_contributions_assignee; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_objective_contributions_assignee ON public.objective_contributions USING btree (assignee_user_id);


--
-- Name: idx_objective_contributions_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_objective_contributions_parent ON public.objective_contributions USING btree (parent_objective_id);


--
-- Name: idx_objective_contributions_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_objective_contributions_status ON public.objective_contributions USING btree (status);


--
-- Name: idx_objective_updates_author; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_objective_updates_author ON public.objective_updates USING btree (author_user_id, status);


--
-- Name: idx_objective_updates_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_objective_updates_status ON public.objective_updates USING btree (status);


--
-- Name: idx_objectives_parent_objective_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_objectives_parent_objective_id ON public.objectives USING btree (parent_objective_id);


--
-- Name: idx_objectives_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_objectives_status ON public.objectives USING btree (status);


--
-- Name: idx_progress_request_files_request_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_progress_request_files_request_id ON public.progress_update_request_files USING btree (request_id);


--
-- Name: idx_progress_requests_employee_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_progress_requests_employee_id ON public.progress_update_requests USING btree (employee_id);


--
-- Name: idx_progress_requests_manager_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_progress_requests_manager_id ON public.progress_update_requests USING btree (manager_id);


--
-- Name: idx_progress_requests_objective_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_progress_requests_objective_id ON public.progress_update_requests USING btree (objective_id);


--
-- Name: idx_progress_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_progress_requests_status ON public.progress_update_requests USING btree (status);


--
-- Name: idx_skill_requests_finalized_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_skill_requests_finalized_at ON public.skill_requests USING btree (finalized_at);


--
-- Name: idx_skill_requests_finalized_status_time; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_skill_requests_finalized_status_time ON public.skill_requests USING btree (finalized_at, status) WHERE (finalized_at IS NOT NULL);


--
-- Name: idx_skill_requests_granted_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_skill_requests_granted_level ON public.skill_requests USING btree (granted_level);


--
-- Name: idx_skill_requests_is_dismissed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_skill_requests_is_dismissed ON public.skill_requests USING btree (is_dismissed);


--
-- Name: idx_skill_requests_requester_dismissed; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_skill_requests_requester_dismissed ON public.skill_requests USING btree (requester_user_id, is_dismissed);


--
-- Name: idx_skill_requests_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_skill_requests_status ON public.skill_requests USING btree (status);


--
-- Name: idx_team_management_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_management_active ON public.team_management_history USING btree (team_id, is_active);


--
-- Name: idx_team_management_manager; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_management_manager ON public.team_management_history USING btree (manager_id, is_active);


--
-- Name: idx_user_departments_department_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_departments_department_id ON public.user_departments USING btree (department_id);


--
-- Name: idx_user_departments_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_departments_user_id ON public.user_departments USING btree (user_id);


--
-- Name: idx_user_job_titles_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_job_titles_active ON public.user_job_titles USING btree (is_active);


--
-- Name: idx_user_job_titles_job_title_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_job_titles_job_title_id ON public.user_job_titles USING btree (job_title_id);


--
-- Name: idx_user_job_titles_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_job_titles_user_id ON public.user_job_titles USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: uniq_skill_name_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uniq_skill_name_type ON public.skills USING btree (name, type);


--
-- Name: user_job_titles trigger_assign_skills_on_job_title_add; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_assign_skills_on_job_title_add AFTER INSERT ON public.user_job_titles FOR EACH ROW EXECUTE FUNCTION public.trigger_assign_skills_on_job_title_add();


--
-- Name: department_teams trigger_department_team_sync; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_department_team_sync AFTER INSERT OR DELETE ON public.department_teams FOR EACH ROW EXECUTE FUNCTION public.handle_department_team_change();


--
-- Name: objectives trigger_recalculate_team_progress; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_recalculate_team_progress AFTER UPDATE OF progress ON public.objectives FOR EACH ROW EXECUTE FUNCTION public.recalculate_team_progress();


--
-- Name: user_job_titles trigger_set_official_job_title; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_set_official_job_title AFTER INSERT OR UPDATE ON public.user_job_titles FOR EACH ROW EXECUTE FUNCTION public.set_latest_job_title_as_official();


--
-- Name: teams trigger_team_management_history; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_team_management_history AFTER UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_team_management_history();

ALTER TABLE public.teams DISABLE TRIGGER trigger_team_management_history;


--
-- Name: teams trigger_team_manager_department_sync; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_team_manager_department_sync AFTER UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.handle_team_manager_change();


--
-- Name: team_members trigger_team_member_department_sync; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_team_member_department_sync AFTER INSERT OR DELETE OR UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.handle_team_member_change();


--
-- Name: job_title_objectives trigger_update_job_title_objectives_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_job_title_objectives_updated_at BEFORE UPDATE ON public.job_title_objectives FOR EACH ROW EXECUTE FUNCTION public.update_job_title_objectives_updated_at();


--
-- Name: user_skills trigger_update_objective_progress_on_skill_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_objective_progress_on_skill_change AFTER INSERT OR UPDATE ON public.user_skills FOR EACH ROW EXECUTE FUNCTION public.update_objective_progress_on_skill_change();


--
-- Name: objective_contributions trigger_update_parent_objective_progress; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_parent_objective_progress AFTER INSERT OR DELETE OR UPDATE ON public.objective_contributions FOR EACH ROW EXECUTE FUNCTION public.update_parent_objective_progress();


--
-- Name: objectives trigger_update_parent_objective_progress; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_parent_objective_progress AFTER UPDATE OF progress ON public.objectives FOR EACH ROW EXECUTE FUNCTION public.update_parent_objective_progress();


--
-- Name: user_job_titles trigger_update_skills_on_job_title_deactivate; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_skills_on_job_title_deactivate AFTER UPDATE ON public.user_job_titles FOR EACH ROW EXECUTE FUNCTION public.trigger_update_skills_on_job_title_deactivate();


--
-- Name: user_job_titles trigger_update_skills_on_job_title_remove; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_update_skills_on_job_title_remove AFTER DELETE ON public.user_job_titles FOR EACH ROW EXECUTE FUNCTION public.trigger_update_skills_on_job_title_remove();


--
-- Name: departments update_departments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_departments_updated_at BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: individual_targets update_individual_targets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_individual_targets_updated_at BEFORE UPDATE ON public.individual_targets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: job_title_skill_requirements update_job_title_skill_requirements_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_job_title_skill_requirements_updated_at BEFORE UPDATE ON public.job_title_skill_requirements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: job_title_target_progress update_job_title_target_progress_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_job_title_target_progress_updated_at BEFORE UPDATE ON public.job_title_target_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: job_title_targets update_job_title_targets_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_job_title_targets_updated_at BEFORE UPDATE ON public.job_title_targets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: job_titles update_job_titles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_job_titles_updated_at BEFORE UPDATE ON public.job_titles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: objectives update_objectives_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_objectives_updated_at BEFORE UPDATE ON public.objectives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: skill_requests update_skill_requests_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_skill_requests_updated_at BEFORE UPDATE ON public.skill_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: teams update_teams_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_job_titles update_user_job_titles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_user_job_titles_updated_at BEFORE UPDATE ON public.user_job_titles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_log activity_log_actor_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id);


--
-- Name: department_teams department_teams_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_teams
    ADD CONSTRAINT department_teams_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: department_teams department_teams_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.department_teams
    ADD CONSTRAINT department_teams_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: departments departments_manager_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT departments_manager_user_id_fkey FOREIGN KEY (manager_user_id) REFERENCES public.users(id);


--
-- Name: files files_owner_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_owner_user_id_fkey FOREIGN KEY (owner_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: departments fk_departments_manager_user_id; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.departments
    ADD CONSTRAINT fk_departments_manager_user_id FOREIGN KEY (manager_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: individual_targets individual_targets_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.individual_targets
    ADD CONSTRAINT individual_targets_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: individual_targets individual_targets_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.individual_targets
    ADD CONSTRAINT individual_targets_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: individual_targets individual_targets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.individual_targets
    ADD CONSTRAINT individual_targets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: job_title_objectives job_title_objectives_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_objectives
    ADD CONSTRAINT job_title_objectives_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: job_title_objectives job_title_objectives_job_title_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_objectives
    ADD CONSTRAINT job_title_objectives_job_title_id_fkey FOREIGN KEY (job_title_id) REFERENCES public.job_titles(id) ON DELETE CASCADE;


--
-- Name: job_title_objectives job_title_objectives_parent_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_objectives
    ADD CONSTRAINT job_title_objectives_parent_objective_id_fkey FOREIGN KEY (parent_objective_id) REFERENCES public.job_title_objectives(id) ON DELETE CASCADE;


--
-- Name: job_title_skill_requirements job_title_skill_requirements_job_title_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_skill_requirements
    ADD CONSTRAINT job_title_skill_requirements_job_title_id_fkey FOREIGN KEY (job_title_id) REFERENCES public.job_titles(id) ON DELETE CASCADE;


--
-- Name: job_title_skill_requirements job_title_skill_requirements_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_skill_requirements
    ADD CONSTRAINT job_title_skill_requirements_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: job_title_target_progress job_title_target_progress_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_target_progress
    ADD CONSTRAINT job_title_target_progress_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: job_title_target_progress job_title_target_progress_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_target_progress
    ADD CONSTRAINT job_title_target_progress_target_id_fkey FOREIGN KEY (target_id) REFERENCES public.job_title_targets(id) ON DELETE CASCADE;


--
-- Name: job_title_targets job_title_targets_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_targets
    ADD CONSTRAINT job_title_targets_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: job_title_targets job_title_targets_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_targets
    ADD CONSTRAINT job_title_targets_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: job_title_targets job_title_targets_job_title_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.job_title_targets
    ADD CONSTRAINT job_title_targets_job_title_id_fkey FOREIGN KEY (job_title_id) REFERENCES public.job_titles(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: objective_assignments objective_assignments_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_assignments
    ADD CONSTRAINT objective_assignments_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: objective_assignments objective_assignments_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_assignments
    ADD CONSTRAINT objective_assignments_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id);


--
-- Name: objective_assignments objective_assignments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_assignments
    ADD CONSTRAINT objective_assignments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: objective_attachments objective_attachments_individual_target_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_attachments
    ADD CONSTRAINT objective_attachments_individual_target_id_fkey FOREIGN KEY (individual_target_id) REFERENCES public.individual_targets(id) ON DELETE CASCADE;


--
-- Name: objective_attachments objective_attachments_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_attachments
    ADD CONSTRAINT objective_attachments_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: objective_attachments objective_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_attachments
    ADD CONSTRAINT objective_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: objective_contributions objective_contributions_assignee_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_contributions
    ADD CONSTRAINT objective_contributions_assignee_user_id_fkey FOREIGN KEY (assignee_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: objective_contributions objective_contributions_parent_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_contributions
    ADD CONSTRAINT objective_contributions_parent_objective_id_fkey FOREIGN KEY (parent_objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: objective_updates objective_updates_author_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_updates
    ADD CONSTRAINT objective_updates_author_user_id_fkey FOREIGN KEY (author_user_id) REFERENCES public.users(id);


--
-- Name: objective_updates objective_updates_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objective_updates
    ADD CONSTRAINT objective_updates_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: objectives objectives_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT objectives_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: objectives objectives_parent_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT objectives_parent_objective_id_fkey FOREIGN KEY (parent_objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: objectives objectives_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.objectives
    ADD CONSTRAINT objectives_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id);


--
-- Name: progress_update_request_files progress_update_request_files_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_update_request_files
    ADD CONSTRAINT progress_update_request_files_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.progress_update_requests(id) ON DELETE CASCADE;


--
-- Name: progress_update_requests progress_update_requests_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_update_requests
    ADD CONSTRAINT progress_update_requests_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: progress_update_requests progress_update_requests_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_update_requests
    ADD CONSTRAINT progress_update_requests_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: progress_update_requests progress_update_requests_objective_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.progress_update_requests
    ADD CONSTRAINT progress_update_requests_objective_id_fkey FOREIGN KEY (objective_id) REFERENCES public.objectives(id) ON DELETE CASCADE;


--
-- Name: skill_requests skill_requests_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_requests
    ADD CONSTRAINT skill_requests_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.users(id);


--
-- Name: skill_requests skill_requests_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_requests
    ADD CONSTRAINT skill_requests_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id);


--
-- Name: skill_requests skill_requests_requester_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_requests
    ADD CONSTRAINT skill_requests_requester_user_id_fkey FOREIGN KEY (requester_user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: skill_requests skill_requests_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_requests
    ADD CONSTRAINT skill_requests_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id);


--
-- Name: skill_requests skill_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_requests
    ADD CONSTRAINT skill_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: team_management_history team_management_history_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_management_history
    ADD CONSTRAINT team_management_history_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: team_management_history team_management_history_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_management_history
    ADD CONSTRAINT team_management_history_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: team_management_history team_management_history_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_management_history
    ADD CONSTRAINT team_management_history_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_team_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE;


--
-- Name: team_members team_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_members
    ADD CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: teams teams_manager_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teams
    ADD CONSTRAINT teams_manager_user_id_fkey FOREIGN KEY (manager_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_departments user_departments_department_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_departments
    ADD CONSTRAINT user_departments_department_id_fkey FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE CASCADE;


--
-- Name: user_departments user_departments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_departments
    ADD CONSTRAINT user_departments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_job_titles user_job_titles_assigned_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_job_titles
    ADD CONSTRAINT user_job_titles_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES public.users(id);


--
-- Name: user_job_titles user_job_titles_job_title_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_job_titles
    ADD CONSTRAINT user_job_titles_job_title_id_fkey FOREIGN KEY (job_title_id) REFERENCES public.job_titles(id) ON DELETE CASCADE;


--
-- Name: user_job_titles user_job_titles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_job_titles
    ADD CONSTRAINT user_job_titles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_skill_history user_skill_history_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_skill_history
    ADD CONSTRAINT user_skill_history_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: user_skill_history user_skill_history_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_skill_history
    ADD CONSTRAINT user_skill_history_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: user_skill_history user_skill_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_skill_history
    ADD CONSTRAINT user_skill_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_skills user_skills_skill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_skill_id_fkey FOREIGN KEY (skill_id) REFERENCES public.skills(id) ON DELETE CASCADE;


--
-- Name: user_skills user_skills_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_skills
    ADD CONSTRAINT user_skills_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_official_job_title_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_official_job_title_id_fkey FOREIGN KEY (official_job_title_id) REFERENCES public.job_titles(id) ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

