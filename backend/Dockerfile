FROM php:8.4-fpm-alpine AS base

RUN apk add --no-cache \
    git curl libpng-dev libxml2-dev oniguruma-dev libzip-dev \
    postgresql-dev icu-dev linux-headers \
    $PHPIZE_DEPS

RUN docker-php-ext-install \
    pdo_pgsql pgsql bcmath mbstring xml zip intl opcache pcntl

RUN pecl install redis \
    && docker-php-ext-enable redis

RUN curl -sS https://getcomposer.org/installer | php -- --install-dir=/usr/local/bin --filename=composer

WORKDIR /var/www

COPY composer.json composer.lock ./
RUN composer install --no-scripts --prefer-dist

COPY . .

RUN rm -rf bootstrap/cache/*.php vendor/nunomaduro/collision \
    && composer dump-autoload --optimize \
    && php artisan config:cache || true \
    && php artisan route:cache || true \
    && php artisan view:cache || true \
    && php artisan icons:cache || true \
    && chown -R www-data:www-data storage bootstrap/cache \
    && chmod -R 775 storage bootstrap/cache \
    && chmod -R 777 storage/logs

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:9000/up || exit 1

EXPOSE 9000

CMD ["php-fpm"]
