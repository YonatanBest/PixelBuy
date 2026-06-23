<?php

namespace App\Core;

use App\Models\User;

class Auth
{
    public static function user(): ?array
    {
        if (!empty($_SESSION['user'])) {
            return $_SESSION['user'];
        }

        $id = self::id();
        if (!$id) {
            return null;
        }

        $user = (new User())->find($id);
        if (!$user) {
            return null;
        }

        $safeUser = (new User())->safe($user);
        $_SESSION['user'] = $safeUser;

        return $safeUser;
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
