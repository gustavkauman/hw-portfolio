create table user_sessions (
    sid varchar(255) primary key not null collate "default",
    sess json not null,
    expire timestamp(6) not null
) with (OIDS=false);
