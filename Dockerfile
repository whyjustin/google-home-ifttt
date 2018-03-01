FROM nodesource/jessie:6.7.0

RUN apt-get update && \
    apt-get install -y libnss-mdns avahi-discover libavahi-compat-libdnssd-dev libkrb5-dev && \
    sed \
          -e 's:#enable-dbus=yes:enable-dbus=yes:' \
          -e 's:rlimit-nproc=3:#rlimit-nproc=3:' \
          -i /etc/avahi/avahi-daemon.conf && \
    sed \
          -e '/AVAHI_DAEMON_DETECT_LOCAL/ s:1:0:' \
          -i /etc/default/avahi-daemon && \
    mkdir -p /var/run/dbus

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json /usr/src/app/
RUN npm install

COPY . /usr/src/app

# COPY avahi-daemon.conf /etc/avahi/avahi-daemon.conf

RUN rm -r /var/run && rm -r /var/lock && ln -s /run /var/run && ln -s /run/lock /var/lock && \
    rm -f /var/run/dbus/pid /var/run/avahi-daemon/pid

    #&& \
    #dbus-daemon --system && \
    #avahi-daemon -D

    # rm /run/dbus/* && \

RUN service dbus restart && \
    service avahi-daemon stop && \
    apt-get install --reinstall avahi-daemon && \
    service avahi-daemon start

EXPOSE 3500/tcp 5005/tcp 5353 51826

# EXPOSE 5353 51826

CMD [ "npm", "start" ]
