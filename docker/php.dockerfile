FROM php:8.2-apache

ARG ME_USER_UID=$ME_USER_UID
RUN useradd -mU -u $ME_USER_UID -s /bin/bash me

RUN a2enmod rewrite

RUN apt update
RUN apt install -y unzip nano git htop curl libicu-dev psmisc

RUN git config --global --add safe.directory /var/www

# php

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN docker-php-ext-install pdo_mysql intl

#apache

RUN echo "ServerName memo-php:80">>/etc/apache2/apache2.conf

RUN php -r "\$f='/etc/apache2/sites-enabled/000-default.conf';\$p='DocumentRoot /var/www/';\
  file_put_contents(\$f,str_replace(\$p.'html',\$p.'public',file_get_contents(\$f)));"

RUN php -r "\$f='/etc/apache2/envvars';\
  file_put_contents(\$f,str_replace(':=www-data}',':=me}',file_get_contents(\$f)));"

# node

RUN apt install -y ca-certificates curl gnupg
RUN mkdir -p /etc/apt/keyrings
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
ENV NODE_MAJOR=20
RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
RUN apt update
RUN apt install nodejs -y
RUN npm install -g npm

RUN npm install -g vite

# finish

RUN apt autoremove -y
WORKDIR /var/www
