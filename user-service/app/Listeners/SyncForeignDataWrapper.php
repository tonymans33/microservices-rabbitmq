<?php

namespace App\Listeners;

use Illuminate\Database\Events\MigrationsEnded;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SyncForeignDataWrapper
{
    public function handle(MigrationsEnded $event)
    {
        Log::info('🔄 Migration completed, syncing FDW tables...');
        
        try {
            // Only sync if we're in the right environment
            if (!$this->shouldSyncFdw()) {
                Log::info('⏭️ FDW sync skipped for this environment');
                return;
            }

            // Check if users table was affected
            if ($this->wasUsersTableAffected($event)) {
                $this->syncFdwTable();
                Log::info('✅ FDW sync completed successfully');
            } else {
                Log::info('📊 Users table not affected, skipping FDW sync');
            }
            
        } catch (\Exception $e) {
            Log::error('❌ FDW sync failed: ' . $e->getMessage());
            // Don't fail the migration if FDW sync fails
        }
    }

    private function shouldSyncFdw(): bool
    {
        // Only sync in development and production
        return in_array(app()->environment(), ['local', 'development', 'production']);
    }

    private function wasUsersTableAffected($event): bool
    {
        // For simplicity, always sync when migrations run
        // You could make this smarter by checking migration files
        return true;
        
        // Advanced: Check if any migration affects users table
        // foreach ($event->migrations as $migration) {
        //     if (str_contains($migration, 'users')) {
        //         return true;
        //     }
        // }
        // return false;
    }

    private function syncFdwTable(): void
    {
        try {
            // Use Laravel's DB facade with email service connection
            DB::connection('email_service')->statement("DROP FOREIGN TABLE IF EXISTS users CASCADE");
            
            DB::connection('email_service')->statement("
                IMPORT FOREIGN SCHEMA public 
                LIMIT TO (users)
                FROM SERVER user_service_server 
                INTO public
            ");
            
            $userCount = DB::connection('email_service')->selectOne("SELECT COUNT(*) as count FROM users");
            Log::info("✅ FDW synced! User count: " . $userCount->count);
            
        } catch (\Exception $e) {
            throw new \Exception("FDW sync failed: " . $e->getMessage());
        }
    }
}