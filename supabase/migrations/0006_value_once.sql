-- M3: `value_reached` fires once per user per module (docs/BUILD_PLAN.md 6.4).
-- Enforced here rather than in app code, so two tabs opened at once cannot
-- record it twice. The app treats the resulting unique violation as "already
-- recorded".
create unique index events_value_reached_once
  on public.events (user_id, (props ->> 'module'))
  where name = 'value_reached';
