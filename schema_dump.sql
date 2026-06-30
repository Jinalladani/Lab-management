--
-- PostgreSQL database dump
--

\restrict 9crKevkgRTFbBbRM9bIYWEd7Ia6v0mjuO7VEOuSORxU0Cgdx4kWM4u3KddxtGmx

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

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
-- Name: assign_default_tests_to_sample_entry(bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.assign_default_tests_to_sample_entry(p_sample_entry_id bigint) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_sample_type_id BIGINT;
    v_lab_id BIGINT;
    v_count INTEGER := 0;
BEGIN
    SELECT sample_type_id, lab_id
    INTO v_sample_type_id, v_lab_id
    FROM sample_entries
    WHERE sample_entry_id = p_sample_entry_id;

    INSERT INTO sample_entry_tests (
        sample_entry_id,
        test_name,
        testing_day_id,
        testing_days,
        expected_test_date,
        status
    )
    SELECT
        p_sample_entry_id,
        stt.test_name,
        stt.default_testing_day_id,
        COALESCE(stt.default_day_value, td.day_value),
        CASE
            WHEN COALESCE(stt.default_day_value, td.day_value) IS NOT NULL
            THEN CURRENT_DATE + COALESCE(stt.default_day_value, td.day_value)
            ELSE NULL
        END,
        'pending'
    FROM sample_type_tests stt
    LEFT JOIN testing_days td
      ON td.testing_day_id = stt.default_testing_day_id
    WHERE stt.sample_type_id = v_sample_type_id
      AND stt.lab_id = v_lab_id
      AND stt.status = 'active';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;


ALTER FUNCTION public.assign_default_tests_to_sample_entry(p_sample_entry_id bigint) OWNER TO postgres;

--
-- Name: audit_sample_entries_changes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.audit_sample_entries_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO sample_entries_audit (sample_entry_id, action_type, new_data, action_by)
        VALUES (NEW.sample_entry_id, 'INSERT', to_jsonb(NEW), NEW.created_by);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO sample_entries_audit (sample_entry_id, action_type, old_data, new_data, action_by)
        VALUES (NEW.sample_entry_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), NEW.updated_by);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO sample_entries_audit (sample_entry_id, action_type, old_data, action_by)
        VALUES (OLD.sample_entry_id, 'DELETE', to_jsonb(OLD), OLD.updated_by);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.audit_sample_entries_changes() OWNER TO postgres;

--
-- Name: generate_sample_code(bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_sample_code(p_project_id bigint) RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_project_code VARCHAR(100);
    v_next_no INTEGER;
BEGIN
    SELECT project_code
    INTO v_project_code
    FROM projects
    WHERE project_id = p_project_id;

    IF v_project_code IS NULL THEN
        RAISE EXCEPTION 'Invalid project_id: %', p_project_id;
    END IF;

    SELECT COUNT(*) + 1
    INTO v_next_no
    FROM samples
    WHERE project_id = p_project_id;

    RETURN v_project_code || '-SMP-' || LPAD(v_next_no::TEXT, 3, '0');
END;
$$;


ALTER FUNCTION public.generate_sample_code(p_project_id bigint) OWNER TO postgres;

--
-- Name: log_assignment_status_change(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_assignment_status_change() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO sample_test_assignment_history (
            assignment_id,
            old_status,
            new_status,
            changed_by,
            changed_at,
            remarks
        ) VALUES (
            NEW.assignment_id,
            OLD.status,
            NEW.status,
            NEW.created_by,
            CURRENT_TIMESTAMP,
            'Status changed automatically'
        );
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.log_assignment_status_change() OWNER TO postgres;

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at() OWNER TO postgres;

--
-- Name: set_updated_at_common(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at_common() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at_common() OWNER TO postgres;

--
-- Name: set_updated_at_project_scope_tests(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at_project_scope_tests() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at_project_scope_tests() OWNER TO postgres;

--
-- Name: set_updated_at_reports(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at_reports() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at_reports() OWNER TO postgres;

--
-- Name: set_updated_at_sample_test_assignments(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at_sample_test_assignments() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at_sample_test_assignments() OWNER TO postgres;

--
-- Name: set_updated_at_samples(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_updated_at_samples() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_updated_at_samples() OWNER TO postgres;

--
-- Name: update_lab_document_services_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_lab_document_services_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_lab_document_services_updated_at() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    audit_id bigint NOT NULL,
    lab_id bigint,
    user_id bigint,
    module_name character varying(100) NOT NULL,
    record_type character varying(100),
    record_id bigint,
    action_type character varying(50) NOT NULL,
    action_note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: audit_logs_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.audit_logs_audit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.audit_logs_audit_id_seq OWNER TO postgres;

--
-- Name: audit_logs_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.audit_logs_audit_id_seq OWNED BY public.audit_logs.audit_id;


--
-- Name: clients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.clients (
    client_id bigint NOT NULL,
    lab_id bigint NOT NULL,
    client_name character varying(255) NOT NULL,
    contact_person character varying(255),
    email character varying(255),
    phone character varying(50),
    address text,
    city character varying(100),
    state character varying(100),
    pincode character varying(20),
    gst_no character varying(50),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_by bigint,
    updated_by bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT clients_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])))
);


ALTER TABLE public.clients OWNER TO postgres;

--
-- Name: clients_client_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.clients_client_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.clients_client_id_seq OWNER TO postgres;

--
-- Name: clients_client_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.clients_client_id_seq OWNED BY public.clients.client_id;


--
-- Name: lab_document_services; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lab_document_services (
    id bigint NOT NULL,
    lab_id bigint NOT NULL,
    doc_no character varying(50),
    issue_no character varying(50),
    amend_no character varying(50),
    doc_name character varying(255),
    issue_date date,
    amend_date date,
    copy_no character varying(50),
    section_no character varying(50),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT lab_document_services_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text, ('deleted'::character varying)::text])))
);


ALTER TABLE public.lab_document_services OWNER TO postgres;

--
-- Name: lab_document_services_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lab_document_services_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lab_document_services_id_seq OWNER TO postgres;

--
-- Name: lab_document_services_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lab_document_services_id_seq OWNED BY public.lab_document_services.id;


--
-- Name: lab_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.lab_profiles (
    id bigint NOT NULL,
    lab_name character varying(255) NOT NULL,
    address text,
    phone character varying(50),
    email character varying(100),
    logo_url text,
    nabl_number character varying(100),
    prepared_by character varying(100),
    approved_by character varying(100),
    footer_text text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    nabl_no character varying(100),
    lab_code character varying(50),
    report_footer text
);


ALTER TABLE public.lab_profiles OWNER TO postgres;

--
-- Name: lab_profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.lab_profiles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.lab_profiles_id_seq OWNER TO postgres;

--
-- Name: lab_profiles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.lab_profiles_id_seq OWNED BY public.lab_profiles.id;


--
-- Name: labs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.labs (
    lab_id bigint NOT NULL,
    lab_name character varying(255) NOT NULL,
    contact_person character varying(255),
    email character varying(255),
    phone character varying(50),
    address text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT labs_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])))
);


ALTER TABLE public.labs OWNER TO postgres;

--
-- Name: labs_lab_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.labs_lab_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.labs_lab_id_seq OWNER TO postgres;

--
-- Name: labs_lab_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.labs_lab_id_seq OWNED BY public.labs.lab_id;


--
-- Name: material_categories; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.material_categories (
    material_category_id bigint NOT NULL,
    lab_id bigint NOT NULL,
    category_name character varying(150) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT material_categories_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])))
);


ALTER TABLE public.material_categories OWNER TO postgres;

--
-- Name: material_categories_material_category_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.material_categories_material_category_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.material_categories_material_category_id_seq OWNER TO postgres;

--
-- Name: material_categories_material_category_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.material_categories_material_category_id_seq OWNED BY public.material_categories.material_category_id;


--
-- Name: material_types; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.material_types (
    material_type_id bigint NOT NULL,
    lab_id bigint NOT NULL,
    material_category_id bigint NOT NULL,
    type_name character varying(150) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT material_types_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])))
);


ALTER TABLE public.material_types OWNER TO postgres;

--
-- Name: material_types_material_type_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.material_types_material_type_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.material_types_material_type_id_seq OWNER TO postgres;

--
-- Name: material_types_material_type_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.material_types_material_type_id_seq OWNED BY public.material_types.material_type_id;


--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    reset_id bigint NOT NULL,
    user_id bigint NOT NULL,
    token character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    is_used boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: password_reset_tokens_reset_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.password_reset_tokens_reset_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.password_reset_tokens_reset_id_seq OWNER TO postgres;

