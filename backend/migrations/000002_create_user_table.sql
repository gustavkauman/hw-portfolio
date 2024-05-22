create table users (
    id uuid primary key default gen_random_uuid(),
    email varchar(250) not null,
    name varchar(250) not null,
    password_hash varchar(60) not null,
    created_at timestamptz default current_timestamp not null,
    modified_at timestamptz default current_timestamp not null,
    unique(email)
);

create function update_users_modified_at()
returns trigger as $$
begin
    NEW.modified_at = now();
    return NEW;
end;
$$ language 'plpgsql';

create trigger users_mod_datetime
    before update on users
    for each row
    execute procedure update_users_modified_at();
