<?php

namespace App\Models;

class ProductReview extends BaseModel
{
    public function create(int $productId, ?int $userId, int $rating, string $comment): array
    {
        $rating = max(1, min(5, $rating));
        $stmt = $this->db->prepare(
            'INSERT INTO product_reviews (product_id, user_id, rating, comment) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([$productId, $userId, $rating, $comment]);

        return $this->find((int) $this->db->lastInsertId());
    }

    public function find(int $id): array
    {
        $stmt = $this->db->prepare(
            'SELECT pr.*, u.name AS user_name, p.name AS product_name
             FROM product_reviews pr
             LEFT JOIN users u ON u.id = pr.user_id
             JOIN products p ON p.id = pr.product_id
             WHERE pr.id = ?'
        );
        $stmt->execute([$id]);
        return $stmt->fetch();
    }

    public function forProduct(int $productId): array
    {
        $stmt = $this->db->prepare(
            'SELECT pr.*, COALESCE(u.name, "Guest") AS user_name
             FROM product_reviews pr
             LEFT JOIN users u ON u.id = pr.user_id
             WHERE pr.product_id = ?
             ORDER BY pr.created_at DESC'
        );
        $stmt->execute([$productId]);
        return $stmt->fetchAll();
    }
}

