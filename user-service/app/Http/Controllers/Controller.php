<?php

namespace App\Http\Controllers;

abstract class Controller
{
    /**
     * Create a success JSON response.
     *
     * @param mixed|null $data The data to include in the response.
     * @param string|null $message Optional message to include with the response.
     * @param int $statusCode The HTTP status code for the response.
     * @return \Illuminate\Http\JsonResponse
     */
    public function success($data = null, $message = null, $statusCode = 200)
    {
        return response()->json([
            'success' => true,
            'data' => $data,
            'message' => $message,
        ], $statusCode);
    }

    /**
     * Create an error JSON response.
     *
     * @param string $message Optional error message to include with the response.
     * @param int $statusCode The HTTP status code for the response.
     * @return \Illuminate\Http\JsonResponse
     */
    public function error($message = 'Internal Server Error', $statusCode = 500)
    {
        return response()->json([
            'success' => false,
            'error' => [
                'message' => $message,
            ],
        ], $statusCode);
    }
}
