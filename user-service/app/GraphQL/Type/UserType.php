<?php

namespace App\GraphQL\Type;

use App\Models\User;
use GraphQL\Type\Definition\Type;
use Rebing\GraphQL\Support\Type as GraphQLType;

class UserType extends GraphQLType
{
    protected $attributes = [
        'name'          => 'User',
        'description'   => 'A user',
        'model'         => User::class,
    ];

    public function fields(): array
    {
        return [
            'id' => [
                'type' => Type::nonNull(Type::int()),
                'description' => 'The id of the user',
            ],
            'name' => [
                'type' => Type::nonNull(Type::string()),
                'description' => 'The name of user',
            ],
            'email' => [
                'type' => Type::nonNull(Type::string()),
                'description' => 'The email of user',
            ],
            // expose float balance directly from the user (HasWalletFloat)
            'balance' => [
                'type' => Type::nonNull(Type::float()),
                'description' => 'Convenience: user balance (float)',
                'resolve' => fn(User $root) => $root->balanceFloat,
            ],
            // nested wallet
            'wallet' => [
                'type' => \GraphQL::type('Wallet'),
                'resolve' => fn(User $root) => $root->wallet, // relation from HasWallet
            ],

            // nested transactions with optional filters
            'transactions' => [
                'type' => Type::listOf(\GraphQL::type('Transaction')),
                'args' => [
                    'confirmed' => [
                        'type' => Type::boolean(),
                        'description' => 'Filter by confirmation status',
                    ],
                    'limit' => [
                        'type' => Type::int(),
                        'description' => 'Limit number of transactions',
                    ],
                ],
                'resolve' => function (User $root, array $args) {
                    $q = $root->transactions()->latest(); // relation from HasWallet
                    if (array_key_exists('confirmed', $args)) {
                        $q->where('confirmed', (bool) $args['confirmed']);
                    }
                    if (!empty($args['limit'])) {
                        $q->limit((int) $args['limit']);
                    }
                    return $q->get();
                },
            ],

        ];
    }
}
