FROM php:8.2-apache

RUN a2enmod rewrite

RUN apt update
RUN apt install -y unzip nano htop curl

# php


RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer
RUN docker-php-ext-install pdo_mysql && docker-php-ext-enable pdo_mysql

#apache

RUN echo "ServerName fddsz-php:80">>/etc/apache2/apache2.conf
RUN php -r "\$f='/etc/apache2/sites-enabled/000-default.conf';\$p='DocumentRoot /var/www/';\
  file_put_contents(\$f,str_replace(\$p.'html',\$p.'public',file_get_contents(\$f)));"


# node

RUN curl -fsSL https://deb.nodesource.com/setup_current.x | bash -
RUN apt install -y nodejs
RUN npm install -g vite

# finish

RUN apt autoremove -y

#todo configure uid
RUN useradd -mU -u 1000 -s /bin/bash me
WORKDIR /var/www
