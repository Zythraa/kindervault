FROM php:8.3-apache

ENV APACHE_DOCUMENT_ROOT=/var/www/html

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libfreetype6-dev \
        libjpeg62-turbo-dev \
        libpng-dev \
        libonig-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" pdo_mysql mbstring exif gd \
    && a2enmod rewrite headers \
    && rm -rf /var/lib/apt/lists/*

# Do not disclose the PHP version through the default response header.
RUN printf "expose_php=0\n" > /usr/local/etc/php/conf.d/zz-production.ini

COPY . /var/www/html/
COPY docker/entrypoint.sh /usr/local/bin/kindervault-entrypoint

RUN chmod 0755 /usr/local/bin/kindervault-entrypoint \
    && chown -R www-data:www-data /var/www/html

# Render supplies PORT at runtime. The entrypoint rewires Apache to that port.
EXPOSE 10000
ENTRYPOINT ["kindervault-entrypoint"]
