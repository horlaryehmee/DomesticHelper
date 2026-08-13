<?php

namespace App\Policies;

use App\Models\Conversation;
use App\Models\User;

class ConversationPolicy
{
    public function view(User $user, Conversation $conversation): bool
    {
        return $user->isAdmin()
            || $user->id === $conversation->employer_id
            || $user->id === $conversation->helper_id;
    }

    public function message(User $user, Conversation $conversation): bool
    {
        if (! $this->view($user, $conversation)) {
            return false;
        }
        if ($conversation->blocked_by && $conversation->blocked_by !== $user->id) {
            return false; // blocked user cannot send
        }
        return true;
    }

    public function block(User $user, Conversation $conversation): bool
    {
        return $user->id === $conversation->employer_id || $user->id === $conversation->helper_id;
    }
}
