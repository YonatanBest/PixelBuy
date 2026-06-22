<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Request;
use App\Core\Response;
use App\Services\AiAssistantService;

class AiController
{
    public function chat(): void
    {
        if (Request::method() === 'GET') {
            if (isset($_GET['sessions']) || isset($_GET['list'])) {
                $keys = array_filter(array_map('trim', explode(',', $_GET['session_ids'] ?? '')));
                $sessions = (new AiAssistantService())->sessions(Auth::id(), $keys);
                Response::json(['success' => true, ...$sessions]);
            }

            $sessionKey = $_GET['session_id'] ?? '';
            if (!$sessionKey) {
                Response::json(['success' => false, 'message' => 'session_id is required.'], 422);
            }

            $history = (new AiAssistantService())->history(Auth::id(), $sessionKey);
            Response::json(['success' => true, ...$history]);
        }

        $data = Request::input();
        if (empty($data['message'])) {
            Response::json(['success' => false, 'message' => 'message is required.'], 422);
        }

        Response::json([
            'success' => false,
            'message' => 'Request-based AI chat was removed. Start backend/scripts/gemini_live_server.py and use the Gemini Live websocket.',
        ], 410);
    }
}
