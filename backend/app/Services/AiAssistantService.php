<?php

namespace App\Services;

use App\Models\AiChatSession;

class AiAssistantService
{
    public function sessions(?int $userId, array $sessionKeys = []): array
    {
        return [
            'sessions' => (new AiChatSession())->listSessions($userId, $sessionKeys),
        ];
    }

    public function history(?int $userId, string $sessionKey): array
    {
        $chat = new AiChatSession();
        $session = $chat->findBySessionKey($sessionKey);
        if (!$session) {
            return [
                'session_id' => $sessionKey,
                'history' => [],
            ];
        }

        return [
            'session_id' => $sessionKey,
            'history' => $chat->messages((int) $session['id'], 80),
        ];
    }
}
