FROM php:8.3-fpm

# Install system dependencies (supervisor already included in your list - good!)
RUN apt-get update && apt-get install -y \
    git \
    curl \
    libpng-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    libpq-dev \
    librabbitmq-dev \
    libssh-dev \
    supervisor

# Clear cache
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Install PHP extensions
RUN docker-php-ext-install \
    pdo \
    pdo_pgsql \
    mbstring \
    exif \
    pcntl \
    bcmath \
    gd \
    sockets

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Install RabbitMQ PHP extension
RUN pecl install amqp \
    && docker-php-ext-enable amqp

# Set working directory
WORKDIR /var/www

# Copy application
COPY . /var/www

# Install Laravel dependencies
RUN if [ -f composer.json ]; then \
        composer install --no-interaction --optimize-autoloader; \
    fi

# Create supervisor log directory
RUN mkdir -p /var/log/supervisor \
    && touch /var/log/supervisor/supervisord.log \
    && touch /var/log/supervisor/email-consumer.log \
    && touch /var/log/supervisor/email-consumer-error.log \
    && chmod -R 755 /var/log/supervisor

# Create Laravel storage directories and set permissions
RUN mkdir -p /var/www/storage/logs \
    && mkdir -p /var/www/storage/framework/cache \
    && mkdir -p /var/www/storage/framework/sessions \
    && mkdir -p /var/www/storage/framework/views \
    && chown -R www-data:www-data /var/www \
    && chmod -R 775 /var/www/storage \
    && chmod -R 755 /var/www

EXPOSE 9000

# Default command (will be overridden in docker-compose)
CMD ["php-fpm"]