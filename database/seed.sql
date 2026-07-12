-- GENERATED reference dump of the demo data backend/app/seed.py inserts.
-- Source of truth is seed.py (idempotent); regenerate with:
--   docker exec transitops-db pg_dump -U transitops --data-only --no-owner --no-privileges --column-inserts transitops > database/seed.sql
--
-- PostgreSQL database dump
--

\restrict Y6g0TyumzaAwjP03f6L9UsjcMMOaeBhdXIAHeOjryhQucyq4lcgku03BQ8dLisG

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

--
-- Data for Name: drivers; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.drivers (id, name, license_no, license_category, license_expiry, contact, safety_score, trips_completed, status) VALUES (1, 'Alex', 'DL-88213', 'LMV', '2028-12-31', '9876500001', 96, 42, 'Available');
INSERT INTO public.drivers (id, name, license_no, license_category, license_expiry, contact, safety_score, trips_completed, status) VALUES (2, 'John', 'DL-44120', 'HMV', '2025-03-31', '9822000002', 81, 25, 'Suspended');
INSERT INTO public.drivers (id, name, license_no, license_category, license_expiry, contact, safety_score, trips_completed, status) VALUES (3, 'Priya', 'DL-77031', 'LMV', '2027-08-31', '9911000003', 99, 58, 'On Trip');
INSERT INTO public.drivers (id, name, license_no, license_category, license_expiry, contact, safety_score, trips_completed, status) VALUES (4, 'Suresh', 'DL-90045', 'HMV', '2027-01-31', '9744000004', 88, 33, 'On Trip');
INSERT INTO public.drivers (id, name, license_no, license_category, license_expiry, contact, safety_score, trips_completed, status) VALUES (5, 'Meena', 'DL-11208', 'LMV', '2029-05-31', '9855000005', 93, 17, 'Available');
INSERT INTO public.drivers (id, name, license_no, license_category, license_expiry, contact, safety_score, trips_completed, status) VALUES (6, 'Ravi', 'DL-33967', 'HMV', '2026-11-30', '9633000006', 85, 21, 'Off Duty');


--
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.vehicles (id, registration_no, name, type, max_capacity_kg, odometer_km, acquisition_cost, region, status) VALUES (1, 'GJ01AB4521', 'VAN-05', 'Van', 500, 74000, 620000, 'Gandhinagar', 'Available');
INSERT INTO public.vehicles (id, registration_no, name, type, max_capacity_kg, odometer_km, acquisition_cost, region, status) VALUES (2, 'GJ01AB9981', 'TRUCK-11', 'Truck', 5000, 182000, 2450000, 'Ahmedabad', 'On Trip');
INSERT INTO public.vehicles (id, registration_no, name, type, max_capacity_kg, odometer_km, acquisition_cost, region, status) VALUES (3, 'GJ01AB1120', 'MINI-03', 'Mini', 1000, 66000, 410000, 'Gandhinagar', 'In Shop');
INSERT INTO public.vehicles (id, registration_no, name, type, max_capacity_kg, odometer_km, acquisition_cost, region, status) VALUES (4, 'GJ01AB0087', 'VAN-09', 'Van', 750, 241900, 590000, 'Ahmedabad', 'Retired');
INSERT INTO public.vehicles (id, registration_no, name, type, max_capacity_kg, odometer_km, acquisition_cost, region, status) VALUES (5, 'GJ05CD1102', 'TRUCK-04', 'Truck', 4000, 98000, 2100000, 'Sanand', 'On Trip');
INSERT INTO public.vehicles (id, registration_no, name, type, max_capacity_kg, odometer_km, acquisition_cost, region, status) VALUES (6, 'GJ05CD2210', 'TRK-12', 'Truck', 6000, 143000, 2900000, 'Sanand', 'Available');
INSERT INTO public.vehicles (id, registration_no, name, type, max_capacity_kg, odometer_km, acquisition_cost, region, status) VALUES (7, 'GJ18EF3301', 'MINI-08', 'Mini', 900, 31000, 380000, 'Kalol', 'Available');
INSERT INTO public.vehicles (id, registration_no, name, type, max_capacity_kg, odometer_km, acquisition_cost, region, status) VALUES (8, 'GJ18EF4419', 'VAN-02', 'Van', 600, 52000, 540000, 'Gandhinagar', 'Available');
INSERT INTO public.vehicles (id, registration_no, name, type, max_capacity_kg, odometer_km, acquisition_cost, region, status) VALUES (9, 'GJ01GH5527', 'TRUCK-07', 'Truck', 4500, 120500, 2300000, 'Ahmedabad', 'Available');
INSERT INTO public.vehicles (id, registration_no, name, type, max_capacity_kg, odometer_km, acquisition_cost, region, status) VALUES (10, 'GJ01GH6635', 'MINI-01', 'Mini', 800, 88000, 350000, 'Kalol', 'Available');


