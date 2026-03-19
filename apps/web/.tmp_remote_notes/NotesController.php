<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class NotesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $this->authenticatedUserId($request);

        $items = DB::table('notes')
            ->where('user_id', $userId)
            ->orderByDesc('updated_at')
            ->orderByDesc('id')
            ->get(['id', 'title', 'body', 'created_at', 'updated_at']);

        return response()->json([
            'status' => 0,
            'data' => $items,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->only(['title', 'body']);
        $validator = Validator::make($data, [
            'title' => ['nullable', 'string', 'max:200'],
            'body' => ['required', 'string', 'filled', 'max:10000'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 1,
                'message' => $validator->errors()->first(),
            ], 400);
        }

        $userId = $this->authenticatedUserId($request);
        $now = now();
        $title = trim((string) ($data['title'] ?? ''));
        $body = trim((string) $data['body']);

        $noteId = (int) DB::table('notes')->insertGetId([
            'user_id' => $userId,
            'title' => $title !== '' ? $title : null,
            'body' => $body,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $note = DB::table('notes')
            ->where('id', $noteId)
            ->where('user_id', $userId)
            ->first(['id', 'title', 'body', 'created_at', 'updated_at']);

        return response()->json([
            'status' => 0,
            'data' => $note,
        ], 201);
    }

    public function update(Request $request, string $note): JsonResponse
    {
        $noteId = $this->noteIdFromRoute($note);
        if (! $noteId) {
            return response()->json([
                'status' => 1,
                'message' => 'Invalid note id.',
            ], 400);
        }

        $data = $request->only(['title', 'body']);
        $validator = Validator::make($data, [
            'title' => ['nullable', 'string', 'max:200'],
            'body' => ['required', 'string', 'filled', 'max:10000'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 1,
                'message' => $validator->errors()->first(),
            ], 400);
        }

        $userId = $this->authenticatedUserId($request);
        $existing = DB::table('notes')
            ->where('id', $noteId)
            ->where('user_id', $userId)
            ->first();

        if (! $existing) {
            return response()->json([
                'status' => 1,
                'message' => 'Note not found.',
            ], 404);
        }

        $title = trim((string) ($data['title'] ?? ''));
        $body = trim((string) $data['body']);

        DB::table('notes')
            ->where('id', $noteId)
            ->where('user_id', $userId)
            ->update([
                'title' => $title !== '' ? $title : null,
                'body' => $body,
                'updated_at' => now(),
            ]);

        $updated = DB::table('notes')
            ->where('id', $noteId)
            ->where('user_id', $userId)
            ->first(['id', 'title', 'body', 'created_at', 'updated_at']);

        return response()->json([
            'status' => 0,
            'data' => $updated,
        ]);
    }

    public function destroy(Request $request, string $note): JsonResponse
    {
        $noteId = $this->noteIdFromRoute($note);
        if (! $noteId) {
            return response()->json([
                'status' => 1,
                'message' => 'Invalid note id.',
            ], 400);
        }

        $userId = $this->authenticatedUserId($request);
        $deleted = DB::table('notes')
            ->where('id', $noteId)
            ->where('user_id', $userId)
            ->delete();

        if ($deleted < 1) {
            return response()->json([
                'status' => 1,
                'message' => 'Note not found.',
            ], 404);
        }

        return response()->json([
            'status' => 0,
            'data' => [
                'deleted' => true,
                'id' => $noteId,
            ],
        ]);
    }

    private function noteIdFromRoute(string $value): ?int
    {
        if (! ctype_digit($value)) {
            return null;
        }

        $id = (int) $value;

        return $id > 0 ? $id : null;
    }

    private function authenticatedUserId(Request $request): int
    {
        return (int) $request->attributes->get('authenticated_user_id');
    }
}
