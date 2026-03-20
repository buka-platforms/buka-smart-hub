<?php

namespace App\Http\Controllers;

use App\Services\Unsplash;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Validator;

class BackgroundImageController extends Controller
{
    public function searchUnsplash(Unsplash $unsplash): JsonResponse
    {
        $data = request()->only(['query', 'page', 'per_page', 'orientation']);

        $validator = Validator::make($data, [
            'query' => ['required', 'string', 'filled'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1'],
            'orientation' => ['nullable', 'string', 'in:landscape,portrait,squarish'],
        ], [
            'query.required' => 'The search query is required.',
            'query.string' => 'The search query must be a string.',
            'query.filled' => 'The search query must be a non-empty string.',
            'page.integer' => 'The page number must be an integer.',
            'page.min' => 'The page number must be at least 1.',
            'per_page.integer' => 'The number of results per page must be an integer.',
            'per_page.min' => 'The number of results per page must be at least 1.',
            'orientation.in' => "The orientation must be one of: landscape, portrait, squarish.",
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 1,
                'message' => $validator->errors()->first(),
            ], 400);
        }

        $data['page'] = $data['page'] ?? 1;
        $data['per_page'] = $data['per_page'] ?? 10;

        $images = $unsplash->searchImages($data);

        return response()->json($images);
    }

    public function get(Unsplash $unsplash): JsonResponse
    {
        $data = request()->only(['id', 'random', 'query', 'orientation']);

        $validator = Validator::make($data, [
            'id' => ['nullable', 'string', 'filled'],
            'random' => ['nullable', 'string', 'in:true'],
            'query' => ['nullable', 'string', 'filled'],
            'orientation' => ['nullable', 'string', 'in:landscape,portrait,squarish'],
        ], [
            'id.string' => 'The image ID must be a string.',
            'id.filled' => 'The image ID must be a non-empty string.',
            'random.in' => "The 'random' parameter must be the string 'true' if provided.",
            'random.string' => 'The random parameter must be a string.',
            'query.string' => 'The search query must be a string.',
            'query.filled' => 'The search query must be a non-empty string.',
            'orientation.in' => "The orientation must be one of: landscape, portrait, squarish.",
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 1,
                'message' => $validator->errors()->first(),
            ], 400);
        }

        $id = $data['id'] ?? null;
        $randomImage = $data['random'] ?? null;

        // If id is provided, return the image by id
        if ($id) {
            $image = $unsplash->getImageById($id);

            return response()->json($image);
        }

        if ($randomImage === 'true') {
            $image = $unsplash->getRandomImage([
                'query' => $data['query'] ?? null,
                'orientation' => $data['orientation'] ?? null,
            ]);

            return response()->json($image);
        }

        // If neither id nor random is provided, return an error
        return response()->json([
            'status' => 1,
            'message' => 'Please provide either an image ID or request a random image.',
        ], 400);
    }

    public function getAll(Unsplash $unsplash): JsonResponse
    {
        $data = request()->only(['query', 'page', 'per_page', 'random', 'orientation']);

        $validator = Validator::make($data, [
            'query' => ['nullable', 'string', 'filled'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1'],
            'random' => ['nullable', 'string', 'in:true'],
            'orientation' => ['nullable', 'string', 'in:landscape,portrait,squarish'],
        ], [
            'query.string' => 'The search query must be a string.',
            'query.filled' => 'The search query must be a non-empty string.',
            'page.integer' => 'The page number must be an integer.',
            'page.min' => 'The page number must be at least 1.',
            'per_page.integer' => 'The number of results per page must be an integer.',
            'per_page.min' => 'The number of results per page must be at least 1.',
            'random.in' => "The random parameter must be the string 'true' if provided.",
            'random.string' => 'The random parameter must be a string.',
            'orientation.in' => "The orientation must be one of: landscape, portrait, squarish.",
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 1,
                'message' => $validator->errors()->first(),
            ], 400);
        }

        $data['page'] = $data['page'] ?? 1;
        $data['per_page'] = $data['per_page'] ?? 10;
        $data['random'] = $data['random'] ?? null;
        $data['orientation'] = $data['orientation'] ?? null;
        $query = $data['query'] ?? null;
        $randomImage = $data['random'] ?? null;
        $images = [];

        // If query is provided, search for images
        if ($query) {
            $images = $unsplash->searchImages($data);
        } elseif ($randomImage === 'true') {
            // If random is provided, get a random image
            $images = $unsplash->getRandomImages(30, [
                'orientation' => $data['orientation'],
            ]);
        } else {
            // If neither query nor random is provided, return random images
            $images = $unsplash->getRandomImages(30, [
                'orientation' => $data['orientation'],
            ]);
        }

        return response()->json($images);
    }
}
