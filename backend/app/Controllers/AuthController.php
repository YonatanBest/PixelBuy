<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Request;
use App\Core\Response;
use App\Models\User;

class AuthController
{
    public function register(): void
    {
        $data = Request::input();
        foreach (['name', 'email', 'password'] as $field) {
            if (empty($data[$field])) {
                Response::json(['success' => false, 'message' => "{$field} is required."], 422);
            }
        }

        $users = new User();
        if ($users->findByEmail($data['email'])) {
            Response::json(['success' => false, 'message' => 'Email is already registered.'], 422);
        }

        $user = $users->create($data['name'], $data['email'], $data['password']);
        $_SESSION['user'] = $user;

        Response::json(['success' => true, 'message' => 'Registration successful.', 'data' => $user]);
    }

    public function login(): void
    {
        $data = Request::input();
        if (empty($data['email']) || empty($data['password'])) {
            Response::json(['success' => false, 'message' => 'Email and password are required.'], 422);
        }

        $users = new User();
        $user = $users->findByEmail($data['email']);
        if (!$user || !password_verify($data['password'], $user['password'])) {
            Response::json(['success' => false, 'message' => 'Invalid email or password.'], 401);
        }

        $safeUser = $users->safe($user);
        $_SESSION['user'] = $safeUser;

        Response::json(['success' => true, 'message' => 'Login successful.', 'data' => $safeUser]);
    }

    public function logout(): void
    {
        session_destroy();
        Response::json(['success' => true, 'message' => 'Logged out successfully.']);
    }

    public function me(): void
    {
        Response::json(['success' => true, 'data' => Auth::user()]);
    }
}