--
-- Name: password_reset_tokens_reset_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.password_reset_tokens_reset_id_seq OWNED BY public.password_reset_tokens.reset_id;


--
-- Name: project_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_documents (
    doc_id bigint NOT NULL,
    project_id bigint NOT NULL,
    document_type character varying(100) NOT NULL,
    file_name character varying(255) NOT NULL,
    file_path text NOT NULL,
    file_size bigint,
    mime_type character varying(150),
    created_by bigint,
    updated_by bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.project_documents OWNER TO postgres;

--
-- Name: project_documents_doc_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_documents_doc_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_documents_doc_id_seq OWNER TO postgres;

--
-- Name: project_documents_doc_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_documents_doc_id_seq OWNED BY public.project_documents.doc_id;


--
-- Name: project_registration; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_registration (
    id bigint NOT NULL,
    project_id bigint NOT NULL,
    registration_no character varying(100) NOT NULL,
    job_no character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.project_registration OWNER TO postgres;

--
-- Name: project_registration_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_registration_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_registration_id_seq OWNER TO postgres;

--
-- Name: project_registration_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_registration_id_seq OWNED BY public.project_registration.id;


--
-- Name: project_scope_tests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_scope_tests (
    project_scope_test_id bigint NOT NULL,
    lab_id bigint NOT NULL,
    project_id bigint NOT NULL,
    group_id bigint NOT NULL,
    material_id bigint NOT NULL,
    scope_test_id bigint NOT NULL,
    sample_required boolean DEFAULT true,
    test_quantity integer DEFAULT 1,
    remarks text,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sequence_no integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    CONSTRAINT project_scope_tests_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])))
);


ALTER TABLE public.project_scope_tests OWNER TO postgres;

--
-- Name: project_scope_tests_project_scope_test_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_scope_tests_project_scope_test_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_scope_tests_project_scope_test_id_seq OWNER TO postgres;

--
-- Name: project_scope_tests_project_scope_test_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_scope_tests_project_scope_test_id_seq OWNED BY public.project_scope_tests.project_scope_test_id;


--
-- Name: project_status_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.project_status_history (
    project_history_id bigint NOT NULL,
    project_id bigint NOT NULL,
    lab_id bigint NOT NULL,
    old_status character varying(20),
    new_status character varying(20) NOT NULL,
    changed_by bigint,
    change_note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.project_status_history OWNER TO postgres;

--
-- Name: project_status_history_project_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.project_status_history_project_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.project_status_history_project_history_id_seq OWNER TO postgres;

--
-- Name: project_status_history_project_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.project_status_history_project_history_id_seq OWNED BY public.project_status_history.project_history_id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.projects (
    project_id bigint NOT NULL,
    lab_id bigint NOT NULL,
    client_id bigint,
    project_code character varying(100) NOT NULL,
    project_name character varying(255) NOT NULL,
    name_of_work_and_other_details text NOT NULL,
    location_name character varying(255),
    site_address text,
    city character varying(100),
    state character varying(100),
    pincode character varying(20),
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    dispatch_mode character varying(50),
    client_representative_name character varying(255),
    request_collected_by bigint,
    test_assigned_to bigint,
    reviewed_by bigint,
    created_by bigint,
    updated_by bigint,
    nabl_scope boolean DEFAULT false,
    CONSTRAINT projects_status_check CHECK (((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('active'::character varying)::text, ('in_progress'::character varying)::text, ('completed'::character varying)::text, ('on_hold'::character varying)::text, ('cancelled'::character varying)::text])))
);


ALTER TABLE public.projects OWNER TO postgres;

--
-- Name: COLUMN projects.name_of_work_and_other_details; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.projects.name_of_work_and_other_details IS 'Name of work & other details';


--
-- Name: COLUMN projects.nabl_scope; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.projects.nabl_scope IS 'Whether the project requires NABL scope compliance';


--
-- Name: projects_project_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.projects_project_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.projects_project_id_seq OWNER TO postgres;

--
-- Name: projects_project_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.projects_project_id_seq OWNED BY public.projects.project_id;


--
-- Name: refresh_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.refresh_tokens (
    token_id bigint NOT NULL,
    user_id bigint NOT NULL,
    token_hash character varying(255) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    is_revoked boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.refresh_tokens OWNER TO postgres;

--
-- Name: refresh_tokens_token_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.refresh_tokens_token_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.refresh_tokens_token_id_seq OWNER TO postgres;

--
-- Name: refresh_tokens_token_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.refresh_tokens_token_id_seq OWNED BY public.refresh_tokens.token_id;


--
-- Name: report_extra_fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_extra_fields (
    report_extra_field_id bigint NOT NULL,
    report_id bigint NOT NULL,
    field_label character varying(255) NOT NULL,
    field_value text,
    sequence_no integer DEFAULT 1 NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.report_extra_fields OWNER TO postgres;

--
-- Name: report_extra_fields_report_extra_field_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_extra_fields_report_extra_field_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_extra_fields_report_extra_field_id_seq OWNER TO postgres;

--
-- Name: report_extra_fields_report_extra_field_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.report_extra_fields_report_extra_field_id_seq OWNED BY public.report_extra_fields.report_extra_field_id;


--
-- Name: report_scope_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_scope_results (
    report_scope_result_id bigint NOT NULL,
    report_id bigint NOT NULL,
    group_id bigint NOT NULL,
    material_id bigint NOT NULL,
    scope_test_id bigint NOT NULL,
    result_value character varying(255),
    unit character varying(100),
    remark text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.report_scope_results OWNER TO postgres;

--
-- Name: report_scope_results_report_scope_result_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_scope_results_report_scope_result_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_scope_results_report_scope_result_id_seq OWNER TO postgres;

--
-- Name: report_scope_results_report_scope_result_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.report_scope_results_report_scope_result_id_seq OWNED BY public.report_scope_results.report_scope_result_id;


--
-- Name: report_status_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_status_history (
    report_status_history_id bigint NOT NULL,
    report_id bigint NOT NULL,
    old_status character varying(50),
    new_status character varying(50) NOT NULL,
    comment text,
    action_by bigint,
    action_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT report_status_history_new_status_check CHECK (((new_status)::text = ANY (ARRAY[('draft'::character varying)::text, ('submitted'::character varying)::text, ('revision'::character varying)::text, ('approved'::character varying)::text, ('rejected'::character varying)::text])))
);


ALTER TABLE public.report_status_history OWNER TO postgres;

--
-- Name: report_status_history_report_status_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_status_history_report_status_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_status_history_report_status_history_id_seq OWNER TO postgres;

--
-- Name: report_status_history_report_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.report_status_history_report_status_history_id_seq OWNED BY public.report_status_history.report_status_history_id;


--
-- Name: report_test_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.report_test_results (
    report_test_result_id bigint NOT NULL,
    report_id bigint NOT NULL,
    sample_test_result_id bigint,
    project_scope_test_id bigint,
    scope_test_id bigint,
    test_name character varying(255) NOT NULL,
    test_method text,
    unit character varying(100),
    sequence_no integer DEFAULT 1 NOT NULL,
    result_value text,
    remark text,
    is_extra_test boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    raw_observation_data jsonb
);


ALTER TABLE public.report_test_results OWNER TO postgres;

--
-- Name: report_test_results_report_test_result_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.report_test_results_report_test_result_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.report_test_results_report_test_result_id_seq OWNER TO postgres;

--
-- Name: report_test_results_report_test_result_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.report_test_results_report_test_result_id_seq OWNED BY public.report_test_results.report_test_result_id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reports (
    report_id bigint NOT NULL,
    lab_id bigint NOT NULL,
    project_id bigint NOT NULL,
    report_number character varying(100) NOT NULL,
    report_title character varying(255),
    report_create_date date DEFAULT CURRENT_DATE NOT NULL,
    report_date date,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    extra_fields jsonb,
    remarks text,
    created_by bigint,
    approved_by bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    sample_id bigint,
    report_no character varying(100),
    issue_date date,
    report_status character varying(50) DEFAULT 'draft'::character varying,
    prepared_by bigint,
    reviewed_by bigint,
    approved_at timestamp without time zone,
    pdf_file_name character varying(255),
    pdf_file_path text,
    updated_by bigint,
    CONSTRAINT chk_reports_report_status CHECK (((report_status)::text = ANY (ARRAY[('draft'::character varying)::text, ('in_progress'::character varying)::text, ('under_review'::character varying)::text, ('revision_requested'::character varying)::text, ('approved'::character varying)::text, ('issued'::character varying)::text, ('rejected'::character varying)::text])))
);


ALTER TABLE public.reports OWNER TO postgres;

--
-- Name: reports_report_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.reports_report_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.reports_report_id_seq OWNER TO postgres;

--
-- Name: reports_report_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.reports_report_id_seq OWNED BY public.reports.report_id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles (
    role_id bigint NOT NULL,
    role_name character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT roles_role_name_check CHECK (((role_name)::text = ANY (ARRAY[('super_admin'::character varying)::text, ('admin'::character varying)::text, ('team_member'::character varying)::text])))
);


ALTER TABLE public.roles OWNER TO postgres;

--
-- Name: roles_backup; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.roles_backup (
    role_id bigint,
    lab_id bigint,
    role_name character varying(50),
    description text,
    created_at timestamp without time zone,
    updated_at timestamp without time zone
);


ALTER TABLE public.roles_backup OWNER TO postgres;

--
-- Name: roles_role_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.roles_role_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_role_id_seq OWNER TO postgres;

--
-- Name: roles_role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.roles_role_id_seq OWNED BY public.roles.role_id;


--
-- Name: sample_conditions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sample_conditions (
    sample_condition_id bigint NOT NULL,
    lab_id bigint NOT NULL,
    condition_name character varying(100) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sample_conditions_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])))
);


