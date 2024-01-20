FROM php:8.3-apache

ARG ME_USER_UID=$ME_USER_UID
ARG XDEBUG=$XDEBUG
RUN useradd -mU -u $ME_USER_UID -s /bin/bash me

RUN a2enmod rewrite

RUN apt update
RUN apt install -y unzip nano git htop curl libicu-dev psmisc libzip-dev mc

RUN git config --global --add safe.directory /var/www

# php

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN docker-php-ext-install pdo_mysql intl zip
RUN if [ $XDEBUG = 1 ]; then pecl install xdebug && docker-php-ext-enable xdebug; fi;

# apache

RUN echo "ServerName memo-php:80">>/etc/apache2/apache2.conf

RUN php -r "\$f='/etc/apache2/sites-enabled/000-default.conf';\$p='DocumentRoot /var/www/';\
  file_put_contents(\$f,str_replace(\$p.'html',\$p.'public',file_get_contents(\$f)));"

RUN php -r "\$f='/etc/apache2/envvars';\
  file_put_contents(\$f,str_replace(':=www-data}',':=me}',file_get_contents(\$f)));"

# node

RUN apt install -y ca-certificates curl gnupg
RUN mkdir -p /etc/apt/keyrings
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
RUN apt update
RUN apt install nodejs -y
RUN npm install -g npm

RUN npm install -g vite

# mailpit

RUN curl -sL https://raw.githubusercontent.com/axllent/mailpit/develop/install.sh | bash

# finish

RUN apt autoremove -y
RUN echo "mailpit &" > /entrypoint.sh
RUN echo "apache2-foreground" >> /entrypoint.sh
ENTRYPOINT ["bash", "/entrypoint.sh"]
WORKDIR /var/www
