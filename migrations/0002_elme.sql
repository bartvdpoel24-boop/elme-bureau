create table if not exists elme_categories (
  id text primary key,
  user_id text not null,
  name text not null,
  color text not null,
  position integer not null default 0
);

create index if not exists elme_categories_user_idx on elme_categories (user_id);

create table if not exists elme_activities (
  id text primary key,
  user_id text not null,
  category_id text not null,
  name text not null,
  color text not null,
  position integer not null default 0
);

create index if not exists elme_activities_user_idx on elme_activities (user_id);

create table if not exists elme_entries (
  id text primary key,
  user_id text not null,
  activity_id text not null,
  day date not null,
  count integer not null check (count > 0)
);

create index if not exists elme_entries_user_day_idx on elme_entries (user_id, day);
