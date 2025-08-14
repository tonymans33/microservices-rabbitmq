<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class WalletDepositEmail extends Mailable
{
    use Queueable, SerializesModels;

    public $depositData;

    public function __construct($depositData)
    {
        $this->depositData = $depositData;
    }

    public function build()
    {
        return $this->view('emails.wallet-deposit')
            ->subject('Wallet Deposit Confirmation - $' . number_format($this->depositData['amount'], 2))
            ->with([
                'name' => $this->depositData['name'] ?? 'User',
                'amount' => $this->depositData['amount'] ?? 0,
                'balance' => $this->depositData['wallet_balance'] ?? 0,
                'timestamp' => $this->depositData['created_at'] ?? now()->toISOString()
            ]);
    }
}
