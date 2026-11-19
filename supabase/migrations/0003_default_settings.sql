-- Dates and gates (docs/BUILD_PLAN.md, section 7). Editable later in /admin/settings.
insert into public.app_settings (key, value) values
  ('careers_write_open',          'false'),
  ('careers_read_open',           'false'),
  ('yl_read_open',                'false'),
  ('min_reviews_to_open_course',  '0'),
  ('bid_term_label',              '"Term 7"'),
  ('bid_window',                  '{"start": "2027-01-04", "end": "2027-01-10"}'),
  ('post_bid_survey_window',      '{"start": "2027-01-11", "end": "2027-01-17"}'),
  ('career_followup_days',        '14'),
  ('career_followup_deadline',    '"2027-01-24"'),
  ('allowed_reader_domains',      '["isb.edu"]')
on conflict (key) do nothing;
