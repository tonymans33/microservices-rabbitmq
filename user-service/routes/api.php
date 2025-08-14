<?php
// routes/api.php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WalletController;
use Illuminate\Support\Facades\Route;

Route::prefix('users')->group(function () {
    Route::get('/', [UserController::class, 'index']);
    Route::post('/', [UserController::class, 'store']);
    Route::get('/{id}', [UserController::class, 'show']);
    
    Route::get('/health', function () {
        return response()->json(['status' => 'OK', 'service' => 'user-service']);
    });
    
    Route::group(['prefix' => 'auth'], function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
    });
    
    Route::group(['middleware' => ['auth:sanctum']], function () {
        Route::post('/wallet/deposit', [WalletController::class, 'deposit']);
    });
    
});

