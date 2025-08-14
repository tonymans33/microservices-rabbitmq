<?php 

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\RabbitMQService;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class WalletController extends Controller {

    public function __construct(private readonly RabbitMQService $rabbitmq) {}

    public function deposit(Request $request)
    {
        try {
            $requestValidated = $request->validate([
                'amount' => 'required|numeric|gt:0|lt:5000',
            ]);

            $user = User::find(Auth::id());

            // Alter the balance
            $user->balance_float;
            $user->depositFloat($requestValidated['amount']);

            $this->rabbitmq->publishEvent('user.events', 'user.wallet.deposit', [
                'event' => 'user.wallet.deposit',
                'data' => [
                    'user_id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'amount' => $requestValidated['amount'],
                    'wallet_balance' => $user->balance_float,
                    'created_at' => $user->created_at->toISOString(),
                ],
                'timestamp' => now()->toISOString(),
                'service' => 'user-service'
            ]);

           
            return $this->success(__('Deposit to wallet successful!'), 201);
        } catch (Exception $e) {
            return $this->error($e->getMessage(), 400);
        }
    }
}
