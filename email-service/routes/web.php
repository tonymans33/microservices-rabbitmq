<?php

use App\Models\User;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});


Route::get('/test-user-service', function () {
    $result = User::testConnectionAndLogUsers();
    
    return response()->json([
        'test' => 'User Service Connection Test',
        'timestamp' => now()->toISOString(),
        'result' => $result
    ]);
});

// Test route for active users only
Route::get('/test-active-users', function () {
    $activeUsers = User::getActiveUsers();
    
    return response()->json([
        'test' => 'Active Users Test',
        'count' => $activeUsers->count(),
        'users' => $activeUsers->toArray()
    ]);
});

// Test route for verified users only
Route::get('/test-verified-users', function () {
    $verifiedUsers = User::getVerifiedUsers();
    
    return response()->json([
        'test' => 'Email Verified Users Test',
        'count' => $verifiedUsers->count(),
        'users' => $verifiedUsers->toArray()
    ]);
});