<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreMessageRequest;
use App\Http\Resources\ConversationResource;
use App\Http\Resources\MessageResource;
use App\Models\Conversation;
use App\Models\Message;
use App\Models\User;
use App\Services\AuditLogService;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use App\Notifications\PlatformNotification;

class MessagingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $conversations = Conversation::query()
            ->where(fn ($q) => $q->where('employer_id', $user->id)->orWhere('helper_id', $user->id))
            ->with(['job'])
            ->withCount(['messages as unread_count' => fn ($q) => $q->whereNull('read_at')->where('sender_id', '!=', $user->id)])
            ->orderByDesc('last_message_at')
            ->paginate(15);

        return response()->json([
            'data' => ConversationResource::collection($conversations),
            'meta' => [
                'current_page' => $conversations->currentPage(),
                'last_page' => $conversations->lastPage(),
                'per_page' => $conversations->perPage(),
                'total' => $conversations->total(),
            ],
        ]);
    }

    /** Open or create a conversation with a counterpart. */
    public function open(Request $request, User $other): JsonResponse
    {
        $me = $request->user();

        abort_if($other->id === $me->id, 422, 'You cannot message yourself.');

        [$employerId, $helperId] = match (true) {
            $me->isEmployer() && $other->isHelper() => [$me->id, $other->id],
            $me->isHelper() && $other->isEmployer() => [$other->id, $me->id],
            default => abort(422, 'You can only message employers or helpers.'),
        };

        $conversation = Conversation::firstOrCreate(
            ['employer_id' => $employerId, 'helper_id' => $helperId],
            ['last_message_at' => now()],
        );

        return response()->json(['data' => new ConversationResource($conversation->load('job'))], 201);
    }

    public function show(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('view', $conversation);

        // Mark incoming messages read on open.
        Message::where('conversation_id', $conversation->id)
            ->whereNull('read_at')
            ->where('sender_id', '!=', $request->user()->id)
            ->update(['read_at' => now()]);

        $messages = $conversation->messages()
            ->with('sender')
            ->latest()
            ->take(50)
            ->get()
            ->reverse()
            ->values();

        return response()->json([
            'conversation' => new ConversationResource($conversation->load('job')),
            'messages' => MessageResource::collection($messages),
        ]);
    }

    public function send(StoreMessageRequest $request, Conversation $conversation, NotificationService $notifications): JsonResponse
    {
        $this->authorize('message', $conversation);

        $message = Message::create([
            'conversation_id' => $conversation->id,
            'sender_id' => $request->user()->id,
            'body' => $request->input('body'),
        ]);

        $conversation->forceFill([
            'last_message_at' => now(),
            'blocked_by' => null, // messaging resumes after a block
        ])->save();

        $other = $conversation->otherUser($request->user());
        $notifications->send($other, new PlatformNotification(
            type: 'message',
            title: 'New message',
            body: mb_strimwidth($request->input('body'), 0, 120, '…'),
            sendEmail: false,
        ));

        return response()->json(['data' => new MessageResource($message->load('sender'))], 201);
    }

    public function block(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('block', $conversation);

        $conversation->forceFill(['blocked_by' => $request->user()->id])->save();

        AuditLogService::log('conversation.blocked', $conversation);

        return response()->json(['data' => ['blocked' => true]]);
    }

    public function unblock(Request $request, Conversation $conversation): JsonResponse
    {
        $this->authorize('block', $conversation);

        $conversation->forceFill(['blocked_by' => null])->save();

        return response()->json(['data' => ['blocked' => false]]);
    }
}
