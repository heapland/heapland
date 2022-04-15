create table if not exists connection_providers(name varchar(100) primary key,
                                                description varchar(500),
                                       category varchar(20)
                                      );
insert into connection_providers(name, description, category)
values('S3','Browse, upload files and manage your Aamazon S3 Bucket', 'fs');

insert into connection_providers(name, description, category)
values('Postgresql','Browse schema, tables and query your Postgres database', 'rdbms');

insert into connection_providers(name, description, category)
values('MySQL','Browse schema, tables and query your MySQL database', 'rdbms');

insert into connection_providers(name, description, category)
values('MariaDB','Browse schema, tables and query your MariaDB database', 'rdbms');

insert into connection_providers(name, description, category)
values('Kafka','Browse brokers, topics and messages stored in your Kafka Cluster', 'messaging');

create table if not exists connections(id BIGSERIAL PRIMARY KEY,
name varchar(100),
connection_provider varchar(100),
properties text,
dt_created timestamp,
connection_schema_ver int,
workspace_id bigint,
FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
FOREIGN KEY (connection_provider) REFERENCES connection_providers(name) ON DELETE CASCADE
);

create table if not exists queries(
id BIGSERIAL,
name varchar(250),
qtext text,
dt_created TIMESTAMP DEFAULT NOW(),
db_id BIGINT,
FOREIGN KEY (db_id) REFERENCES connections(id) ON DELETE CASCADE
);