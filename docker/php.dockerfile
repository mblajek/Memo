FROM php:8.4-apache

SHELL ["/bin/bash", "-c"]

ARG ME_USER_UID=$ME_USER_UID
ARG XDEBUG=$XDEBUG
RUN useradd -mU -u $ME_USER_UID -s /bin/bash me

RUN a2enmod rewrite headers

RUN apt update
RUN apt install -y zip unzip nano git htop curl libicu-dev psmisc libzip-dev mc

RUN git config --global --add safe.directory /var/www

# php

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN docker-php-ext-install pdo_mysql intl zip
RUN if [ $XDEBUG = 1 ]; then pecl install xdebug && docker-php-ext-enable xdebug; fi;

# apache

RUN echo 'ServerName memo-php:80' >> /etc/apache2/apache2.conf
RUN sed -i 's/:=www-data/:=me/' /etc/apache2/envvars
RUN sed -i 's/DocumentRoot \/var\/www\/html/DocumentRoot \/var\/www\/public/' /etc/apache2/sites-enabled/000-default.conf

RUN echo 'AddDefaultCharset utf-8' >> /etc/apache2/conf-enabled/charset.conf
RUN echo 'AddCharset utf-8 css js md' >> /etc/apache2/conf-enabled/charset.conf

RUN sed -i 's/ServerTokens OS/ServerTokens Prod/' /etc/apache2/conf-enabled/security.conf
RUN sed -i 's/ServerSignature On/ServerSignature Off/' /etc/apache2/conf-enabled/security.conf
RUN echo 'Header always set X-Content-Type-Options "nosniff"' >> /etc/apache2/conf-enabled/security.conf
RUN echo 'Header always set Strict-Transport-Security "max-age=31536000"' >> /etc/apache2/conf-enabled/security.conf

# node

RUN apt install -y ca-certificates curl gnupg
RUN mkdir -p /etc/apt/keyrings
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
RUN apt update
RUN apt install nodejs -y
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN curl -fsSL https://get.pnpm.io/install.sh | ENV="$HOME/.bashrc" SHELL="$(which bash)" bash -
RUN source "$HOME/.bashrc"

RUN pnpm add -g vite

# mailpit

RUN curl -sL https://raw.githubusercontent.com/axllent/mailpit/develop/install.sh | bash

# finish

RUN apt autoremove -y
RUN echo "mailpit &" > /entrypoint.sh
RUN echo "apache2-foreground" >> /entrypoint.sh
ENTRYPOINT ["bash", "/entrypoint.sh"]
WORKDIR /var/www
