<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Our Platform</title>
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
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Welcome to Our Platform!</h1>
    </div>
    
    <div class="content">
        <h2>Hello {{ $user->name ?? 'there' }}!</h2>
        
        <p>Welcome to our amazing platform! We're excited to have you join our community.</p>
        
        <p><strong>Your account details:</strong></p>
        <ul>
            <li><strong>Name:</strong> {{ $user->name ?? 'N/A' }}</li>
            <li><strong>Email:</strong> {{ $user->email ?? 'N/A' }}</li>
            <li><strong>User ID:</strong> {{ $user->id ?? 'N/A' }}</li>
            <li><strong>Registered:</strong> {{ $user->created_at ?? 'Just now' }}</li>
        </ul>
        
        <p>Here are some things you can do to get started:</p>
        <ul>
            <li>Complete your profile</li>
            <li>Explore our features</li>
            <li>Connect with other users</li>
            <li>Check out our help center</li>
        </ul>
        
        <div style="text-align: center;">
            <a href="#" class="button">Get Started Now</a>
        </div>
        
        <p>If you have any questions, feel free to reach out to our support team.</p>
        
        <p>Best regards,<br>
        <strong>The Platform Team</strong></p>
    </div>
    
    <div class="footer">
        <p>This email was sent from our Email Service microservice</p>
        <p>You're receiving this because you registered for an account</p>
    </div>
</body>
</html>