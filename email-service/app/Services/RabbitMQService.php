<?php

namespace App\Services;

use App\Mail\WelcomeEmail;
use App\Mail\WalletDepositEmail; 
use App\Models\EmailLog;
use App\Models\User;
use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class RabbitMQService
{
    private $connection;
    private $channel;

    public function __construct()
    {
        $this->connection = new AMQPStreamConnection(
            env('RABBITMQ_HOST', 'localhost'),
            env('RABBITMQ_PORT', 5672),
            env('RABBITMQ_USERNAME', 'guest'),
            env('RABBITMQ_PASSWORD', 'guest'),
            env('RABBITMQ_VHOST', '/')
        );
        $this->channel = $this->connection->channel();
    }

    public function consumeUserEvents()
    {
        $queueName = 'email.user.registered';
        
        Log::info("Starting to consume messages from queue: {$queueName}");
        
        // Declare the queue (in case it doesn't exist)
        $this->channel->queue_declare($queueName, false, true, false, false);
        
        // Set up the callback function
        $callback = function (AMQPMessage $msg) {
            try {
                $message = json_decode($msg->getBody(), true);
                
                Log::info('Received user registration event', $message);
                
                // Extract user data from the message structure
                $userData = $message['data'] ?? $message;
                
                // Process the user registration event
                $this->processUserRegistration($userData);
                
                // Acknowledge the message
                $msg->ack();
                
                Log::info('Successfully processed user registration event');
                
            } catch (\Exception $e) {
                Log::error('Error processing user registration event: ' . $e->getMessage());
                
                // Reject the message (don't requeue to avoid infinite loop)
                $msg->nack(false, false);
            }
        };
        
        // Set up the consumer
        $this->channel->basic_qos(null, 1, null); // Process one message at a time
        $this->channel->basic_consume($queueName, '', false, false, false, false, $callback);
        
        Log::info('Waiting for messages. To exit press CTRL+C');
        
        // Keep consuming
        while ($this->channel->is_consuming()) {
            $this->channel->wait();
        }
    }

    public function consumeWalletDepositEvents()
    {
        $queueName = 'email.user.wallet.deposit';
        
        Log::info("Starting to consume wallet deposit messages from queue: {$queueName}");
        
        // Declare the queue (in case it doesn't exist)
        $this->channel->queue_declare($queueName, false, true, false, false);
        
        // Set up the callback function
        $callback = function (AMQPMessage $msg) {
            try {
                $message = json_decode($msg->getBody(), true);
                
                Log::info('Received wallet deposit event', $message);
                
                // Extract user data from the message structure
                $depositData = $message['data'] ?? $message;
                
                // Process the wallet deposit event
                $this->processWalletDeposit($depositData);
                
                // Acknowledge the message
                $msg->ack();
                
                Log::info('Successfully processed wallet deposit event');
                
            } catch (\Exception $e) {
                Log::error('Error processing wallet deposit event: ' . $e->getMessage());
                
                // Reject the message (don't requeue to avoid infinite loop)
                $msg->nack(false, false);
            }
        };
        
        // Set up the consumer
        $this->channel->basic_qos(null, 1, null); // Process one message at a time
        $this->channel->basic_consume($queueName, '', false, false, false, false, $callback);
        
        Log::info('Waiting for wallet deposit messages. To exit press CTRL+C');
        
        // Keep consuming
        while ($this->channel->is_consuming()) {
            $this->channel->wait();
        }
    }

    public function consumeAllEvents()
    {
        $queues = [
            'email.user.registered' => [$this, 'processUserRegistrationCallback'],
            'email.user.wallet.deposit' => [$this, 'processWalletDepositCallback']
        ];

        Log::info("Starting to consume messages from multiple queues");

        foreach ($queues as $queueName => $callback) {
            // Declare the queue (in case it doesn't exist)
            $this->channel->queue_declare($queueName, false, true, false, false);
            
            // Set up the consumer
            $this->channel->basic_qos(null, 1, null);
            $this->channel->basic_consume($queueName, '', false, false, false, false, $callback);
        }

        Log::info('Waiting for messages from all queues. To exit press CTRL+C');

        // Keep consuming
        while ($this->channel->is_consuming()) {
            $this->channel->wait();
        }
    }

    public function processUserRegistrationCallback(AMQPMessage $msg)
    {
        try {
            $message = json_decode($msg->getBody(), true);
            
            Log::info('Received user registration event', $message);
            
            $userData = $message['data'] ?? $message;
            $this->processUserRegistration($userData);
            
            $msg->ack();
            Log::info('Successfully processed user registration event');
            
        } catch (\Exception $e) {
            Log::error('Error processing user registration event: ' . $e->getMessage());
            $msg->nack(false, false);
        }
    }

    public function processWalletDepositCallback(AMQPMessage $msg)
    {
        try {
            $message = json_decode($msg->getBody(), true);
            
            Log::info('Received wallet deposit event', $message);
            
            $depositData = $message['data'] ?? $message;
            $this->processWalletDeposit($depositData);
            
            $msg->ack();
            Log::info('Successfully processed wallet deposit event');
            
        } catch (\Exception $e) {
            Log::error('Error processing wallet deposit event: ' . $e->getMessage());
            $msg->nack(false, false);
        }
    }
    
    private function processUserRegistration($userData)
    {
        Log::info("Processing registration for user: " . ($userData['email'] ?? 'unknown'));
        
        $this->sendWelcomeEmail($userData);
        $this->storeEmailRecord($userData, 'welcome');
    }

    private function processWalletDeposit($depositData)
    {
        Log::info("Processing wallet deposit for user: " . ($depositData['email'] ?? 'unknown'));
        Log::info("Deposit amount: " . ($depositData['amount'] ?? 'unknown'));
        Log::info("New wallet balance: " . ($depositData['wallet_balance'] ?? 'unknown'));
        
        $this->sendWalletDepositEmail($depositData);
        $this->storeEmailRecord($depositData, 'wallet_deposit');
    }
    
    private function sendWelcomeEmail($userData)
    {
        try {
            $email = $userData['email'] ?? 'unknown';
            $name = $userData['name'] ?? 'User';

            $user = User::find($userData['user_id']);
            
            Log::info("📧 Sending welcome email to: " . $email);
            
            Mail::to($email)->send(new WelcomeEmail($user));
            
            Log::info("✅ Welcome email sent successfully to: " . $email);
            
        } catch (\Exception $e) {
            Log::error("❌ Failed to send welcome email: " . $e->getMessage());
            throw $e;
        }
    }

    private function sendWalletDepositEmail($depositData)
    {
        try {
            $email = $depositData['email'] ?? 'unknown';
            $name = $depositData['name'] ?? 'User';
            $amount = $depositData['amount'] ?? 0;
            $balance = $depositData['wallet_balance'] ?? 0;
            
            Log::info("💰 Sending wallet deposit confirmation email to: " . $email);
            Log::info("💰 Deposit amount: $" . $amount);
            
            Mail::to($email)->send(new WalletDepositEmail($depositData));
            
            Log::info("✅ Wallet deposit email sent successfully to: " . $email);
            
        } catch (\Exception $e) {
            Log::error("❌ Failed to send wallet deposit email: " . $e->getMessage());
            throw $e;
        }
    }
    
    private function storeEmailRecord($data, $type)
    {
        $userId = $data['user_id'] ?? $data['id'] ?? 'unknown';
        Log::info("📝 Storing email record for user ID: " . $userId . " (type: " . $type . ")");
        
        // In a real app, you would store this in your database:
        EmailLog::create([
            'user_id' => $userId,
            'user_email' => $data['email'],
            'user_name' => $data['name'],
            'type' => $type,
            'metadata' => $data,
            'sent_at' => now()
        ]);
    }

    public function __destruct()
    {
        if ($this->channel) {
            $this->channel->close();
        }
        if ($this->connection) {
            $this->connection->close();
        }
    }
}