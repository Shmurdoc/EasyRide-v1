<?php

declare(strict_types=1);

namespace App\Http\Responses;

use Illuminate\Http\JsonResponse;
use Illuminate\Pagination\LengthAwarePaginator;

class ApiResponse
{
    public static function success(mixed $data = null, string $message = 'Success', int $code = 200, array $extra = []): JsonResponse
    {
        return response()->json(array_merge([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $extra), $code);
    }

    public static function error(string $message = 'Error', int $code = 400, mixed $errors = null): JsonResponse
    {
        $response = ['success' => false, 'message' => $message];
        if ($errors !== null) {
            $response['errors'] = $errors;
        }

        return response()->json($response, $code);
    }

    /**
     * JSON:API compliant error response.
     */
    public static function apiError(int $status, string $title, string $detail = '', ?string $pointer = null, mixed $source = null): JsonResponse
    {
        $error = [
            'status' => (string) $status,
            'title' => $title,
            'detail' => $detail,
        ];

        if ($pointer !== null) {
            $error['source'] = ['pointer' => $pointer];
        } elseif ($source !== null) {
            $error['source'] = $source;
        }

        return response()->json([
            'success' => false,
            'errors' => [$error],
        ], $status);
    }

    /**
     * Not found (404) error.
     */
    public static function notFound(string $resource = 'Resource'): JsonResponse
    {
        return self::apiError(404, 'Not Found', "{$resource} not found.");
    }

    /**
     * Unauthorized (401) error.
     */
    public static function unauthorized(string $message = 'Unauthenticated.'): JsonResponse
    {
        return self::apiError(401, 'Unauthorized', $message);
    }

    /**
     * Forbidden (403) error.
     */
    public static function forbidden(string $message = 'Unauthorized.'): JsonResponse
    {
        return self::apiError(403, 'Forbidden', $message);
    }

    /**
     * Validation failed (422) error.
     */
    public static function validationErrors(mixed $errors, string $detail = 'Validation failed.'): JsonResponse
    {
        return self::apiError(422, 'Validation Failed', $detail, null, ['parameter' => $errors]);
    }

    /**
     * Server error (500).
     */
    public static function serverError(string $detail = 'An unexpected error occurred.'): JsonResponse
    {
        return self::apiError(500, 'Server Error', $detail);
    }

    /**
     * Rate limited (429) error.
     */
    public static function tooManyRequests(string $detail = 'Too many requests. Please try again later.'): JsonResponse
    {
        return self::apiError(429, 'Too Many Requests', $detail);
    }

    public static function paginated(LengthAwarePaginator $paginator, string $message = 'Success'): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}