ALTER TABLE public.sample_conditions OWNER TO postgres;

--
-- Name: sample_conditions_sample_condition_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sample_conditions_sample_condition_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sample_conditions_sample_condition_id_seq OWNER TO postgres;

--
-- Name: sample_conditions_sample_condition_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sample_conditions_sample_condition_id_seq OWNED BY public.sample_conditions.sample_condition_id;


--
-- Name: sample_entries_audit; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sample_entries_audit (
    audit_id bigint NOT NULL,
    sample_entry_id bigint NOT NULL,
    action_type character varying(20) NOT NULL,
    old_data jsonb,
    new_data jsonb,
    action_by bigint,
    action_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sample_entries_audit_action_type_check CHECK (((action_type)::text = ANY (ARRAY[('INSERT'::character varying)::text, ('UPDATE'::character varying)::text, ('DELETE'::character varying)::text])))
);


ALTER TABLE public.sample_entries_audit OWNER TO postgres;

--
-- Name: sample_entries_audit_audit_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sample_entries_audit_audit_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sample_entries_audit_audit_id_seq OWNER TO postgres;

--
-- Name: sample_entries_audit_audit_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sample_entries_audit_audit_id_seq OWNED BY public.sample_entries_audit.audit_id;


--
-- Name: sample_grades; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sample_grades (
    sample_grade_id bigint NOT NULL,
    lab_id bigint NOT NULL,
    sample_type_id bigint,
    grade_name character varying(100) NOT NULL,
    grade_description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sample_grades_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])))
);


ALTER TABLE public.sample_grades OWNER TO postgres;

--
-- Name: sample_grades_sample_grade_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sample_grades_sample_grade_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sample_grades_sample_grade_id_seq OWNER TO postgres;

--
-- Name: sample_grades_sample_grade_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sample_grades_sample_grade_id_seq OWNED BY public.sample_grades.sample_grade_id;


--
-- Name: sample_locations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sample_locations (
    sample_location_id bigint NOT NULL,
    lab_id bigint NOT NULL,
    location_name character varying(150) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_by bigint,
    updated_by bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sample_locations_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])))
);


ALTER TABLE public.sample_locations OWNER TO postgres;

--
-- Name: sample_locations_sample_location_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sample_locations_sample_location_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sample_locations_sample_location_id_seq OWNER TO postgres;

--
-- Name: sample_locations_sample_location_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sample_locations_sample_location_id_seq OWNED BY public.sample_locations.sample_location_id;


--
-- Name: sample_receipt_photos; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sample_receipt_photos (
    photo_id bigint NOT NULL,
    sample_id bigint NOT NULL,
    file_name character varying(500),
    file_path character varying(1000),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sample_receipt_photos OWNER TO postgres;

--
-- Name: sample_receipt_photos_photo_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sample_receipt_photos_photo_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sample_receipt_photos_photo_id_seq OWNER TO postgres;

--
-- Name: sample_receipt_photos_photo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sample_receipt_photos_photo_id_seq OWNED BY public.sample_receipt_photos.photo_id;


--
-- Name: sample_receipt_register; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sample_receipt_register (
    sample_id bigint NOT NULL,
    project_id bigint NOT NULL,
    project_code character varying(100) NOT NULL,
    client_name character varying(255) NOT NULL,
    sample_no character varying(100) NOT NULL,
    material_name character varying(255) NOT NULL,
    quantity character varying(100) NOT NULL,
    received_date date NOT NULL,
    received_by character varying(255) NOT NULL,
    remarks text,
    created_by bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    sample_received_date date NOT NULL,
    sample_source character varying(100) NOT NULL,
    received_condition character varying(100) NOT NULL,
    sample_location character varying(255),
    sample_priority character varying(50) DEFAULT 'Normal'::character varying,
    status character varying(100) DEFAULT 'Received'::character varying,
    letter_date date NOT NULL
);


ALTER TABLE public.sample_receipt_register OWNER TO postgres;

--
-- Name: sample_receipt_register_sample_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sample_receipt_register_sample_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sample_receipt_register_sample_id_seq OWNER TO postgres;

--
-- Name: sample_receipt_register_sample_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sample_receipt_register_sample_id_seq OWNED BY public.sample_receipt_register.sample_id;


--
-- Name: sample_test_assignment_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sample_test_assignment_history (
    history_id bigint NOT NULL,
    assignment_id bigint NOT NULL,
    old_status character varying(50),
    new_status character varying(50) NOT NULL,
    changed_by bigint,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    remarks text
);


ALTER TABLE public.sample_test_assignment_history OWNER TO postgres;

--
-- Name: sample_test_assignment_history_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sample_test_assignment_history_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sample_test_assignment_history_history_id_seq OWNER TO postgres;

--
-- Name: sample_test_assignment_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sample_test_assignment_history_history_id_seq OWNED BY public.sample_test_assignment_history.history_id;


--
-- Name: sample_test_assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sample_test_assignments (
    assignment_id bigint NOT NULL,
    sample_id bigint NOT NULL,
    scope_test_id bigint NOT NULL,
    assigned_to bigint,
    assigned_date date DEFAULT CURRENT_DATE NOT NULL,
    target_date date,
    priority character varying(50) DEFAULT 'Normal'::character varying,
    status character varying(50) DEFAULT 'Assigned'::character varying,
    remarks text,
    created_by bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    observation_status character varying(20) DEFAULT 'Pending'::character varying,
    observation_completed_at timestamp without time zone,
    current_version_id uuid,
    current_observation_id uuid,
    CONSTRAINT sample_test_assignments_priority_check CHECK (((priority)::text = ANY ((ARRAY['Normal'::character varying, 'High'::character varying, 'Urgent'::character varying])::text[]))),
    CONSTRAINT sample_test_assignments_status_check CHECK (((status)::text = ANY ((ARRAY['Assigned'::character varying, 'In Progress'::character varying, 'Observation Completed'::character varying, 'Result Generated'::character varying, 'Reviewed'::character varying, 'Approved'::character varying])::text[])))
);


ALTER TABLE public.sample_test_assignments OWNER TO postgres;

--
-- Name: sample_test_assignments_assignment_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sample_test_assignments_assignment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sample_test_assignments_assignment_id_seq OWNER TO postgres;

--
-- Name: sample_test_assignments_assignment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sample_test_assignments_assignment_id_seq OWNED BY public.sample_test_assignments.assignment_id;


--
-- Name: sample_test_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sample_test_results (
    sample_test_result_id bigint NOT NULL,
    lab_id bigint NOT NULL,
    project_id bigint NOT NULL,
    sample_id bigint NOT NULL,
    project_scope_test_id bigint,
    scope_test_id bigint,
    test_name character varying(255) NOT NULL,
    test_method text,
    unit character varying(100),
    sequence_no integer DEFAULT 1 NOT NULL,
    result_value text,
    remark text,
    is_extra_test boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    entered_by bigint,
    updated_by bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    raw_observation_data jsonb
);


ALTER TABLE public.sample_test_results OWNER TO postgres;

--
-- Name: sample_test_results_sample_test_result_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sample_test_results_sample_test_result_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sample_test_results_sample_test_result_id_seq OWNER TO postgres;

--
-- Name: sample_test_results_sample_test_result_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sample_test_results_sample_test_result_id_seq OWNED BY public.sample_test_results.sample_test_result_id;


--
-- Name: sample_type_tests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sample_type_tests (
    sample_type_test_id bigint NOT NULL,
    lab_id bigint NOT NULL,
    sample_type_id bigint NOT NULL,
    test_name character varying(255) NOT NULL,
    default_testing_day_id bigint,
    default_day_value integer,
    description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT sample_type_tests_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])))
);


