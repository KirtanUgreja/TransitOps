-- GENERATED reference dump of the schema SQLAlchemy create_all() builds.
-- Source of truth is backend/app/models.py; regenerate with:
--   docker exec transitops-db pg_dump -U transitops --schema-only --no-owner --no-privileges transitops > database/schema.sql
--
-- PostgreSQL database dump
--

\restrict fI6tQyMZgTy1U9nzMocyUMwSzyaXhGjALphKZ0QGwfvTk24hxJFcVpbuaz1cPAp

-- Dumped from database version 16.14
-- Dumped by pg_dump version 16.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: drivers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.drivers (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    license_no character varying(50) NOT NULL,
    license_category character varying(20) NOT NULL,
    license_expiry date NOT NULL,
    contact character varying(30) NOT NULL,
    safety_score double precision NOT NULL,
    trips_completed integer NOT NULL,
    status character varying(20) NOT NULL
);


--
-- Name: drivers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.drivers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: drivers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.drivers_id_seq OWNED BY public.drivers.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    vehicle_id integer NOT NULL,
    trip_id integer,
    type character varying(20) NOT NULL,
    amount double precision NOT NULL,
    date date NOT NULL
);


--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: fuel_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fuel_logs (
    id integer NOT NULL,
    vehicle_id integer NOT NULL,
    trip_id integer,
    liters double precision NOT NULL,
    cost double precision NOT NULL,
    date date NOT NULL
);


--
-- Name: fuel_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fuel_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fuel_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fuel_logs_id_seq OWNED BY public.fuel_logs.id;


--
-- Name: maintenance_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.maintenance_logs (
    id integer NOT NULL,
    vehicle_id integer NOT NULL,
    service_type character varying(100) NOT NULL,
    cost double precision NOT NULL,
    date date NOT NULL,
    status character varying(20) NOT NULL
);


--
-- Name: maintenance_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.maintenance_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: maintenance_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.maintenance_logs_id_seq OWNED BY public.maintenance_logs.id;


--
-- Name: trips; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trips (
    id integer NOT NULL,
    source character varying(200) NOT NULL,
    destination character varying(200) NOT NULL,
    vehicle_id integer,
    driver_id integer,
    cargo_weight_kg double precision NOT NULL,
    planned_distance_km double precision NOT NULL,
    revenue double precision NOT NULL,
    status character varying(20) NOT NULL,
    end_odometer_km double precision,
    fuel_consumed_l double precision,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    dispatched_at timestamp without time zone,
    completed_at timestamp without time zone
);


--
-- Name: trips_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.trips_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: trips_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.trips_id_seq OWNED BY public.trips.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(200) NOT NULL,
    password_hash character varying(200) NOT NULL,
    role character varying(50) NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id integer NOT NULL,
    registration_no character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    max_capacity_kg double precision NOT NULL,
    odometer_km double precision NOT NULL,
    acquisition_cost double precision NOT NULL,
    region character varying(100) NOT NULL,
    status character varying(20) NOT NULL
);


--
-- Name: vehicles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vehicles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vehicles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vehicles_id_seq OWNED BY public.vehicles.id;


--
-- Name: drivers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers ALTER COLUMN id SET DEFAULT nextval('public.drivers_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: fuel_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fuel_logs ALTER COLUMN id SET DEFAULT nextval('public.fuel_logs_id_seq'::regclass);


--
-- Name: maintenance_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_logs ALTER COLUMN id SET DEFAULT nextval('public.maintenance_logs_id_seq'::regclass);


--
-- Name: trips id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips ALTER COLUMN id SET DEFAULT nextval('public.trips_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vehicles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles ALTER COLUMN id SET DEFAULT nextval('public.vehicles_id_seq'::regclass);


--
-- Name: drivers drivers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.drivers
    ADD CONSTRAINT drivers_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: fuel_logs fuel_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fuel_logs
    ADD CONSTRAINT fuel_logs_pkey PRIMARY KEY (id);


--
-- Name: maintenance_logs maintenance_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_logs
    ADD CONSTRAINT maintenance_logs_pkey PRIMARY KEY (id);


--
-- Name: trips trips_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: ix_drivers_license_no; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_drivers_license_no ON public.drivers USING btree (license_no);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_vehicles_registration_no; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_vehicles_registration_no ON public.vehicles USING btree (registration_no);


--
-- Name: expenses expenses_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id);


--
-- Name: expenses expenses_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: fuel_logs fuel_logs_trip_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fuel_logs
    ADD CONSTRAINT fuel_logs_trip_id_fkey FOREIGN KEY (trip_id) REFERENCES public.trips(id);


--
-- Name: fuel_logs fuel_logs_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fuel_logs
    ADD CONSTRAINT fuel_logs_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: maintenance_logs maintenance_logs_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.maintenance_logs
    ADD CONSTRAINT maintenance_logs_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: trips trips_driver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_driver_id_fkey FOREIGN KEY (driver_id) REFERENCES public.drivers(id);


--
-- Name: trips trips_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trips
    ADD CONSTRAINT trips_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- PostgreSQL database dump complete
--

\unrestrict fI6tQyMZgTy1U9nzMocyUMwSzyaXhGjALphKZ0QGwfvTk24hxJFcVpbuaz1cPAp

