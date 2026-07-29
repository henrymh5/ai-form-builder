-- Extensions and enum types shared across the schema (plan §6 migration order 1/10).
create extension if not exists "pgcrypto";

create type workspace_role as enum ('owner', 'editor', 'viewer');

create type form_status as enum ('draft', 'published', 'paused', 'archived');

create type form_session_status as enum ('started', 'completed', 'abandoned');

create type response_status as enum ('completed', 'test', 'spam', 'archived');

create type form_event_type as enum (
  'view',
  'start',
  'page_view',
  'field_interaction',
  'submit_attempt',
  'submit',
  'abandon'
);
