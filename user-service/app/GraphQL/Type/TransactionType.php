<?php

namespace App\GraphQL\Type;

use Bavix\Wallet\Models\Transaction as TransactionModel;
use GraphQL\Type\Definition\Type;
use Rebing\GraphQL\Support\Type as GraphQLType;

class TransactionType extends GraphQLType
{
    protected $attributes = [
        'name'        => 'Transaction',
        'description' => 'Wallet transaction',
        'model'       => TransactionModel::class,
    ];

    public function fields(): array
    {
        return [
            'id' => [
                'type' => Type::nonNull(Type::int()),
            ],
            // bavix stores amount in minor units; expose both raw and float
            'amount' => [
                'type' => Type::nonNull(Type::int()),
                'description' => 'Amount in minor units (e.g., cents)',
            ],
            'amount_float' => [
                'type' => Type::nonNull(Type::float()),
                'description' => 'Amount as float',
                'resolve' => function (TransactionModel $root) {
                    // If your bavix version provides amountFloat, use it:
                    if (property_exists($root, 'amountFloat') || method_exists($root, 'getAmountFloatAttribute')) {
                        return $root->amountFloat;
                    }
                    // Fallback: infer decimal places (default 2)
                    $decimals = optional($root->wallet)->decimal_places ?? 2;
                    return $root->amount / (10 ** $decimals);
                },
            ],
            'type' => [
                'type' => Type::nonNull(Type::int()),
                'description' => 'Transaction type (credit/debit as int)',
            ],
            'confirmed' => [
                'type' => Type::nonNull(Type::boolean()),
            ],
            'meta' => [
                'type' => Type::string(),
                'resolve' => fn (TransactionModel $root) => $root->meta ? json_encode($root->meta) : null,
            ],
            'uuid' => [
                'type' => Type::string(),
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
