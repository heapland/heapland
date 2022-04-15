<div align="center">
  <a href="#">
    <img
      src="https://avatars.githubusercontent.com/u/102512929?s=400&u=8a5784bbda00207ac15a836f86f588907fbd4929&v=4"
      alt="Heapland Logo"
      height="64"
    />
  </a>
  <br />
  <p>
    <h3>
      <b>
        Heapland
      </b>
    </h3>
  </p>
  <p>
    <b>
      Universal interface for all your data services
    </b>
  </p>
  <p>
<p>

[![Scala build](https://github.com/GigahexHQ/gigahex/actions/workflows/scala.yml/badge.svg)](https://github.com/heapland/heapland/actions/workflows/scala.yml)
[![Github All Releases](https://img.shields.io/github/downloads/heapland/heapland/total.svg)]()
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/heapland/heapland)
[![Twitter Follow](https://img.shields.io/twitter/follow/HeaplandHQ?style=social)](https://twitter.com/HeaplandHQ)

  </p>
  </p>
  <br />
  <img
          src="./screenshot.png"
          alt="Heapland"
          width="100%"
        />

</div>

### Features

- Lightweight interface for relational database, object storage and streaming data infrastructure
- Browse AWS S3 Bucket
- Query relational databases like - Postgresql, MySQL and MariaDB

### Roadmap

- Object Storage/ File System
  - [x] Amazon S3
  - [ ] HDFS
  - [ ] MinIO
- Relational Databases
  - [x] Postgresql
  - [x] MySQL
  - [x] MariaDB
  - [ ] AWS RDS/Aurora
  - [ ] Clickhouse
- NoSQL Databases
  - [ ] Cassandra
  - [ ] MongoDB
  - [ ] Amazon Keyspaces
 
 ### How to get started with docker
 
 Run the following docker run command to get started
 
 ```bash
docker run -p 9080:9080 -v gxdb:/var heapland/heapland:0.1.0
```

You will get the following output

```bash

██╗  ██╗███████╗ █████╗ ██████╗ ██╗      █████╗ ███╗   ██╗██████╗
██║  ██║██╔════╝██╔══██╗██╔══██╗██║     ██╔══██╗████╗  ██║██╔══██╗
███████║█████╗  ███████║██████╔╝██║     ███████║██╔██╗ ██║██║  ██║
██╔══██║██╔══╝  ██╔══██║██╔═══╝ ██║     ██╔══██║██║╚██╗██║██║  ██║
██║  ██║███████╗██║  ██║██║     ███████╗██║  ██║██║ ╚████║██████╔╝
╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝


 Universal interface for all your data services.

> Starting the Heapland Platform
> Checking the postgres status
> Starting the postgres db
> Welcome to heapland! 👋
> username: admin, password: ********
> Visit http://localhost:9080 to get started!
```

Use the credentials above to login to the heapland

