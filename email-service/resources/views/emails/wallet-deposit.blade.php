<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wallet Deposit Confirmation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
        }
        .content {
            background: #f8f9fa;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .amount {
            font-size: 28px;
            font-weight: bold;
            color: #28a745;
            text-align: center;
            margin: 20px 0;
        }
        .balance {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #007bff;
        }
        .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 30px;
        }
        .success-icon {
            font-size: 48px;
            color: #28a745;
            text-align: center;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>💰 Deposit Successful!</h1>
        <p>Your wallet has been topped up</p>
    </div>
    
    <div class="content">
        <p>Hi {{ $name }},</p>
        
        <div class="success-icon">✅</div>
        
        <p>Great news! Your wallet deposit has been processed successfully.</p>
        
        <div class="amount">
            +${{ number_format($amount, 2) }}
        </div>
        
        <div class="balance">
            <h3>💳 Current Wallet Balance</h3>
            <p style="font-size: 24px; font-weight: bold; color: #007bff; margin: 0;">
                ${{ number_format($balance, 2) }}
            </p>
        </div>
        
        <p><strong>Transaction Details:</strong></p>
        <ul>
            <li><strong>Amount Deposited:</strong> ${{ number_format($amount, 2) }}</li>
            <li><strong>New Balance:</strong> ${{ number_format($balance, 2) }}</li>
            <li><strong>Date & Time:</strong> {{ date('F j, Y \a\t g:i A', strtotime($timestamp)) }}</li>
        </ul>
        
        <p>You can now use your wallet balance for purchases, transfers, or any other transactions on our platform.</p>
        
        <p>If you have any questions about this transaction, please don't hesitate to contact our support team.</p>
        
        <p>Thank you for using our service!</p>
        
        <p>Best regards,<br>
        The Team</p>
    </div>
    
    <div class="footer">
        <p>This is an automated email. Please do not reply to this message.</p>
        <p>If you didn't make this deposit, please contact support immediately.</p>
    </div>
</body>
</html>