ALTER TABLE public.sample_type_tests OWNER TO postgres;

--
-- Name: sample_type_tests_sample_type_test_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.sample_type_tests_sample_type_test_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.sample_type_tests_sample_type_test_id_seq OWNER TO postgres;

--
-- Name: sample_type_tests_sample_type_test_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.sample_type_tests_sample_type_test_id_seq OWNED BY public.sample_type_tests.sample_type_test_id;


--
-- Name: scope_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scope_groups (
    group_id bigint NOT NULL,
    lab_id bigint NOT NULL,
    testing_scope_type character varying(30) NOT NULL,
    group_name character varying(255) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_by bigint,
    updated_by bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT scope_groups_testing_scope_type_check CHECK (((testing_scope_type)::text = ANY (ARRAY[('permanent_testing'::character varying)::text, ('site_testing'::character varying)::text])))
);


ALTER TABLE public.scope_groups OWNER TO postgres;

--
-- Name: scope_groups_group_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.scope_groups_group_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scope_groups_group_id_seq OWNER TO postgres;

--
-- Name: scope_groups_group_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.scope_groups_group_id_seq OWNED BY public.scope_groups.group_id;


--
-- Name: scope_materials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scope_materials (
    material_id bigint NOT NULL,
    lab_id bigint NOT NULL,
    group_id bigint NOT NULL,
    material_name character varying(255) NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_by bigint,
    updated_by bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.scope_materials OWNER TO postgres;

--
-- Name: scope_materials_material_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.scope_materials_material_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scope_materials_material_id_seq OWNER TO postgres;

--
-- Name: scope_materials_material_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.scope_materials_material_id_seq OWNED BY public.scope_materials.material_id;


--
-- Name: scope_tests; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scope_tests (
    scope_test_id bigint NOT NULL,
    lab_id bigint NOT NULL,
    group_id bigint NOT NULL,
    material_id bigint NOT NULL,
    test_name text NOT NULL,
    test_method text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_by bigint,
    updated_by bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.scope_tests OWNER TO postgres;

--
-- Name: scope_tests_scope_test_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.scope_tests_scope_test_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scope_tests_scope_test_id_seq OWNER TO postgres;

--
-- Name: scope_tests_scope_test_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.scope_tests_scope_test_id_seq OWNED BY public.scope_tests.scope_test_id;


--
-- Name: testing_days; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.testing_days (
    testing_day_id bigint NOT NULL,
    lab_id bigint NOT NULL,
    day_label character varying(50) NOT NULL,
    day_value integer NOT NULL,
    description text,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT testing_days_day_value_check CHECK ((day_value >= 0)),
    CONSTRAINT testing_days_status_check CHECK (((status)::text = ANY (ARRAY[('active'::character varying)::text, ('inactive'::character varying)::text])))
);


ALTER TABLE public.testing_days OWNER TO postgres;

--
-- Name: testing_days_testing_day_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.testing_days_testing_day_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.testing_days_testing_day_id_seq OWNER TO postgres;

--
-- Name: testing_days_testing_day_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.testing_days_testing_day_id_seq OWNED BY public.testing_days.testing_day_id;


--
-- Name: user_verifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_verifications (
    user_verification_id bigint NOT NULL,
    user_id bigint NOT NULL,
    verification_type character varying(30) NOT NULL,
    otp_code character varying(20) NOT NULL,
    is_verified boolean DEFAULT false NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT user_verifications_verification_type_check CHECK (((verification_type)::text = ANY (ARRAY[('email_otp'::character varying)::text, ('phone_otp'::character varying)::text])))
);


ALTER TABLE public.user_verifications OWNER TO postgres;

--
-- Name: user_verifications_user_verification_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.user_verifications_user_verification_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_verifications_user_verification_id_seq OWNER TO postgres;

--
-- Name: user_verifications_user_verification_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.user_verifications_user_verification_id_seq OWNED BY public.user_verifications.user_verification_id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    user_id bigint NOT NULL,
    lab_id bigint,
    role_id bigint NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100),
    email character varying(255) NOT NULL,
    password_hash text NOT NULL,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    phone character varying(50),
    is_email_verified boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp without time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_user_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_user_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_user_id_seq OWNER TO postgres;

--
-- Name: users_user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_user_id_seq OWNED BY public.users.user_id;


--
-- Name: audit_logs audit_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN audit_id SET DEFAULT nextval('public.audit_logs_audit_id_seq'::regclass);


--
-- Name: clients client_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients ALTER COLUMN client_id SET DEFAULT nextval('public.clients_client_id_seq'::regclass);


--
-- Name: lab_document_services id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_document_services ALTER COLUMN id SET DEFAULT nextval('public.lab_document_services_id_seq'::regclass);


--
-- Name: lab_profiles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_profiles ALTER COLUMN id SET DEFAULT nextval('public.lab_profiles_id_seq'::regclass);


--
-- Name: labs lab_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.labs ALTER COLUMN lab_id SET DEFAULT nextval('public.labs_lab_id_seq'::regclass);


--
-- Name: material_categories material_category_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_categories ALTER COLUMN material_category_id SET DEFAULT nextval('public.material_categories_material_category_id_seq'::regclass);


--
-- Name: material_types material_type_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_types ALTER COLUMN material_type_id SET DEFAULT nextval('public.material_types_material_type_id_seq'::regclass);


--
-- Name: password_reset_tokens reset_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens ALTER COLUMN reset_id SET DEFAULT nextval('public.password_reset_tokens_reset_id_seq'::regclass);


--
-- Name: project_documents doc_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_documents ALTER COLUMN doc_id SET DEFAULT nextval('public.project_documents_doc_id_seq'::regclass);


--
-- Name: project_registration id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_registration ALTER COLUMN id SET DEFAULT nextval('public.project_registration_id_seq'::regclass);


--
-- Name: project_scope_tests project_scope_test_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_scope_tests ALTER COLUMN project_scope_test_id SET DEFAULT nextval('public.project_scope_tests_project_scope_test_id_seq'::regclass);


--
-- Name: project_status_history project_history_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_status_history ALTER COLUMN project_history_id SET DEFAULT nextval('public.project_status_history_project_history_id_seq'::regclass);


--
-- Name: projects project_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects ALTER COLUMN project_id SET DEFAULT nextval('public.projects_project_id_seq'::regclass);


--
-- Name: refresh_tokens token_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens ALTER COLUMN token_id SET DEFAULT nextval('public.refresh_tokens_token_id_seq'::regclass);


--
-- Name: report_extra_fields report_extra_field_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_extra_fields ALTER COLUMN report_extra_field_id SET DEFAULT nextval('public.report_extra_fields_report_extra_field_id_seq'::regclass);


--
-- Name: report_scope_results report_scope_result_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_scope_results ALTER COLUMN report_scope_result_id SET DEFAULT nextval('public.report_scope_results_report_scope_result_id_seq'::regclass);


--
-- Name: report_status_history report_status_history_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_status_history ALTER COLUMN report_status_history_id SET DEFAULT nextval('public.report_status_history_report_status_history_id_seq'::regclass);


--
-- Name: report_test_results report_test_result_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_test_results ALTER COLUMN report_test_result_id SET DEFAULT nextval('public.report_test_results_report_test_result_id_seq'::regclass);


--
-- Name: reports report_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports ALTER COLUMN report_id SET DEFAULT nextval('public.reports_report_id_seq'::regclass);


--
-- Name: roles role_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles ALTER COLUMN role_id SET DEFAULT nextval('public.roles_role_id_seq'::regclass);


--
-- Name: sample_conditions sample_condition_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_conditions ALTER COLUMN sample_condition_id SET DEFAULT nextval('public.sample_conditions_sample_condition_id_seq'::regclass);


--
-- Name: sample_entries_audit audit_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_entries_audit ALTER COLUMN audit_id SET DEFAULT nextval('public.sample_entries_audit_audit_id_seq'::regclass);


--
-- Name: sample_grades sample_grade_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_grades ALTER COLUMN sample_grade_id SET DEFAULT nextval('public.sample_grades_sample_grade_id_seq'::regclass);


--
-- Name: sample_locations sample_location_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_locations ALTER COLUMN sample_location_id SET DEFAULT nextval('public.sample_locations_sample_location_id_seq'::regclass);


--
-- Name: sample_receipt_photos photo_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_receipt_photos ALTER COLUMN photo_id SET DEFAULT nextval('public.sample_receipt_photos_photo_id_seq'::regclass);


--
-- Name: sample_receipt_register sample_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_receipt_register ALTER COLUMN sample_id SET DEFAULT nextval('public.sample_receipt_register_sample_id_seq'::regclass);


--
-- Name: sample_test_assignment_history history_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_test_assignment_history ALTER COLUMN history_id SET DEFAULT nextval('public.sample_test_assignment_history_history_id_seq'::regclass);


--
-- Name: sample_test_assignments assignment_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_test_assignments ALTER COLUMN assignment_id SET DEFAULT nextval('public.sample_test_assignments_assignment_id_seq'::regclass);


--
-- Name: sample_test_results sample_test_result_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_test_results ALTER COLUMN sample_test_result_id SET DEFAULT nextval('public.sample_test_results_sample_test_result_id_seq'::regclass);


--
-- Name: sample_type_tests sample_type_test_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_type_tests ALTER COLUMN sample_type_test_id SET DEFAULT nextval('public.sample_type_tests_sample_type_test_id_seq'::regclass);


--
-- Name: scope_groups group_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_groups ALTER COLUMN group_id SET DEFAULT nextval('public.scope_groups_group_id_seq'::regclass);


--
-- Name: scope_materials material_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_materials ALTER COLUMN material_id SET DEFAULT nextval('public.scope_materials_material_id_seq'::regclass);


--
-- Name: scope_tests scope_test_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_tests ALTER COLUMN scope_test_id SET DEFAULT nextval('public.scope_tests_scope_test_id_seq'::regclass);


--
-- Name: testing_days testing_day_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.testing_days ALTER COLUMN testing_day_id SET DEFAULT nextval('public.testing_days_testing_day_id_seq'::regclass);


--
-- Name: user_verifications user_verification_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_verifications ALTER COLUMN user_verification_id SET DEFAULT nextval('public.user_verifications_user_verification_id_seq'::regclass);


--
-- Name: users user_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN user_id SET DEFAULT nextval('public.users_user_id_seq'::regclass);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (audit_id);


--
-- Name: clients clients_lab_id_client_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_lab_id_client_name_key UNIQUE (lab_id, client_name);


--
-- Name: clients clients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_pkey PRIMARY KEY (client_id);


--
-- Name: lab_document_services lab_document_services_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_document_services
    ADD CONSTRAINT lab_document_services_pkey PRIMARY KEY (id);


--
-- Name: lab_profiles lab_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_profiles
    ADD CONSTRAINT lab_profiles_pkey PRIMARY KEY (id);


--
-- Name: labs labs_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.labs
    ADD CONSTRAINT labs_email_key UNIQUE (email);


--
-- Name: labs labs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.labs
    ADD CONSTRAINT labs_pkey PRIMARY KEY (lab_id);


--
-- Name: material_categories material_categories_lab_id_category_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_categories
    ADD CONSTRAINT material_categories_lab_id_category_name_key UNIQUE (lab_id, category_name);


--
-- Name: material_categories material_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_categories
    ADD CONSTRAINT material_categories_pkey PRIMARY KEY (material_category_id);


--
-- Name: material_types material_types_lab_id_material_category_id_type_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_types
    ADD CONSTRAINT material_types_lab_id_material_category_id_type_name_key UNIQUE (lab_id, material_category_id, type_name);


--
-- Name: material_types material_types_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_types
    ADD CONSTRAINT material_types_pkey PRIMARY KEY (material_type_id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (reset_id);


--
-- Name: password_reset_tokens password_reset_tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_key UNIQUE (token);


--
-- Name: project_documents project_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_pkey PRIMARY KEY (doc_id);


--
-- Name: project_registration project_registration_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_registration
    ADD CONSTRAINT project_registration_pkey PRIMARY KEY (id);


--
-- Name: project_scope_tests project_scope_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_scope_tests
    ADD CONSTRAINT project_scope_tests_pkey PRIMARY KEY (project_scope_test_id);


--
-- Name: project_scope_tests project_scope_tests_project_id_scope_test_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_scope_tests
    ADD CONSTRAINT project_scope_tests_project_id_scope_test_id_key UNIQUE (project_id, scope_test_id);


--
-- Name: project_status_history project_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_status_history
    ADD CONSTRAINT project_status_history_pkey PRIMARY KEY (project_history_id);


--
-- Name: projects projects_lab_id_project_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_lab_id_project_code_key UNIQUE (lab_id, project_code);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (project_id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (token_id);


--
-- Name: report_extra_fields report_extra_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_extra_fields
    ADD CONSTRAINT report_extra_fields_pkey PRIMARY KEY (report_extra_field_id);


--
-- Name: report_scope_results report_scope_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_scope_results
    ADD CONSTRAINT report_scope_results_pkey PRIMARY KEY (report_scope_result_id);


--
-- Name: report_scope_results report_scope_results_report_id_scope_test_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_scope_results
    ADD CONSTRAINT report_scope_results_report_id_scope_test_id_key UNIQUE (report_id, scope_test_id);


--
-- Name: report_status_history report_status_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_status_history
    ADD CONSTRAINT report_status_history_pkey PRIMARY KEY (report_status_history_id);


--
-- Name: report_test_results report_test_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_test_results
    ADD CONSTRAINT report_test_results_pkey PRIMARY KEY (report_test_result_id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (report_id);


--
-- Name: reports reports_report_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_report_number_key UNIQUE (report_number);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (role_id);


--
-- Name: sample_conditions sample_conditions_lab_id_condition_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_conditions
    ADD CONSTRAINT sample_conditions_lab_id_condition_name_key UNIQUE (lab_id, condition_name);


--
-- Name: sample_conditions sample_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_conditions
    ADD CONSTRAINT sample_conditions_pkey PRIMARY KEY (sample_condition_id);


--
-- Name: sample_entries_audit sample_entries_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_entries_audit
    ADD CONSTRAINT sample_entries_audit_pkey PRIMARY KEY (audit_id);


--
-- Name: sample_grades sample_grades_lab_id_sample_type_id_grade_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_grades
    ADD CONSTRAINT sample_grades_lab_id_sample_type_id_grade_name_key UNIQUE (lab_id, sample_type_id, grade_name);


--
-- Name: sample_grades sample_grades_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_grades
    ADD CONSTRAINT sample_grades_pkey PRIMARY KEY (sample_grade_id);


--
-- Name: sample_locations sample_locations_lab_id_location_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_locations
    ADD CONSTRAINT sample_locations_lab_id_location_name_key UNIQUE (lab_id, location_name);


--
-- Name: sample_locations sample_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_locations
    ADD CONSTRAINT sample_locations_pkey PRIMARY KEY (sample_location_id);


--
-- Name: sample_receipt_photos sample_receipt_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_receipt_photos
    ADD CONSTRAINT sample_receipt_photos_pkey PRIMARY KEY (photo_id);


--
-- Name: sample_receipt_register sample_receipt_register_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_receipt_register
    ADD CONSTRAINT sample_receipt_register_pkey PRIMARY KEY (sample_id);


--
-- Name: sample_test_assignment_history sample_test_assignment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_test_assignment_history
    ADD CONSTRAINT sample_test_assignment_history_pkey PRIMARY KEY (history_id);


--
-- Name: sample_test_assignments sample_test_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_test_assignments
    ADD CONSTRAINT sample_test_assignments_pkey PRIMARY KEY (assignment_id);


--
-- Name: sample_test_results sample_test_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_test_results
    ADD CONSTRAINT sample_test_results_pkey PRIMARY KEY (sample_test_result_id);


--
-- Name: sample_type_tests sample_type_tests_lab_id_sample_type_id_test_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_type_tests
    ADD CONSTRAINT sample_type_tests_lab_id_sample_type_id_test_name_key UNIQUE (lab_id, sample_type_id, test_name);


--
-- Name: sample_type_tests sample_type_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_type_tests
    ADD CONSTRAINT sample_type_tests_pkey PRIMARY KEY (sample_type_test_id);


--
-- Name: scope_groups scope_groups_lab_id_testing_scope_type_group_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_groups
    ADD CONSTRAINT scope_groups_lab_id_testing_scope_type_group_name_key UNIQUE (lab_id, testing_scope_type, group_name);


--
-- Name: scope_groups scope_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_groups
    ADD CONSTRAINT scope_groups_pkey PRIMARY KEY (group_id);


--
-- Name: scope_materials scope_materials_group_id_material_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_materials
    ADD CONSTRAINT scope_materials_group_id_material_name_key UNIQUE (group_id, material_name);


--
-- Name: scope_materials scope_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_materials
    ADD CONSTRAINT scope_materials_pkey PRIMARY KEY (material_id);


--
-- Name: scope_tests scope_tests_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_tests
    ADD CONSTRAINT scope_tests_pkey PRIMARY KEY (scope_test_id);


--
-- Name: testing_days testing_days_lab_id_day_label_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.testing_days
    ADD CONSTRAINT testing_days_lab_id_day_label_key UNIQUE (lab_id, day_label);


--
-- Name: testing_days testing_days_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.testing_days
    ADD CONSTRAINT testing_days_pkey PRIMARY KEY (testing_day_id);


--
-- Name: project_registration uq_project_registration_project; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_registration
    ADD CONSTRAINT uq_project_registration_project UNIQUE (project_id);


--
-- Name: sample_test_assignments uq_sample_test_assignment; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_test_assignments
    ADD CONSTRAINT uq_sample_test_assignment UNIQUE (sample_id, scope_test_id);


--
-- Name: user_verifications user_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_verifications
    ADD CONSTRAINT user_verifications_pkey PRIMARY KEY (user_verification_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (user_id);


--
-- Name: idx_assignment_history_assignment_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_history_assignment_id ON public.sample_test_assignment_history USING btree (assignment_id);


--
-- Name: idx_assignment_history_changed_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_history_changed_at ON public.sample_test_assignment_history USING btree (changed_at);


--
-- Name: idx_assignment_version; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_version ON public.sample_test_assignments USING btree (current_version_id);


--
-- Name: idx_audit_logs_lab_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_lab_id ON public.audit_logs USING btree (lab_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_clients_lab_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_lab_id ON public.clients USING btree (lab_id);


--
-- Name: idx_clients_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_name ON public.clients USING btree (client_name);


--
-- Name: idx_clients_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_clients_status ON public.clients USING btree (status);


--
-- Name: idx_lab_document_services_doc_no; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lab_document_services_doc_no ON public.lab_document_services USING btree (doc_no);


--
-- Name: idx_lab_document_services_lab_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lab_document_services_lab_id ON public.lab_document_services USING btree (lab_id);


--
-- Name: idx_lab_document_services_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_lab_document_services_status ON public.lab_document_services USING btree (status);


--
-- Name: idx_material_categories_lab_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_material_categories_lab_id ON public.material_categories USING btree (lab_id);


--
-- Name: idx_material_types_category_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_material_types_category_id ON public.material_types USING btree (material_category_id);


--
-- Name: idx_material_types_lab_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_material_types_lab_id ON public.material_types USING btree (lab_id);


--
-- Name: idx_password_reset_tokens_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens USING btree (token);


--
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_project_documents_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_documents_project_id ON public.project_documents USING btree (project_id);


--
-- Name: idx_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_id ON public.sample_receipt_register USING btree (project_id);


--
-- Name: idx_project_registration_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_registration_project_id ON public.project_registration USING btree (project_id);


--
-- Name: idx_project_scope_tests_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_scope_tests_active ON public.project_scope_tests USING btree (is_active);


--
-- Name: idx_project_scope_tests_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_scope_tests_project_id ON public.project_scope_tests USING btree (project_id);


--
-- Name: idx_project_scope_tests_scope_test_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_scope_tests_scope_test_id ON public.project_scope_tests USING btree (scope_test_id);


--
-- Name: idx_project_status_history_lab_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_status_history_lab_id ON public.project_status_history USING btree (lab_id);


--
-- Name: idx_project_status_history_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_project_status_history_project_id ON public.project_status_history USING btree (project_id);


--
-- Name: idx_projects_client_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_client_id ON public.projects USING btree (client_id);


--
-- Name: idx_projects_lab_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_lab_id ON public.projects USING btree (lab_id);


--
-- Name: idx_projects_nabl_scope; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_nabl_scope ON public.projects USING btree (nabl_scope);


--
-- Name: idx_projects_project_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_project_code ON public.projects USING btree (project_code);


--
-- Name: idx_projects_project_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_project_name ON public.projects USING btree (project_name);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status);


--
-- Name: idx_refresh_tokens_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_expires_at ON public.refresh_tokens USING btree (expires_at);


--
-- Name: idx_refresh_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_refresh_tokens_user_id ON public.refresh_tokens USING btree (user_id);


--
-- Name: idx_report_extra_fields_report_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_extra_fields_report_id ON public.report_extra_fields USING btree (report_id);


--
-- Name: idx_report_status_history_action_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_status_history_action_at ON public.report_status_history USING btree (action_at);


--
-- Name: idx_report_status_history_report_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_status_history_report_id ON public.report_status_history USING btree (report_id);


--
-- Name: idx_report_test_results_report_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_test_results_report_id ON public.report_test_results USING btree (report_id);


--
-- Name: idx_report_test_results_sample_result_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_test_results_sample_result_id ON public.report_test_results USING btree (sample_test_result_id);


--
-- Name: idx_report_test_results_scope_test_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_report_test_results_scope_test_id ON public.report_test_results USING btree (project_scope_test_id);


--
-- Name: idx_reports_issue_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_issue_date ON public.reports USING btree (issue_date);


--
-- Name: idx_reports_lab_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_lab_id ON public.reports USING btree (lab_id);


--
-- Name: idx_reports_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_project_id ON public.reports USING btree (project_id);


--
-- Name: idx_reports_sample_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_sample_id ON public.reports USING btree (sample_id);


--
-- Name: idx_reports_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_reports_status ON public.reports USING btree (report_status);


--
-- Name: idx_sample_conditions_lab_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_conditions_lab_id ON public.sample_conditions USING btree (lab_id);


--
-- Name: idx_sample_grades_lab_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_grades_lab_id ON public.sample_grades USING btree (lab_id);


--
-- Name: idx_sample_grades_sample_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_grades_sample_type_id ON public.sample_grades USING btree (sample_type_id);


--
-- Name: idx_sample_locations_lab_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_locations_lab_id ON public.sample_locations USING btree (lab_id);


--
-- Name: idx_sample_no; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_no ON public.sample_receipt_register USING btree (sample_no);


--
-- Name: idx_sample_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_priority ON public.sample_receipt_register USING btree (sample_priority);


--
-- Name: idx_sample_receipt_register_letter_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_receipt_register_letter_date ON public.sample_receipt_register USING btree (letter_date);


--
-- Name: idx_sample_received_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_received_date ON public.sample_receipt_register USING btree (sample_received_date);


--
-- Name: idx_sample_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_status ON public.sample_receipt_register USING btree (status);


--
-- Name: idx_sample_test_assignments_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_test_assignments_assigned_to ON public.sample_test_assignments USING btree (assigned_to);


--
-- Name: idx_sample_test_assignments_priority; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_test_assignments_priority ON public.sample_test_assignments USING btree (priority);


--
-- Name: idx_sample_test_assignments_sample_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_test_assignments_sample_id ON public.sample_test_assignments USING btree (sample_id);


--
-- Name: idx_sample_test_assignments_scope_test_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_test_assignments_scope_test_id ON public.sample_test_assignments USING btree (scope_test_id);


--
-- Name: idx_sample_test_assignments_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_test_assignments_status ON public.sample_test_assignments USING btree (status);


--
-- Name: idx_sample_test_assignments_target_date; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_test_assignments_target_date ON public.sample_test_assignments USING btree (target_date);


--
-- Name: idx_sample_test_results_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_test_results_active ON public.sample_test_results USING btree (is_active);


--
-- Name: idx_sample_test_results_extra; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_test_results_extra ON public.sample_test_results USING btree (is_extra_test);


--
-- Name: idx_sample_test_results_lab_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_test_results_lab_id ON public.sample_test_results USING btree (lab_id);


--
-- Name: idx_sample_test_results_project_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_test_results_project_id ON public.sample_test_results USING btree (project_id);


--
-- Name: idx_sample_test_results_pst_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_test_results_pst_id ON public.sample_test_results USING btree (project_scope_test_id);


--
-- Name: idx_sample_test_results_sample_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_test_results_sample_id ON public.sample_test_results USING btree (sample_id);


--
-- Name: idx_sample_type_tests_lab_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_type_tests_lab_id ON public.sample_type_tests USING btree (lab_id);


--
-- Name: idx_sample_type_tests_sample_type_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sample_type_tests_sample_type_id ON public.sample_type_tests USING btree (sample_type_id);


--
-- Name: idx_scope_groups_lab_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scope_groups_lab_id ON public.scope_groups USING btree (lab_id);


--
-- Name: idx_scope_groups_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scope_groups_type ON public.scope_groups USING btree (testing_scope_type);


--
-- Name: idx_scope_materials_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scope_materials_group_id ON public.scope_materials USING btree (group_id);


--
-- Name: idx_scope_materials_lab_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scope_materials_lab_id ON public.scope_materials USING btree (lab_id);


--
-- Name: idx_scope_tests_group_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scope_tests_group_id ON public.scope_tests USING btree (group_id);


--
-- Name: idx_scope_tests_lab_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scope_tests_lab_id ON public.scope_tests USING btree (lab_id);


--
-- Name: idx_scope_tests_material_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scope_tests_material_id ON public.scope_tests USING btree (material_id);


--
-- Name: idx_testing_days_lab_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_testing_days_lab_id ON public.testing_days USING btree (lab_id);


--
-- Name: idx_user_verifications_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_verifications_user_id ON public.user_verifications USING btree (user_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_lab_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_lab_id ON public.users USING btree (lab_id);


--
-- Name: idx_users_role_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_role_id ON public.users USING btree (role_id);


--
-- Name: uq_reports_report_no; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_reports_report_no ON public.reports USING btree (report_no) WHERE (report_no IS NOT NULL);


--
-- Name: uq_sample_test_results_scope_test; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_sample_test_results_scope_test ON public.sample_test_results USING btree (sample_id, project_scope_test_id) WHERE (project_scope_test_id IS NOT NULL);


--
-- Name: uq_scope_tests_unique; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_scope_tests_unique ON public.scope_tests USING btree (lab_id, group_id, material_id, test_name, test_method);


--
-- Name: audit_logs trg_audit_logs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_audit_logs_updated_at BEFORE UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: clients trg_clients_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: labs trg_labs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_labs_updated_at BEFORE UPDATE ON public.labs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: sample_test_assignments trg_log_assignment_status_change; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_log_assignment_status_change AFTER UPDATE OF status ON public.sample_test_assignments FOR EACH ROW EXECUTE FUNCTION public.log_assignment_status_change();


--
-- Name: material_categories trg_material_categories_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_material_categories_updated_at BEFORE UPDATE ON public.material_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: material_types trg_material_types_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_material_types_updated_at BEFORE UPDATE ON public.material_types FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: password_reset_tokens trg_password_reset_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_password_reset_tokens_updated_at BEFORE UPDATE ON public.password_reset_tokens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: project_documents trg_project_documents_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_project_documents_updated_at BEFORE UPDATE ON public.project_documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: project_scope_tests trg_project_scope_tests_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_project_scope_tests_updated_at BEFORE UPDATE ON public.project_scope_tests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_project_scope_tests();


--
-- Name: project_status_history trg_project_status_history_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_project_status_history_updated_at BEFORE UPDATE ON public.project_status_history FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: projects trg_projects_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: refresh_tokens trg_refresh_tokens_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_refresh_tokens_updated_at BEFORE UPDATE ON public.refresh_tokens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: report_extra_fields trg_report_extra_fields_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_report_extra_fields_updated_at BEFORE UPDATE ON public.report_extra_fields FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_common();


--
-- Name: report_scope_results trg_report_scope_results_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_report_scope_results_updated_at BEFORE UPDATE ON public.report_scope_results FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_reports();


--
-- Name: report_test_results trg_report_test_results_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_report_test_results_updated_at BEFORE UPDATE ON public.report_test_results FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_common();


--
-- Name: reports trg_reports_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_reports_updated_at BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_reports();


--
-- Name: reports trg_reports_updated_at_common; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_reports_updated_at_common BEFORE UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_common();


--
-- Name: roles trg_roles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON public.roles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: sample_conditions trg_sample_conditions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sample_conditions_updated_at BEFORE UPDATE ON public.sample_conditions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: sample_grades trg_sample_grades_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sample_grades_updated_at BEFORE UPDATE ON public.sample_grades FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: sample_locations trg_sample_locations_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sample_locations_updated_at BEFORE UPDATE ON public.sample_locations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: sample_test_assignments trg_sample_test_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sample_test_assignments_updated_at BEFORE UPDATE ON public.sample_test_assignments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_sample_test_assignments();


--
-- Name: sample_test_results trg_sample_test_results_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sample_test_results_updated_at BEFORE UPDATE ON public.sample_test_results FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_common();


--
-- Name: sample_type_tests trg_sample_type_tests_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_sample_type_tests_updated_at BEFORE UPDATE ON public.sample_type_tests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: scope_groups trg_scope_groups_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_scope_groups_updated_at BEFORE UPDATE ON public.scope_groups FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: scope_materials trg_scope_materials_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_scope_materials_updated_at BEFORE UPDATE ON public.scope_materials FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: scope_tests trg_scope_tests_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_scope_tests_updated_at BEFORE UPDATE ON public.scope_tests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: testing_days trg_testing_days_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_testing_days_updated_at BEFORE UPDATE ON public.testing_days FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_verifications trg_user_verifications_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_user_verifications_updated_at BEFORE UPDATE ON public.user_verifications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: lab_document_services trigger_lab_document_services_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trigger_lab_document_services_updated_at BEFORE UPDATE ON public.lab_document_services FOR EACH ROW EXECUTE FUNCTION public.update_lab_document_services_updated_at();


--
-- Name: audit_logs audit_logs_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(lab_id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: clients clients_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: clients clients_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(lab_id) ON DELETE CASCADE;


--
-- Name: clients clients_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.clients
    ADD CONSTRAINT clients_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: sample_receipt_photos fk_sample_receipt_photo; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_receipt_photos
    ADD CONSTRAINT fk_sample_receipt_photo FOREIGN KEY (sample_id) REFERENCES public.sample_receipt_register(sample_id) ON DELETE CASCADE;


--
-- Name: lab_document_services lab_document_services_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.lab_document_services
    ADD CONSTRAINT lab_document_services_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(lab_id) ON DELETE CASCADE;


--
-- Name: material_categories material_categories_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_categories
    ADD CONSTRAINT material_categories_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(lab_id) ON DELETE CASCADE;


--
-- Name: material_types material_types_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_types
    ADD CONSTRAINT material_types_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(lab_id) ON DELETE CASCADE;


--
-- Name: material_types material_types_material_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.material_types
    ADD CONSTRAINT material_types_material_category_id_fkey FOREIGN KEY (material_category_id) REFERENCES public.material_categories(material_category_id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: project_documents project_documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: project_documents project_documents_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON DELETE CASCADE;


--
-- Name: project_documents project_documents_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: project_registration project_registration_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_registration
    ADD CONSTRAINT project_registration_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON DELETE CASCADE;


--
-- Name: project_scope_tests project_scope_tests_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_scope_tests
    ADD CONSTRAINT project_scope_tests_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.scope_groups(group_id) ON DELETE CASCADE;


--
-- Name: project_scope_tests project_scope_tests_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_scope_tests
    ADD CONSTRAINT project_scope_tests_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(lab_id) ON DELETE CASCADE;


--
-- Name: project_scope_tests project_scope_tests_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_scope_tests
    ADD CONSTRAINT project_scope_tests_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.scope_materials(material_id) ON DELETE CASCADE;


--
-- Name: project_scope_tests project_scope_tests_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_scope_tests
    ADD CONSTRAINT project_scope_tests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON DELETE CASCADE;


--
-- Name: project_scope_tests project_scope_tests_scope_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_scope_tests
    ADD CONSTRAINT project_scope_tests_scope_test_id_fkey FOREIGN KEY (scope_test_id) REFERENCES public.scope_tests(scope_test_id) ON DELETE CASCADE;


--
-- Name: project_status_history project_status_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_status_history
    ADD CONSTRAINT project_status_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: project_status_history project_status_history_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_status_history
    ADD CONSTRAINT project_status_history_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(lab_id) ON DELETE CASCADE;


--
-- Name: project_status_history project_status_history_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.project_status_history
    ADD CONSTRAINT project_status_history_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON DELETE CASCADE;


--
-- Name: projects projects_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(client_id) ON DELETE SET NULL;


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id);


--
-- Name: projects projects_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(lab_id) ON DELETE CASCADE;


--
-- Name: projects projects_request_collected_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_request_collected_by_fkey FOREIGN KEY (request_collected_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: projects projects_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: projects projects_test_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_test_assigned_to_fkey FOREIGN KEY (test_assigned_to) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: projects projects_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id);


--
-- Name: refresh_tokens refresh_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.refresh_tokens
    ADD CONSTRAINT refresh_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: report_extra_fields report_extra_fields_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_extra_fields
    ADD CONSTRAINT report_extra_fields_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(report_id) ON DELETE CASCADE;


--
-- Name: report_scope_results report_scope_results_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_scope_results
    ADD CONSTRAINT report_scope_results_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.scope_groups(group_id) ON DELETE CASCADE;


--
-- Name: report_scope_results report_scope_results_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_scope_results
    ADD CONSTRAINT report_scope_results_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.scope_materials(material_id) ON DELETE CASCADE;


--
-- Name: report_scope_results report_scope_results_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_scope_results
    ADD CONSTRAINT report_scope_results_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(report_id) ON DELETE CASCADE;


--
-- Name: report_scope_results report_scope_results_scope_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_scope_results
    ADD CONSTRAINT report_scope_results_scope_test_id_fkey FOREIGN KEY (scope_test_id) REFERENCES public.scope_tests(scope_test_id) ON DELETE CASCADE;


--
-- Name: report_status_history report_status_history_action_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_status_history
    ADD CONSTRAINT report_status_history_action_by_fkey FOREIGN KEY (action_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: report_status_history report_status_history_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_status_history
    ADD CONSTRAINT report_status_history_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(report_id) ON DELETE CASCADE;


--
-- Name: report_test_results report_test_results_project_scope_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_test_results
    ADD CONSTRAINT report_test_results_project_scope_test_id_fkey FOREIGN KEY (project_scope_test_id) REFERENCES public.project_scope_tests(project_scope_test_id) ON DELETE SET NULL;


--
-- Name: report_test_results report_test_results_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_test_results
    ADD CONSTRAINT report_test_results_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.reports(report_id) ON DELETE CASCADE;


--
-- Name: report_test_results report_test_results_sample_test_result_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_test_results
    ADD CONSTRAINT report_test_results_sample_test_result_id_fkey FOREIGN KEY (sample_test_result_id) REFERENCES public.sample_test_results(sample_test_result_id) ON DELETE SET NULL;


--
-- Name: report_test_results report_test_results_scope_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.report_test_results
    ADD CONSTRAINT report_test_results_scope_test_id_fkey FOREIGN KEY (scope_test_id) REFERENCES public.scope_tests(scope_test_id) ON DELETE SET NULL;


--
-- Name: reports reports_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: reports reports_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: reports reports_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(lab_id) ON DELETE CASCADE;


--
-- Name: reports reports_prepared_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_prepared_by_fkey FOREIGN KEY (prepared_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: reports reports_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON DELETE CASCADE;


--
-- Name: reports reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: reports reports_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: sample_conditions sample_conditions_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_conditions
    ADD CONSTRAINT sample_conditions_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(lab_id) ON DELETE CASCADE;


--
-- Name: sample_entries_audit sample_entries_audit_action_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_entries_audit
    ADD CONSTRAINT sample_entries_audit_action_by_fkey FOREIGN KEY (action_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: sample_grades sample_grades_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_grades
    ADD CONSTRAINT sample_grades_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(lab_id) ON DELETE CASCADE;


--
-- Name: sample_locations sample_locations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_locations
    ADD CONSTRAINT sample_locations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: sample_locations sample_locations_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_locations
    ADD CONSTRAINT sample_locations_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(lab_id) ON DELETE CASCADE;


--
-- Name: sample_locations sample_locations_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_locations
    ADD CONSTRAINT sample_locations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: sample_test_assignment_history sample_test_assignment_history_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_test_assignment_history
    ADD CONSTRAINT sample_test_assignment_history_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.sample_test_assignments(assignment_id) ON DELETE CASCADE;


--
-- Name: sample_test_assignment_history sample_test_assignment_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_test_assignment_history
    ADD CONSTRAINT sample_test_assignment_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: sample_test_assignments sample_test_assignments_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_test_assignments
    ADD CONSTRAINT sample_test_assignments_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: sample_test_assignments sample_test_assignments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_test_assignments
    ADD CONSTRAINT sample_test_assignments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: sample_test_assignments sample_test_assignments_sample_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_test_assignments
    ADD CONSTRAINT sample_test_assignments_sample_id_fkey FOREIGN KEY (sample_id) REFERENCES public.sample_receipt_register(sample_id) ON DELETE CASCADE;


--
-- Name: sample_test_assignments sample_test_assignments_scope_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_test_assignments
    ADD CONSTRAINT sample_test_assignments_scope_test_id_fkey FOREIGN KEY (scope_test_id) REFERENCES public.project_scope_tests(project_scope_test_id) ON DELETE CASCADE;


--
-- Name: sample_test_results sample_test_results_entered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_test_results
    ADD CONSTRAINT sample_test_results_entered_by_fkey FOREIGN KEY (entered_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: sample_test_results sample_test_results_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_test_results
    ADD CONSTRAINT sample_test_results_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(lab_id) ON DELETE CASCADE;


--
-- Name: sample_test_results sample_test_results_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_test_results
    ADD CONSTRAINT sample_test_results_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(project_id) ON DELETE CASCADE;


--
-- Name: sample_test_results sample_test_results_project_scope_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_test_results
    ADD CONSTRAINT sample_test_results_project_scope_test_id_fkey FOREIGN KEY (project_scope_test_id) REFERENCES public.project_scope_tests(project_scope_test_id) ON DELETE SET NULL;


--
-- Name: sample_test_results sample_test_results_scope_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_test_results
    ADD CONSTRAINT sample_test_results_scope_test_id_fkey FOREIGN KEY (scope_test_id) REFERENCES public.scope_tests(scope_test_id) ON DELETE SET NULL;


--
-- Name: sample_test_results sample_test_results_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_test_results
    ADD CONSTRAINT sample_test_results_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: sample_type_tests sample_type_tests_default_testing_day_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_type_tests
    ADD CONSTRAINT sample_type_tests_default_testing_day_id_fkey FOREIGN KEY (default_testing_day_id) REFERENCES public.testing_days(testing_day_id) ON DELETE SET NULL;


--
-- Name: sample_type_tests sample_type_tests_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sample_type_tests
    ADD CONSTRAINT sample_type_tests_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(lab_id) ON DELETE CASCADE;


--
-- Name: scope_groups scope_groups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_groups
    ADD CONSTRAINT scope_groups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: scope_groups scope_groups_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_groups
    ADD CONSTRAINT scope_groups_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(lab_id) ON DELETE CASCADE;


--
-- Name: scope_groups scope_groups_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_groups
    ADD CONSTRAINT scope_groups_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: scope_materials scope_materials_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_materials
    ADD CONSTRAINT scope_materials_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: scope_materials scope_materials_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_materials
    ADD CONSTRAINT scope_materials_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.scope_groups(group_id) ON DELETE CASCADE;


--
-- Name: scope_materials scope_materials_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_materials
    ADD CONSTRAINT scope_materials_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(lab_id) ON DELETE CASCADE;


--
-- Name: scope_materials scope_materials_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_materials
    ADD CONSTRAINT scope_materials_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: scope_tests scope_tests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_tests
    ADD CONSTRAINT scope_tests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: scope_tests scope_tests_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_tests
    ADD CONSTRAINT scope_tests_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.scope_groups(group_id) ON DELETE CASCADE;


--
-- Name: scope_tests scope_tests_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_tests
    ADD CONSTRAINT scope_tests_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(lab_id) ON DELETE CASCADE;


--
-- Name: scope_tests scope_tests_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_tests
    ADD CONSTRAINT scope_tests_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.scope_materials(material_id) ON DELETE CASCADE;


--
-- Name: scope_tests scope_tests_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scope_tests
    ADD CONSTRAINT scope_tests_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(user_id) ON DELETE SET NULL;


--
-- Name: testing_days testing_days_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.testing_days
    ADD CONSTRAINT testing_days_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(lab_id) ON DELETE CASCADE;


--
-- Name: user_verifications user_verifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_verifications
    ADD CONSTRAINT user_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE;


--
-- Name: users users_lab_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_lab_id_fkey FOREIGN KEY (lab_id) REFERENCES public.labs(lab_id) ON DELETE CASCADE;


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(role_id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict 9crKevkgRTFbBbRM9bIYWEd7Ia6v0mjuO7VEOuSORxU0Cgdx4kWM4u3KddxtGmx

