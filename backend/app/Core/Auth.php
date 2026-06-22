<?php

namespace App\Core;

class Auth
{
    public static function user(): ?array
    {
        return $_SESSION['user'] ?? null;
    }

    public static function id(): ?int
    {
        if (!empty($_SERVER['HTTP_X_USER_ID'])) {
            return (int) $_SERVER['HTTP_X_USER_ID'];
        }

        return isset($_SESSION['user']['id']) ? (int) $_SESSION['user']['id'] : null;
    }

    public static function requireUser(): int
    {
        $id = self::id();
        if (!$id) {
            Response::json(['success' => false, 'message' => 'Please log in first.'], 401);
        }

        return $id;
    }

    public static function requireAdmin(): void
    {
        $user = self::user();
        if (!$user || ($user['role'] ?? 'user') !== 'admin') {
            Response::json(['success' => false, 'message' => 'Admin access required.'], 403);
        }
    }
}
