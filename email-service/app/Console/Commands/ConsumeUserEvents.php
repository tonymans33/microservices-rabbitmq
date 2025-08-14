<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\RabbitMQService;

class ConsumeUserEvents extends Command
{
    protected $signature = 'rabbitmq:consume-user-events {--timeout=0}';
    protected $description = 'Consume user events from RabbitMQ';

    public function handle()
    {
        $this->info('Starting Email Service Consumer...');
        $this->info('Listening for user events...');
        
        // Handle graceful shutdown signals
        if (extension_loaded('pcntl')) {
            pcntl_signal(SIGTERM, [$this, 'shutdown']);
            pcntl_signal(SIGINT, [$this, 'shutdown']);
        }
        
        $timeout = (int) $this->option('timeout');
        $startTime = time();
        
        try {
            $rabbitMQService = new RabbitMQService();
            
            while (true) {
                // Check for timeout
                if ($timeout > 0 && (time() - $startTime) >= $timeout) {
                    $this->info('Timeout reached, shutting down...');
                    break;
                }
                
                $rabbitMQService->consumeAllEvents();
                
                // Allow signal handling
                if (extension_loaded('pcntl')) {
                    pcntl_signal_dispatch();
                }
                
                // Small sleep to prevent CPU spinning
                usleep(100000); // 0.1 seconds
            }
        } catch (\Exception $e) {
            $this->error('Consumer error: ' . $e->getMessage());
            return 1;
        }
        
        return 0;
    }
    
    public function shutdown()
    {
        $this->info('Received shutdown signal, gracefully shutting down...');
        exit(0);
    }
}