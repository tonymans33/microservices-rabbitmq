<?php

declare(strict_types=1);

return [
    'route' => [
        // The prefix for routes; do NOT use a leading slash!
        'prefix' => 'graphql',

        // The controller/method to use in GraphQL request.
        // Also supported array syntax: `[\Rebing\GraphQL\GraphQLController::class, 'query']`
        'controller' => Rebing\GraphQL\GraphQLController::class . '@query',

        // Any middleware for the graphql route group
        // This middleware will apply to all schemas
        'middleware' => [],

        // Additional route group attributes
        //
        // Example:
        //
        // 'group_attributes' => ['guard' => 'api']
        //
        'group_attributes' => [],
    ],

    // The name of the default schema
    // Used when the route group is directly accessed
    'default_schema' => 'default',

    'batching' => [
        // Whether to support GraphQL batching or not.
        // See e.g. https://www.apollographql.com/blog/batching-client-graphql-queries-a685f5bcd41b/
        // for pro and con
        'enable' => true,
    ],

    // The schemas for query and/or mutation. It expects an array of schemas to provide
    // both the 'query' fields and the 'mutation' fields.
    //
    // You can also provide a middleware that will only apply to the given schema
    //
    // Example:
    //
    //  'schemas' => [
    //      'default' => [
    //          'controller' => MyController::class . '@method',
    //          'query' => [
    //              App\GraphQL\Queries\UsersQuery::class,
    //          ],
    //          'mutation' => [
    //
    //          ]
    //      ],
    //      'user' => [
    //          'query' => [
    //              App\GraphQL\Queries\ProfileQuery::class,
    //          ],
    //          'mutation' => [
    //
    //          ],
    //          'middleware' => ['auth'],
    //      ],
    //      'user/me' => [
    //          'query' => [
    //              App\GraphQL\Queries\MyProfileQuery::class,
    //          ],
    //          'mutation' => [
    //
    //          ],
    //          'middleware' => ['auth'],
    //      ],
    //  ]
    //
    'schemas' => [
        'default' => [
            'query' => [
                App\GraphQL\Query\UsersQuery::class,
            ],
            'mutation' => [
                // ExampleMutation::class,
            ],
            'types' => [
                App\GraphQL\Type\UserType::class,
                \App\GraphQL\Type\WalletType::class,
                App\GraphQL\Type\TransactionType::class,
            ],
        ],
    ],

    'types' => [
        // ExampleType::class,
        // ExampleRelationType::class,
        // ExampleInterfaceType::class,
        // ExampleUnionType::class,
        // ExampleEnumType::class,
        // ExampleInputType::class,
        // ExampleScalarType::class,
    ],

    // This setting controls if the error handler will be used to render the error response.
    // This can be set to false, to let the default exception handler render the error,
    // or set to a class that implements the ErrorHandlerInterface
    'error_formatter' => [Rebing\GraphQL\GraphQL::class, 'formatError'],

    /*
     * Custom Error Handling
     *
     * Expected handler signature is: function (array $errors, callable $formatter): array
     *
     * The default handler will pass exceptions to laravel Error Handling mechanism
     * without returning any data
     *
     * Example:
     *
     * 'errors_handler' => function (array $errors, callable $formatter): array {
     *     return array_map($formatter, $errors);
     * },
     *
     * Reference:
     * https://webonyx.github.io/graphql-php/error-handling/
     */
    'errors_handler' => [Rebing\GraphQL\GraphQL::class, 'handleErrors'],

    /*
     * You can set the key, which will be used to retrieve the dynamic variables
     * from the request. Example: "Authorization" => "Bearer <token>"
     */
    'params_key'    => 'variables',

    /*
     * This setting controls if the error handler will be used to render the error response.
     * This can be set to false, to let the default exception handler render the error,
     * or set to a class that implements the ErrorHandlerInterface
     */
    'security' => [
        'query_max_complexity'  => null,
        'query_max_depth'       => null,
        'disable_introspection' => false,
    ],

    /*
     * This setting controls if the error handler will be used to render the error response.
     * This can be set to false, to let the default exception handler render the error,
     * or set to a class that implements the ErrorHandlerInterface
     */
    'pagination_type' => \Rebing\GraphQL\Support\PaginationType::class,

    /*
     * This setting controls if the error handler will be used to render the error response.
     * This can be set to false, to let the default exception handler render the error,
     * or set to a class that implements the ErrorHandlerInterface
     */
    'simple_pagination_type' => \Rebing\GraphQL\Support\SimplePaginationType::class,

    /*
     * Config for GraphiQL (see (https://github.com/graphql/graphiql).
     * To disable GraphiQL, set this to null.
     * To use 'graphql-playground' set this to 'graphql-playground'.
     */
    'graphiql' => [
        'prefix'     => '/graphiql',
        'controller' => Rebing\GraphQL\GraphQLController::class . '@graphiql',
        'middleware' => [],
        'view'       => 'graphql::graphiql',
        'display'    => env('GRAPHIQL_DISPLAY', true),
    ],

    /*
     * Overrides the default field resolver
     * See http://webonyx.github.io/graphql-php/data-fetching/#default-field-resolver
     *
     * Example:
     *
     * 'defaultFieldResolver' => function ($root, $args, $context, $info) {
     *     return null;
     * },
     *
     * Or
     *
     * 'defaultFieldResolver' => [SomeKlass::class, 'someMethod'],
     *
     * Defaults to null
     */
    'defaultFieldResolver' => null,

    /*
     * Any headers that will be added to the response returned by the default controller
     */
    'headers' => [],

    /*
     * Any JSON encoding options (e.g. JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)
     * that will be passed to json_encode when returning the response from the default controller
     * See http://php.net/manual/function.json-encode.php for the full list of options
     */
    'json_encoding_options' => 0,
];
