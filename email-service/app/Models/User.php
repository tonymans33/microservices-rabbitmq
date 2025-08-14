<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class User extends Model
{
    protected $table = 'users';
    public $timestamps = false;
    
    protected $fillable = [
        'name',
        'email',
        'status',
        'phone',
        'email_verified',
    ];

    protected $casts = [
        'email_verified' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Method to get active users only
    public static function getActiveUsers()
    {
        try {
            $activeUsers = static::where('status', 'active')->get();
            
            Log::info("📈 Active Users Count: " . $activeUsers->count());
            
            foreach ($activeUsers as $user) {
                Log::info("✅ Active User: {$user->name} ({$user->email})");
            }
            
            return $activeUsers;
            
        } catch (\Exception $e) {
            Log::error("❌ Failed to get active users: " . $e->getMessage());
            return collect();
        }
    }

    // Method to get users with verified emails
    public static function getVerifiedUsers()
    {
        try {
            $verifiedUsers = static::where('email_verified', true)->get();
            
            Log::info("📧 Email Verified Users Count: " . $verifiedUsers->count());
            
            foreach ($verifiedUsers as $user) {
                Log::info("✉️ Verified User: {$user->name} ({$user->email})");
            }
            
            return $verifiedUsers;
            
        } catch (\Exception $e) {
            Log::error("❌ Failed to get verified users: " . $e->getMessage());
            return collect();
        }
    }
}