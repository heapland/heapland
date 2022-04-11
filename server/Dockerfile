FROM openjdk:11-jre-slim-buster

ENV HEAPLAND_HOME=/opt/heapland
ENV USERNAME=heapland
ENV DB_USER=hextron
ENV DB_PASSWORD=hextron
ENV DB_URL='jdbc:postgresql://localhost:5432/heaplandb'
ENV RELEASE_VER="0.3.1"
ENV INSTALL_DIR=${HOME}/heapland
ENV PACKAGE_NAME=heapland-server
ENV BIN_PATH=${INSTALL_DIR}/bin/gxc
ENV DOWNLOAD_URL=https://github.com/heapland/heapland/releases/download/v${RELEASE_VER}/heapland-server-${RELEASE_VER}.tgz


RUN apt-get update \
  && apt-get -y install bash sudo zip curl procps gnupg wget lsb-release nginx \
  && sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list' \
  && wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - \
  && apt update \
  && apt install -y postgresql-13 gnupg postgresql-common \
  && /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y \
  && mkdir -p ${HOME}/heapland/logs mkdir -p ${HOME}/heapland/tmp  mkdir -p ${HOME}/heapland/images \
  && curl -fSL $DOWNLOAD_URL -o ${PACKAGE_NAME}-${RELEASE_VER}.tgz \
  && tar -zxf ${PACKAGE_NAME}-${RELEASE_VER}.tgz --directory $INSTALL_DIR \

RUN echo ':9080 { \
          	encode gzip zstd \
                                \
          	@back-end path /api/* /web/* /ws/* \
          	handle @back-end { \
          		reverse_proxy 127.0.0.1:9000 \
                  } \
           \
          	handle { \
          		root * $INSTALL_DIR/${PACKAGE_NAME}-${RELEASE_VER}/sbin/ui \
          		try_files {path} /index.html \
          		file_server \
          	} \
          }'\
>> $INSTALL_DIR/${PACKAGE_NAME}-${RELEASE_VER}/sbin/Caddyfile
#RUN cat <<EOF | tee $INSTALL_DIR/${PACKAGE_NAME}-${RELEASE_VER}/sbin/Caddyfile >/dev/null
#:9080 {
#	encode gzip zstd
#
#	@back-end path /api/* /web/* /ws/*
#	handle @back-end {
#		reverse_proxy 127.0.0.1:9000
#        }
#
#	handle {
#		root * $INSTALL_DIR/${PACKAGE_NAME}-${RELEASE_VER}/sbin/ui
#		try_files {path} /index.html
#		file_server
#	}
#}
#EOF

RUN rm ${PACKAGE_NAME}-${RELEASE_VER}.tgz \
&& chmod +x $INSTALL_DIR/${PACKAGE_NAME}-${RELEASE_VER}/sbin/Linux/heapctl \
&& chmod +x $INSTALL_DIR/${PACKAGE_NAME}-${RELEASE_VER}/sbin/Linux/caddy \
&& ln -sfn $INSTALL_DIR/${PACKAGE_NAME}-${RELEASE_VER}/sbin/Linux/heapctl $BIN_PATH