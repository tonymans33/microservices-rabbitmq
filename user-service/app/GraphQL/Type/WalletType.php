<?php

namespace App\GraphQL\Type;

use Bavix\Wallet\Models\Wallet as WalletModel;
use GraphQL\Type\Definition\Type;
use Rebing\GraphQL\Support\Type as GraphQLType;

class WalletType extends GraphQLType
{
    protected $attributes = [
        'name'        => 'Wallet',
        'description' => 'User wallet',
        'model'       => WalletModel::class,
    ];

    public function fields(): array
    {
        return [
            'id' => [
                'type' => Type::nonNull(Type::int()),
            ],
            'name' => [
                'type' => Type::string(),
            ],
            'slug' => [
                'type' => Type::string(),
            ],
            'balance' => [
                'type' => Type::nonNull(Type::float()),
                'description' => 'Current wallet balance (float)',
                'resolve' => fn (WalletModel $root) => $root->balanceFloat,
            ],
            'meta' => [
                'type' => Type::string(),
                'description' => 'Wallet meta as JSON string',
                'resolve' => fn (WalletModel $root) => $root->meta ? json_encode($root->meta) : null,
            ],
            'created_at' => [
                'type' => Type::string(),
            ],
            'updated_at' => [
                'type' => Type::string(),
            ],
        ];
    }
}
