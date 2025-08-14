<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailLog extends Model
{
    protected $fillable = [
        'user_id',
        'user_email',
        'user_name',
        'metadata',
        'type',
        'sent_at'
    ];

    protected $casts = [
        'metadata' => 'array',
        'sent_at' => 'datetime'
    ];
}


