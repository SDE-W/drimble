ALTER TABLE deployments
  ADD CONSTRAINT deployments_name_unique UNIQUE (name);
 