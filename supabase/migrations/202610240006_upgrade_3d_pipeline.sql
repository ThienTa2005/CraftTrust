-- Migration: 202610240006_upgrade_3d_pipeline.sql
-- Hanoi CraftTrust Hybrid 3D Pipeline Upgrade
-- Expands back_texture check constraint to allow multi-view observed textures.

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_back_texture_check;
ALTER TABLE public.products ADD CONSTRAINT products_back_texture_check
  CHECK (back_texture IN ('mirror', 'plain', 'multiview', 'observed_multiview'));
