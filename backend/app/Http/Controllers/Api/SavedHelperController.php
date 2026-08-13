<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\HelperPublicResource;
use App\Models\SavedHelper;
use App\Models\SavedHelperList;
use App\Models\User;
use App\Services\AuditLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SavedHelperController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $employer = $request->user();

        $query = SavedHelper::query()
            ->where('employer_id', $employer->id)
            ->with([
                'helper.helperProfile.skills',
                'helper.helperProfile.trustScore',
                'list',
            ]);

        if ($request->filled('list')) {
            $query->where('list_id', (int) $request->input('list'));
        }

        $saved = $query->latest()->paginate(12);

        $items = $saved->getCollection()
            ->map(fn ($item) => [
                'id' => $item->id,
                'note' => $item->note,
                'list_id' => $item->list_id,
                'helper' => (new HelperPublicResource($item->helper))->resolve(),
                'created_at' => $item->created_at?->toIso8601String(),
            ])
            ->values();

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $saved->currentPage(),
                'last_page' => $saved->lastPage(),
                'per_page' => $saved->perPage(),
                'total' => $saved->total(),
            ],
        ]);
    }

    public function save(Request $request, User $helper): JsonResponse
    {
        $employer = $request->user();
        abort_unless($helper->isHelper(), 422, 'You can only save helper profiles.');

        $data = $request->validate([
            'list_id' => ['nullable', 'integer', 'exists:saved_helper_lists,id'],
            'note' => ['nullable', 'string', 'max:500'],
        ]);

        $saved = SavedHelper::firstOrCreate(
            ['employer_id' => $employer->id, 'helper_id' => $helper->id],
            ['list_id' => $data['list_id'] ?? null, 'note' => $data['note'] ?? null],
        );

        return response()->json(['data' => ['saved' => true, 'id' => $saved->id]], 201);
    }

    public function remove(Request $request, User $helper): JsonResponse
    {
        $deleted = SavedHelper::where('employer_id', $request->user()->id)
            ->where('helper_id', $helper->id)
            ->delete();

        return response()->json(['data' => ['saved' => false, 'removed' => $deleted > 0]]);
    }

    public function lists(): JsonResponse
    {
        $lists = SavedHelperList::where('employer_id', request()->user()->id)
            ->withCount('savedHelpers')
            ->get();

        return response()->json(['data' => $lists]);
    }

    public function storeList(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:80']]);

        $list = SavedHelperList::create([
            'employer_id' => $request->user()->id,
            'name' => $data['name'],
        ]);

        return response()->json(['data' => $list], 201);
    }

    public function updateList(Request $request, SavedHelperList $list): JsonResponse
    {
        abort_unless($list->employer_id === $request->user()->id, 403);

        $data = $request->validate(['name' => ['required', 'string', 'max:80']]);
        $list->update($data);

        return response()->json(['data' => $list]);
    }

    public function deleteList(SavedHelperList $list): JsonResponse
    {
        abort_unless($list->employer_id === request()->user()->id, 403);

        $list->savedHelpers()->update(['list_id' => null]);
        $list->delete();

        return response()->json(['message' => 'List deleted.']);
    }
}
