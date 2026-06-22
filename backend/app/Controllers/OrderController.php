<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Request;
use App\Core\Response;
use App\Models\Order;
use Exception;

class OrderController
{
    public function handle(): void
    {
        match (Request::method()) {
            'GET' => $this->index(),
            'POST' => $this->store(),
            default => Response::json(['success' => false, 'message' => 'Method not allowed.'], 405),
        };
    }

    public function index(): void
    {
        $userId = Auth::requireUser();
        $orders = new Order();
        $user = Auth::user();

        Response::json([
            'success' => true,
            'data' => ($user['role'] ?? 'user') === 'admin' ? $orders->all() : $orders->forUser($userId),
        ]);
    }

    public function store(): void
    {
        $userId = Auth::requireUser();
        try {
            $order = (new Order())->createFromCart($userId, Request::input());
            Response::json(['success' => true, 'message' => 'Order placed successfully.', 'data' => $order], 201);
        } catch (Exception $error) {
            Response::json(['success' => false, 'message' => $error->getMessage()], 422);
        }
    }
}
