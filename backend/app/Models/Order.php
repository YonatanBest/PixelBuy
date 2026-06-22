<?php

namespace App\Models;

use Exception;

class Order extends BaseModel
{
    public function createFromCart(int $userId, array $checkout = []): array
    {
        $cartModel = new Cart();
        $cart = $cartModel->items($userId);

        if (count($cart['items']) === 0) {
            throw new Exception('Cart is empty.');
        }

        $this->db->beginTransaction();

        try {
            $lockedItems = [];
            $total = 0;

            foreach ($cart['items'] as $item) {
                $productStmt = $this->db->prepare('SELECT id, name, price, stock FROM products WHERE id = ? FOR UPDATE');
                $productStmt->execute([$item['product_id']]);
                $product = $productStmt->fetch();

                if (!$product) {
                    throw new Exception('One of the products in your cart is no longer available.');
                }

                if ((int) $product['stock'] < (int) $item['quantity']) {
                    throw new Exception($product['name'] . ' only has ' . (int) $product['stock'] . ' item(s) in stock.');
                }

                $quantity = (int) $item['quantity'];
                $price = (float) $product['price'];
                $total += $price * $quantity;
                $lockedItems[] = [
                    'product_id' => (int) $product['id'],
                    'quantity' => $quantity,
                    'price' => $price,
                ];
            }

            $stmt = $this->db->prepare(
                'INSERT INTO orders
                (user_id, total, status, customer_name, email, phone, address, city, state, zip, payment_method, card_last4, delivery_method, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $stmt->execute([
                $userId,
                $total,
                'completed',
                $checkout['customer_name'] ?? '',
                $checkout['email'] ?? '',
                $checkout['phone'] ?? '',
                $checkout['address'] ?? '',
                $checkout['city'] ?? '',
                $checkout['state'] ?? '',
                $checkout['zip'] ?? '',
                $checkout['payment_method'] ?? 'Demo Visa',
                substr(preg_replace('/\D/', '', (string) ($checkout['card_number'] ?? '4242424242424242')), -4),
                $checkout['delivery_method'] ?? 'Standard delivery',
                $checkout['notes'] ?? '',
            ]);
            $orderId = (int) $this->db->lastInsertId();

            foreach ($lockedItems as $item) {
                $itemStmt = $this->db->prepare(
                    'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)'
                );
                $itemStmt->execute([$orderId, $item['product_id'], $item['quantity'], $item['price']]);

                $stockStmt = $this->db->prepare('UPDATE products SET stock = stock - ? WHERE id = ?');
                $stockStmt->execute([$item['quantity'], $item['product_id']]);
            }

            $cartModel->clear($userId);
            $this->db->commit();

            return $this->find($orderId);
        } catch (Exception $error) {
            $this->db->rollBack();
            throw $error;
        }
    }

    public function find(int $orderId): array
    {
        $stmt = $this->db->prepare(
            'SELECT o.*, u.name AS user_name, u.email AS user_email
             FROM orders o
             JOIN users u ON u.id = o.user_id
             WHERE o.id = ?'
        );
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        if (!$order) {
            return [];
        }

        return $this->withItems($order);
    }

    public function forUser(int $userId): array
    {
        $stmt = $this->db->prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC');
        $stmt->execute([$userId]);

        return array_map(fn ($order) => $this->withItems($order), $stmt->fetchAll());
    }

    public function all(): array
    {
        $stmt = $this->db->prepare(
            'SELECT o.*, u.name AS user_name, u.email AS user_email
             FROM orders o
             JOIN users u ON u.id = o.user_id
             ORDER BY o.created_at DESC'
        );
        $stmt->execute();

        return array_map(fn ($order) => $this->withItems($order), $stmt->fetchAll());
    }

    private function withItems(array $order): array
    {
        $itemStmt = $this->db->prepare(
            'SELECT oi.*, p.name, p.brand, p.image_url
             FROM order_items oi
             JOIN products p ON p.id = oi.product_id
             WHERE oi.order_id = ?
             ORDER BY oi.id ASC'
        );
        $itemStmt->execute([$order['id']]);
        $order['items'] = $itemStmt->fetchAll();

        return $order;
    }
}
