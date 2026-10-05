alter table elme_activities add column if not exists remind_after integer;
alter table elme_activities add column if not exists remind_period text;
alter table elme_entries add column if not exists label_ids text;

create table if not exists elme_labels (
  id text primary key,
  user_id text not null,
  category_id text not null,
  name text not null,
  position integer not null default 0
);

create index if not exists elme_labels_user_idx on elme_labels (user_id);
