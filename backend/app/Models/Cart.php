<?php

namespace App\Models;

use Exception;

class Cart extends BaseModel
{
    public function getOrCreate(int $userId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM carts WHERE user_id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $cart = $stmt->fetch();

        if ($cart) {
            return $cart;
        }

        $stmt = $this->db->prepare('INSERT INTO carts (user_id) VALUES (?)');
        $stmt->execute([$userId]);

        return ['id' => (int) $this->db->lastInsertId(), 'user_id' => $userId];
    }

    public function items(int $userId): array
    {
        $cart = $this->getOrCreate($userId);
        $stmt = $this->db->prepare(
            'SELECT ci.id, ci.product_id, ci.quantity, p.name, p.price, p.image_url, p.stock
             FROM cart_items ci
             JOIN products p ON p.id = ci.product_id
             WHERE ci.cart_id = ?
             ORDER BY ci.id DESC'
        );
        $stmt->execute([$cart['id']]);
        $items = $stmt->fetchAll();
        $total = array_reduce($items, fn ($sum, $item) => $sum + ((float) $item['price'] * (int) $item['quantity']), 0);
        $itemCount = array_reduce($items, fn ($sum, $item) => $sum + (int) $item['quantity'], 0);

        return ['cart_id' => $cart['id'], 'items' => $items, 'total' => $total, 'item_count' => $itemCount];
    }

    public function addItem(int $userId, int $productId, int $quantity): array
    {
        $cart = $this->getOrCreate($userId);
        $product = $this->productForCart($productId);
        $stmt = $this->db->prepare('SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ?');
        $stmt->execute([$cart['id'], $productId]);
        $existing = $stmt->fetch();
        $newQuantity = ($existing ? (int) $existing['quantity'] : 0) + $quantity;

        if ($newQuantity > (int) $product['stock']) {
            throw new Exception($product['name'] . ' only has ' . (int) $product['stock'] . ' item(s) in stock.');
        }

        if ($existing) {
            $update = $this->db->prepare('UPDATE cart_items SET quantity = ? WHERE id = ?');
            $update->execute([$newQuantity, $existing['id']]);
        } else {
            $insert = $this->db->prepare('INSERT INTO cart_items (cart_id, product_id, quantity) VALUES (?, ?, ?)');
            $insert->execute([$cart['id'], $productId, $quantity]);
        }

        return $this->items($userId);
    }

    public function updateQuantity(int $userId, int $itemId, int $quantity): array
    {
        $cart = $this->getOrCreate($userId);
        if ($quantity <= 0) {
            return $this->removeItem($userId, $itemId);
        }

        $item = $this->cartItemWithProduct($cart['id'], $itemId);
        if (!$item) {
            throw new Exception('Cart item not found.');
        }

        if ($quantity > (int) $item['stock']) {
            throw new Exception($item['name'] . ' only has ' . (int) $item['stock'] . ' item(s) in stock.');
        }

        $stmt = $this->db->prepare('UPDATE cart_items SET quantity = ? WHERE id = ? AND cart_id = ?');
        $stmt->execute([$quantity, $itemId, $cart['id']]);

        return $this->items($userId);
    }

    public function removeItem(int $userId, int $itemId): array
    {
        $cart = $this->getOrCreate($userId);
        $stmt = $this->db->prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?');
        $stmt->execute([$itemId, $cart['id']]);

        return $this->items($userId);
    }

    public function removeProduct(int $userId, int $productId): array
    {
        $cart = $this->getOrCreate($userId);
        $stmt = $this->db->prepare('DELETE FROM cart_items WHERE product_id = ? AND cart_id = ?');
        $stmt->execute([$productId, $cart['id']]);

        return $this->items($userId);
    }

    public function clear(int $userId): void
    {
        $cart = $this->getOrCreate($userId);
        $stmt = $this->db->prepare('DELETE FROM cart_items WHERE cart_id = ?');
        $stmt->execute([$cart['id']]);
    }

    private function productForCart(int $productId): array
    {
        $stmt = $this->db->prepare('SELECT id, name, stock FROM products WHERE id = ?');
        $stmt->execute([$productId]);
        $product = $stmt->fetch();

        if (!$product) {
            throw new Exception('Product not found.');
        }

        if ((int) $product['stock'] <= 0) {
            throw new Exception($product['name'] . ' is out of stock.');
        }

        return $product;
    }

    private function cartItemWithProduct(int $cartId, int $itemId): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT ci.id, ci.quantity, p.name, p.stock
             FROM cart_items ci
             JOIN products p ON p.id = ci.product_id
             WHERE ci.id = ? AND ci.cart_id = ?
             LIMIT 1'
        );
        $stmt->execute([$itemId, $cartId]);
        $item = $stmt->fetch();

        return $item ?: null;
    }
}
