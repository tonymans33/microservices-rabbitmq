<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginUserRequest;
use App\Http\Requests\RegisterUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\RabbitMQService;
use Exception;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function __construct(private readonly RabbitMQService $rabbitmq) {}

    public function register(RegisterUserRequest $request)
    {
        try {
            // Validate the request data
            $validatedRequest = $request->validated();
            $validatedRequest['status'] = 'active';

            // Create the user
            $user = User::create($validatedRequest);
            $token = $user->createToken('authToken')->plainTextToken;

            // Publish user registration event

            $this->rabbitmq->publishEvent('user.events', 'user.registered', [
                'event' => 'user.registered',
                'data' => [
                    'user_id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'created_at' => $user->created_at->toISOString(),
                ],
                'timestamp' => now()->toISOString(),
                'service' => 'user-service' 
            ]);

            return $this->success([
                'token' => $token,
                'user' => new UserResource($user),
                'message' => __('User registered successfully.'),
            ], __('User registered successfully'), 201);
        } catch (ValidationException $e) {
            // Return validation error details
            return $this->error($e->errors(), 422);
        } catch (Exception $e) {
            // Handle any other exceptions and return an error response
            return $this->error($e->getMessage(), 500);
        }
    }
    public function login(LoginUserRequest $request)
    {
        try {
            // Validate the login request data
            $validatedRequest = $request->validated();

            // Attempt to find the user by phone number or email
            $user = User::active()
                ->where('phone_number', $validatedRequest['login'])
                ->orWhere('email', $validatedRequest['login'])
                ->first();

            // Check if the user exists
            if (!$user) {
                return $this->error(__('User not found'), 404);
            }

            // Check if the password is correct
            if (!Hash::check($validatedRequest['password'], $user->password)) {
                return $this->error(__('Invalid credentials'), 401);
            }

            // Generate and return a token
            $token = $user->createToken('authToken')->plainTextToken;

            return $this->success([
                'token' => $token,
                'user' => new UserResource($user),
                'message' => __('Login successful.'),
            ], __('Login successful'), 200);
        } catch (ValidationException $e) {
            // Return validation error details
            return $this->error($e->errors(), 422);
        } catch (Exception $e) {
            // Handle any other exceptions and return an error response
            return $this->error($e->getMessage(), 500);
        }
    }
}
