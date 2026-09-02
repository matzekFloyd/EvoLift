create table if not exists "public"."user_api_tokens" (
  "id" uuid default gen_random_uuid() not null,
  "user_id" uuid not null,
  "name" text not null,
  "token_prefix" text not null,
  "token_hash" text not null,
  "created_at" timestamp with time zone default now() not null,
  "last_used_at" timestamp with time zone,
  "revoked_at" timestamp with time zone,
  constraint "user_api_tokens_pkey" primary key ("id"),
  constraint "user_api_tokens_name_nonempty_chk"
    check (length(trim(both from "name")) > 0),
  constraint "user_api_tokens_name_len_chk"
    check (char_length("name") <= 40),
  constraint "user_api_tokens_prefix_len_chk"
    check (char_length("token_prefix") between 8 and 16),
  constraint "user_api_tokens_hash_sha256_chk"
    check ("token_hash" ~ '^[0-9a-f]{64}$')
);

alter table "public"."user_api_tokens"
  add constraint "user_api_tokens_user_id_fkey"
  foreign key ("user_id") references "public"."app_users"("id") on delete cascade;

create unique index "user_api_tokens_token_hash_uidx"
  on "public"."user_api_tokens" using btree ("token_hash");

create index "idx_user_api_tokens_user"
  on "public"."user_api_tokens" using btree ("user_id");

alter table "public"."user_api_tokens" enable row level security;

create policy "user_api_tokens_owner_all"
on "public"."user_api_tokens"
to "authenticated"
using (("user_id" = "auth"."uid"()))
with check (("user_id" = "auth"."uid"()));

grant all on table "public"."user_api_tokens" to "anon";
grant all on table "public"."user_api_tokens" to "authenticated";
grant all on table "public"."user_api_tokens" to "service_role";
