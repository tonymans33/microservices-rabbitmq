<?php

namespace App\GraphQL\Query;

use App\Models\User;
use GraphQL\Type\Definition\Type;
use Rebing\GraphQL\Support\Query;

class UsersQuery extends Query
{
    protected $attributes = [
        'name' => 'users',
        'description' => 'Get all users or filter by id, name, or email'
    ];

    public function type(): Type
    {
        return Type::listOf(\GraphQL::type('User'));
    }

    public function args(): array
    {
        return [
            'id' => [
                'type' => Type::int(),
                'description' => 'The id of the user',
            ],
            'name' => [
                'type' => Type::string(),
                'description' => 'The name of user',
            ],
            'email' => [
                'type' => Type::string(),
                'description' => 'The email of user',
            ]
        ];
    }

    public function resolve($root, $args)
    {        
        if (isset($args['id'])) {
            return User::where('id', $args['id'])->get();
        }

        if (isset($args['name'])) {
            return User::where('name', 'like', '%' . $args['name'] . '%')->get();
        }

        if (isset($args['email'])) {
            return User::where('email', $args['email'])->get();
        }

        return User::all();
    }
}
