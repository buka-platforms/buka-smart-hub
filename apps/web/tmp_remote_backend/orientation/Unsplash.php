<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class Unsplash
{
    private function makeApiRequest($endpoint, $params = [])
    {
        $apiUrl = config('services.unsplash.base_url').$endpoint;

        return Http::withHeaders([
            'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36 Edg/123.0.0.0',
        ])->get($apiUrl, array_merge($params, [
            'client_id' => config('services.unsplash.access_key'),
        ]));
    }

    private function buildRandomImageParams(array $params = []): array
    {
        $payload = [];

        if (! empty($params['query']) && is_string($params['query'])) {
            $payload['query'] = $params['query'];
        }

        if (
            ! empty($params['orientation']) &&
            in_array($params['orientation'], ['landscape', 'portrait', 'squarish'], true)
        ) {
            $payload['orientation'] = $params['orientation'];
        }

        if (! empty($params['count'])) {
            $payload['count'] = $params['count'];
        }

        return $payload;
    }

    public function getImageById($id)
    {
        if (empty($id) || ! is_string($id) || ! preg_match('/^[a-zA-Z0-9_-]+$/', $id)) {
            return [
                'status' => 1,
                'message' => 'Invalid image ID format.',
            ];
        }

        $response = $this->makeApiRequest('/photos/'.$id);

        if ($response->failed()) {
            $statusCode = $response->status();
            $errorMessage = 'Error fetching image: HTTP '.$statusCode;

            switch ($statusCode) {
                case 404:
                    $errorMessage = 'Image not found.';
                    break;
                case 401:
                    $errorMessage = 'Unauthorized access. Please check your API key.';
                    break;
                case 500:
                    $errorMessage = 'Unsplash server error. Please try again later.';
                    break;
                default:
                    $errorMessage = 'An unexpected error occurred.';
            }

            return [
                'status' => 1,
                'message' => 'Error fetching image: '.$response->body(),
            ];
        }

        return [
            'status' => 0,
            'data' => $response->json(),
        ];
    }

    public function getRandomImage(array $params = [])
    {
        $response = $this->makeApiRequest('/photos/random', $this->buildRandomImageParams($params));

        if ($response->failed()) {
            return [
                'status' => 1,
                'message' => 'Error fetching random image: '.$response->body(),
            ];
        }

        return [
            'status' => 0,
            'data' => $response->json(),
        ];
    }

    public function getRandomImages($count = 30, array $params = [])
    {
        $response = $this->makeApiRequest(
            '/photos/random',
            $this->buildRandomImageParams(array_merge($params, [
                'count' => $count,
            ]))
        );

        if ($response->failed()) {
            return [
                'status' => 1,
                'message' => 'Error fetching random images: '.$response->body(),
            ];
        }

        return [
            'status' => 0,
            'data' => $response->json(),
        ];
    }

    public function searchImages($query)
    {
        $params = [
            'query' => $query['query'],
            'page' => $query['page'] ?? 1,
            'per_page' => $query['per_page'] ?? 10,
        ];

        if (
            ! empty($query['orientation']) &&
            in_array($query['orientation'], ['landscape', 'portrait', 'squarish'], true)
        ) {
            $params['orientation'] = $query['orientation'];
        }

        $response = $this->makeApiRequest('/search/photos', $params);

        if ($response->failed()) {
            return [
                'status' => 1,
                'message' => 'Error searching images: '.$response->body(),
            ];
        }

        return [
            'status' => 0,
            'data' => $response->json(),
        ];
    }
}
