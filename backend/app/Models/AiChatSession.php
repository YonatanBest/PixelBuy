<?php

namespace App\Models;

class AiChatSession extends BaseModel
{
    public function getOrCreate(string $sessionKey, ?int $userId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM ai_chat_sessions WHERE session_key = ? LIMIT 1');
        $stmt->execute([$sessionKey]);
        $session = $stmt->fetch();

        if ($session) {
            if ($userId && empty($session['user_id'])) {
                $update = $this->db->prepare('UPDATE ai_chat_sessions SET user_id = ? WHERE id = ?');
                $update->execute([$userId, $session['id']]);
                $session['user_id'] = $userId;
            }
            return $session;
        }

        $stmt = $this->db->prepare('INSERT INTO ai_chat_sessions (session_key, user_id) VALUES (?, ?)');
        $stmt->execute([$sessionKey, $userId]);

        return $this->find((int) $this->db->lastInsertId());
    }

    public function find(int $id): array
    {
        $stmt = $this->db->prepare('SELECT * FROM ai_chat_sessions WHERE id = ?');
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function findBySessionKey(string $sessionKey): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM ai_chat_sessions WHERE session_key = ? LIMIT 1');
        $stmt->execute([$sessionKey]);
        $session = $stmt->fetch();
        return $session ?: null;
    }

    public function addMessage(int $sessionId, string $role, string $content, array $actions = []): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO ai_chat_messages (session_id, role, content, actions_json) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$sessionId, $role, $content, $actions ? json_encode($actions) : null]);

        if ($role === 'user') {
            $this->updateDefaultTitle($sessionId, $content);
        }

        $touch = $this->db->prepare('UPDATE ai_chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?');
        $touch->execute([$sessionId]);

        return [
            'id' => (int) $this->db->lastInsertId(),
            'role' => $role,
            'content' => $content,
            'actions' => $actions,
        ];
    }

    public function messages(int $sessionId, int $limit = 24): array
    {
        $stmt = $this->db->prepare(
            'SELECT id, role, content, actions_json, created_at
             FROM ai_chat_messages
             WHERE session_id = ?
             ORDER BY id DESC
             LIMIT ?'
        );
        $stmt->bindValue(1, $sessionId, \PDO::PARAM_INT);
        $stmt->bindValue(2, $limit, \PDO::PARAM_INT);
        $stmt->execute();

        $messages = array_reverse($stmt->fetchAll());
        return array_map(function (array $message): array {
            $message['actions'] = $message['actions_json'] ? json_decode($message['actions_json'], true) : [];
            unset($message['actions_json']);
            return $message;
        }, $messages);
    }

    public function listSessions(?int $userId, array $sessionKeys = []): array
    {
        $sessionKeys = array_values(array_unique(array_filter($sessionKeys)));
        $where = [];
        $params = [];

        if ($userId) {
            $where[] = 'user_id = ?';
            $params[] = $userId;
        }

        if ($sessionKeys) {
            $placeholders = implode(',', array_fill(0, count($sessionKeys), '?'));
            $where[] = "session_key IN ($placeholders)";
            array_push($params, ...$sessionKeys);
        }

        if (!$where) {
            return [];
        }

        $stmt = $this->db->prepare(
            'SELECT s.id, s.session_key, s.title, s.created_at, s.updated_at,
                    (SELECT content FROM ai_chat_messages WHERE session_id = s.id ORDER BY id DESC LIMIT 1) AS last_message,
                    (SELECT COUNT(*) FROM ai_chat_messages WHERE session_id = s.id) AS message_count
             FROM ai_chat_sessions s
             WHERE ' . implode(' OR ', $where) . '
             HAVING message_count > 0
             ORDER BY s.updated_at DESC
             LIMIT 30'
        );
        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    private function updateDefaultTitle(int $sessionId, string $content): void
    {
        $title = trim(preg_replace('/\s+/', ' ', $content));
        if ($title === '') {
            return;
        }

        if (strlen($title) > 56) {
            $title = substr($title, 0, 53) . '...';
        }

        $stmt = $this->db->prepare(
            "UPDATE ai_chat_sessions
             SET title = ?
             WHERE id = ? AND (title IS NULL OR title = '' OR title = 'Shopping chat')"
        );
        $stmt->execute([$title, $sessionId]);
    }
}
