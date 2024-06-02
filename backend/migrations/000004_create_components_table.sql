create table components (
    id uuid primary key default gen_random_uuid(),
    device_id uuid default null,
    device_type varchar(100) not null,
    name varchar(250) not null,
    part_no varchar(100) default null,
    serial_no varchar(50) default null,
    owner uuid not null,
    created_at timestamptz default current_timestamp not null,
    modified_at timestamptz default current_timestamp not null,

    constraint fk_device
        foreign key(device_id) references devices(id)
        on delete set null
        on update cascade,

    constraint fk_owner
        foreign key(owner) references users(id)
        on delete cascade
        on update cascade
);

create function update_components_modified_at()
returns trigger as $$
begin
    NEW.modified_at = now();
    return NEW;
end;
$$ language 'plpgsql';

create trigger components_mod_datetime
    before update on components
    for each row
    execute procedure update_components_modified_at();