--
-- Data for Name: trips; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.trips (id, source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km, revenue, status, end_odometer_km, fuel_consumed_l, created_at, dispatched_at, completed_at) VALUES (1, 'Gandhinagar Depot', 'Ahmedabad Hub', 2, 3, 3200, 38, 0, 'Dispatched', NULL, NULL, '2026-07-12 04:23:24.919701', '2026-07-12 08:53:25.122167', NULL);
INSERT INTO public.trips (id, source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km, revenue, status, end_odometer_km, fuel_consumed_l, created_at, dispatched_at, completed_at) VALUES (2, 'Vatva Industrial Area', 'Sanand Warehouse', 6, 1, 4100, 52, 48000, 'Completed', 143000, 110, '2026-07-12 04:23:24.919701', '2026-07-06 04:53:25.122167', '2026-07-06 09:53:25.122167');
INSERT INTO public.trips (id, source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km, revenue, status, end_odometer_km, fuel_consumed_l, created_at, dispatched_at, completed_at) VALUES (3, 'Kalol Depot', 'Mansa', 7, 5, 600, 27, 9500, 'Completed', 31000, 28, '2026-07-12 04:23:24.919701', '2026-07-07 05:53:25.122167', '2026-07-07 09:53:25.122167');
INSERT INTO public.trips (id, source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km, revenue, status, end_odometer_km, fuel_consumed_l, created_at, dispatched_at, completed_at) VALUES (4, 'Ahmedabad Hub', 'Vatva Industrial Area', 5, 4, 2800, 22, 0, 'Dispatched', NULL, NULL, '2026-07-12 04:23:24.919701', '2026-07-12 07:53:25.122167', NULL);
INSERT INTO public.trips (id, source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km, revenue, status, end_odometer_km, fuel_consumed_l, created_at, dispatched_at, completed_at) VALUES (5, 'Mansa', 'Kalol Depot', NULL, NULL, 450, 18, 0, 'Cancelled', NULL, NULL, '2026-07-12 04:23:24.919701', NULL, NULL);
INSERT INTO public.trips (id, source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km, revenue, status, end_odometer_km, fuel_consumed_l, created_at, dispatched_at, completed_at) VALUES (6, 'Sanand Warehouse', 'Gandhinagar Depot', NULL, NULL, 700, 44, 0, 'Draft', NULL, NULL, '2026-07-12 04:23:24.919701', NULL, NULL);
INSERT INTO public.trips (id, source, destination, vehicle_id, driver_id, cargo_weight_kg, planned_distance_km, revenue, status, end_odometer_km, fuel_consumed_l, created_at, dispatched_at, completed_at) VALUES (7, 'Gandhinagar Depot', 'Kalol Depot', 8, 1, 380, 25, 6800, 'Completed', 52000, 9, '2026-07-12 04:23:24.919701', '2026-07-10 06:53:25.122167', '2026-07-10 09:53:25.122167');


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.expenses (id, vehicle_id, trip_id, type, amount, date) VALUES (1, 2, 1, 'Toll', 120, '2026-07-12');
INSERT INTO public.expenses (id, vehicle_id, trip_id, type, amount, date) VALUES (2, 6, 2, 'Toll', 340, '2026-07-06');
INSERT INTO public.expenses (id, vehicle_id, trip_id, type, amount, date) VALUES (3, 6, 2, 'Misc', 150, '2026-07-06');
INSERT INTO public.expenses (id, vehicle_id, trip_id, type, amount, date) VALUES (4, 7, 3, 'Toll', 80, '2026-07-07');


