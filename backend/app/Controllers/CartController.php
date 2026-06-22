<?php

namespace App\Controllers;

use App\Core\Auth;
use App\Core\Request;
use App\Core\Response;
use App\Models\Cart;
use Exception;

class CartController
{
    public function handle(): void
    {
        match (Request::method()) {
            'GET' => $this->show(),
            'POST' => $this->add(),
            'PUT' => $this->update(),
            'DELETE' => $this->remove(),
            default => Response::json(['success' => false, 'message' => 'Method not allowed.'], 405),
        };
    }

    public function show(): void
    {
        $userId = Auth::requireUser();
        Response::json(['success' => true, 'data' => (new Cart())->items($userId)]);
    }

    public function add(): void
    {
        $userId = Auth::requireUser();
        $data = Request::input();
        if (empty($data['product_id'])) {
            Response::json(['success' => false, 'message' => 'product_id is required.'], 422);
        }

        try {
            $cart = (new Cart())->addItem($userId, (int) $data['product_id'], max(1, (int) ($data['quantity'] ?? 1)));
            Response::json(['success' => true, 'message' => 'Product added to cart.', 'data' => $cart]);
        } catch (Exception $error) {
            Response::json(['success' => false, 'message' => $error->getMessage()], 422);
        }
    }

    public function update(): void
    {
        $userId = Auth::requireUser();
        $data = Request::input();

        try {
            $cart = (new Cart())->updateQuantity($userId, (int) ($data['item_id'] ?? 0), (int) ($data['quantity'] ?? 1));
            Response::json(['success' => true, 'message' => 'Cart updated.', 'data' => $cart]);
        } catch (Exception $error) {
            Response::json(['success' => false, 'message' => $error->getMessage()], 422);
        }
    }

    public function remove(): void
    {
        $userId = Auth::requireUser();
        $data = Request::input();
        $itemId = (int) ($_GET['item_id'] ?? $data['item_id'] ?? 0);
        $cart = (new Cart())->removeItem($userId, $itemId);

        Response::json(['success' => true, 'message' => 'Item removed.', 'data' => $cart]);
    }
}
