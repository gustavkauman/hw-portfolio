create table devices (
    id uuid primary key default gen_random_uuid(),
    name varchar(250) not null,
    owner uuid not null,
    serial_no varchar(50) default null,
    created_at timestamptz default current_timestamp not null,
    modified_at timestamptz default current_timestamp not null,

    constraint fk_owner
        foreign key(owner)
        references users(id)
        on delete cascade
        on update cascade
);

create function update_devices_modified_at()
returns trigger as $$
begin
    NEW.modified_at = now();
    return NEW;
end;
$$ language 'plpgsql';

create trigger devices_mod_datetime
    before update on devices
    for each row
    execute procedure update_devices_modified_at();