--
-- Data for Name: fuel_logs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.fuel_logs (id, vehicle_id, trip_id, liters, cost, date) VALUES (1, 1, NULL, 42, 3150, '2026-07-05');
INSERT INTO public.fuel_logs (id, vehicle_id, trip_id, liters, cost, date) VALUES (2, 6, 2, 110, 8400, '2026-07-06');
INSERT INTO public.fuel_logs (id, vehicle_id, trip_id, liters, cost, date) VALUES (3, 7, 3, 28, 2050, '2026-07-07');
INSERT INTO public.fuel_logs (id, vehicle_id, trip_id, liters, cost, date) VALUES (4, 8, 7, 9, 720, '2026-07-10');
INSERT INTO public.fuel_logs (id, vehicle_id, trip_id, liters, cost, date) VALUES (5, 5, NULL, 95, 7300, '2026-07-09');


--
-- Data for Name: maintenance_logs; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.maintenance_logs (id, vehicle_id, service_type, cost, date, status) VALUES (1, 1, 'Oil Change', 2500, '2026-07-07', 'Completed');
INSERT INTO public.maintenance_logs (id, vehicle_id, service_type, cost, date, status) VALUES (2, 2, 'Engine Repair', 18000, '2026-06-22', 'Completed');
INSERT INTO public.maintenance_logs (id, vehicle_id, service_type, cost, date, status) VALUES (3, 3, 'Tyre Replace', 6200, '2026-07-11', 'Active');


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.users (id, name, email, password_hash, role) VALUES (1, 'Meera F.', 'fleet@transitops.in', '$2b$12$QZtaGn65QXCiougZHhbrreE1imJ7poHM7u7snnZZDH.QemcRTLrcK', 'fleet_manager');
INSERT INTO public.users (id, name, email, password_hash, role) VALUES (2, 'Raven K.', 'dispatch@transitops.in', '$2b$12$QZtaGn65QXCiougZHhbrreE1imJ7poHM7u7snnZZDH.QemcRTLrcK', 'dispatcher');
INSERT INTO public.users (id, name, email, password_hash, role) VALUES (3, 'Sana S.', 'safety@transitops.in', '$2b$12$QZtaGn65QXCiougZHhbrreE1imJ7poHM7u7snnZZDH.QemcRTLrcK', 'safety_officer');
INSERT INTO public.users (id, name, email, password_hash, role) VALUES (4, 'Farid A.', 'finance@transitops.in', '$2b$12$QZtaGn65QXCiougZHhbrreE1imJ7poHM7u7snnZZDH.QemcRTLrcK', 'financial_analyst');


--
-- Name: drivers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.drivers_id_seq', 6, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.expenses_id_seq', 4, true);


--
-- Name: fuel_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.fuel_logs_id_seq', 5, true);


--
-- Name: maintenance_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.maintenance_logs_id_seq', 3, true);


--
-- Name: trips_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.trips_id_seq', 7, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.users_id_seq', 4, true);


--
-- Name: vehicles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public.vehicles_id_seq', 10, true);


--
-- PostgreSQL database dump complete
--

\unrestrict Y6g0TyumzaAwjP03f6L9UsjcMMOaeBhdXIAHeOjryhQucyq4lcgku03BQ8dLisG

