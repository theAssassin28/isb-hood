-- Development seed only: five made-up courses with offerings.
-- Real courses and offerings are loaded through the admin CSV import (M2).
-- Run in the Supabase SQL editor of a dev project, never production.

insert into public.courses (code, title, area) values
  ('DEMO-101', 'Demo: Pricing Strategy',            'Marketing'),
  ('DEMO-102', 'Demo: Corporate Valuation',         'Finance'),
  ('DEMO-103', 'Demo: Product Management',          'Strategy'),
  ('DEMO-104', 'Demo: Negotiation Analysis',        'Organisational Behaviour'),
  ('DEMO-105', 'Demo: Data Science for Managers',   'Operations')
on conflict (code) do nothing;

-- Last year's offering for each course, plus this year's current one.
-- DEMO-102 changes professor, to exercise the "New or changed course" banner.
insert into public.offerings (course_id, professor, term_label, cohort_year, is_current)
select c.id, v.professor, v.term_label, v.cohort_year, v.is_current
from (values
  ('DEMO-101', 'Prof Demo A', 'Term 7', 'Co''26', false),
  ('DEMO-101', 'Prof Demo A', 'Term 7', 'Co''27', true),
  ('DEMO-102', 'Prof Demo B', 'Term 7', 'Co''26', false),
  ('DEMO-102', 'Prof Demo C', 'Term 7', 'Co''27', true),
  ('DEMO-103', 'Prof Demo D', 'Term 6', 'Co''26', false),
  ('DEMO-103', 'Prof Demo D', 'Term 7', 'Co''27', true),
  ('DEMO-104', 'Prof Demo E', 'Term 5', 'Co''27', true),
  ('DEMO-105', 'Prof Demo F', 'Term 7', 'Co''27', true)
) as v (code, professor, term_label, cohort_year, is_current)
join public.courses c on c.code = v.code
where not exists (
  select 1 from public.offerings o
  where o.course_id = c.id and o.cohort_year = v.cohort_year and o.term_label = v.term_label
);
