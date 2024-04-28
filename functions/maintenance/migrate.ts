import type { WorkerEnv } from "@lib/env";

const stmts = [
  `create table if not exists chat_config (
    chat chat_id not null,
    language text not null default '',
    value json not null,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp,
    primary key (chat, language)) without rowid;`,
  `create table if not exists user_private_chat (
    user user_id not null,
    private_chat chat_id not null,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp,
    primary key (user)) without rowid;`,
  `create table if not exists chat_admin (
    chat chat_id not null,
    user user_id not null,
    created_at timestamp not null default current_timestamp,
    primary key (chat, user)) without rowid;`,
  `create table if not exists chat_info (
    chat chat_id not null,
    info json not null,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp,
    primary key (chat)) without rowid;`,
  `create index if not exists chat_admin_index_user on chat_admin (user);`,
  `create table if not exists form (
    chat chat_id not null,
    language text not null default '',
    id nanoid not null,
    enabled boolean not null default false,
    content json not null,
    deleted_at timestamp,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp,
    primary key (chat, language, id)) without rowid;`,
  `create unique index if not exists form_index_enabled on form (chat, language) where enabled and deleted_at is null;`,
  `create index if not exists form_index_alive on form (chat, language, id) where deleted_at is null;`,
  `create table if not exists session (
    chat chat_id not null,
    user user_id not null,
    user_info json not null,
    user_chat_info json,
    nonce nanoid not null,
    welcome_message int,
    form json,
    answer json,
    created_at timestamp not null default current_timestamp,
    updated_at timestamp not null default current_timestamp,
    primary key (chat, user)) without rowid;`,
  `create unique index if not exists session_nonce on session (nonce);`,
  `create table if not exists audit (
    chat chat_id not null,
    id nanoid not null,
    user user_id not null,
    action json not null,
    created_at timestamp not null default current_timestamp,
    primary key (chat, id)) without rowid;`,
  `create trigger if not exists trigger_audit_block_update before update on audit begin
    select raise(fail, 'update audit is not possible'); end;`,
  `create trigger if not exists trigger_audit_check_admin before insert on audit
    when (not exists (select 1 from chat_admin where chat = new.chat and user = new.user)) begin
    select raise(fail, 'permission denied'); end;`,
  `create trigger if not exists trigger_audit_chat_config_update before insert on audit
    when (new.action ->> 'type' = 'chat_config_update') begin
    insert into chat_config (chat, language, value) values (new.chat, coalesce(new.action ->> 'language', ''), new.action -> 'value')
      on conflict (chat, language) do update set value = json_patch(value, excluded.value), updated_at = new.created_at; end;`,
  `create trigger if not exists trigger_audit_chat_config_reset before insert on audit
    when (new.action ->> 'type' = 'chat_config_reset') begin
    delete from chat_config where chat = new.chat and language = coalesce(new.action ->> 'language', ''); end;`,
  `create trigger if not exists trigger_audit_drop_language before insert on audit
    when (new.action ->> 'type' = 'drop_language') begin
    delete from chat_config where chat = new.chat and language = new.action ->> 'language';
    delete from form where chat = new.chat and language = new.action ->> 'language'; end;`,
  `create trigger if not exists trigger_audit_form_enable before insert on audit
    when (new.action ->> 'type' = 'form_enable') begin
    update form set enabled = false where chat = new.chat and language = coalesce(new.action ->> 'language', '') and id != new.action ->> 'id' and deleted_at is null;
    update form set enabled = true where chat = new.chat and language = coalesce(new.action ->> 'language', '') and id = new.action ->> 'id' and deleted_at is null; end;`,
  `create trigger if not exists trigger_audit_form_update before insert on audit
    when (new.action ->> 'type' = 'form_update') begin
    insert into form (chat, language, id, content, enabled) values (
      new.chat,
      coalesce(new.action ->> 'language', ''),
      new.action ->> 'id',
      new.action -> 'content',
      not exists (select 1 from form where chat = new.chat and enabled and deleted_at is null)
    ) on conflict (chat, language, id) do update set content = excluded.content, updated_at = new.created_at; end;`,
  `create trigger if not exists trigger_audit_form_delete before insert on audit
    when (new.action ->> 'type' = 'form_delete') begin
    update form set deleted_at = new.created_at, enabled = false where chat = new.chat and language = coalesce(new.action ->> 'language', '') and id = new.action ->> 'id'; end;`,
  `create trigger if not exists trigger_audit_form_recover before insert on audit
    when (new.action ->> 'type' = 'form_recover') begin
    update form set deleted_at = null where chat = new.chat and language = coalesce(new.action ->> 'language', '') and id = new.action ->> 'id'; end;`,
  `create trigger if not exists trigger_audio_form_delete_forever before insert on audit
    when (new.action ->> 'type' = 'form_delete_forever') begin
    delete from form where chat = new.chat and language = coalesce(new.action ->> 'language', '') and id = new.action ->> 'id' and deleted_at is not null; end;`,
];

export const onRequestPost: PagesFunction<WorkerEnv> = async ({ env }) => {
  const response = await env.DB.batch(
    stmts.map((stmt) => env.DB.prepare(stmt))
  );
  return new Response(JSON.stringify(response), {
    headers: { "Content-Type": "application/json" },
  });
};
