<?php

namespace App\Models;

class Product extends BaseModel
{
    public function all(?string $search = null, ?int $categoryId = null): array
    {
        $sql = 'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE 1=1';
        $params = [];

        if ($search) {
            $sql .= ' AND (p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)';
            $term = '%' . $search . '%';
            $params = array_merge($params, [$term, $term, $term]);
        }

        if ($categoryId) {
            $sql .= ' AND p.category_id = ?';
            $params[] = $categoryId;
        }

        $sql .= ' ORDER BY p.created_at DESC';
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);

        return array_map(fn ($product) => $this->hydrate($product), $stmt->fetchAll());
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare(
            'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON c.id = p.category_id WHERE p.id = ?'
        );
        $stmt->execute([$id]);
        $product = $stmt->fetch();

        if (!$product) {
            return null;
        }

        $product = $this->hydrate($product);
        $product['reviews'] = (new ProductReview())->forProduct($id);
        return $product;
    }

    public function create(array $data): array
    {
        $stmt = $this->db->prepare(
            'INSERT INTO products
            (category_id, brand, model_number, name, description, price, original_price, stock, image_url, product_url, warranty, shipping_note)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $this->nullableInt($data['category_id'] ?? null),
            $data['brand'] ?? '',
            $data['model_number'] ?? '',
            $data['name'],
            $data['description'] ?? '',
            $this->number($data['price'] ?? 0),
            $this->nullableNumber($data['original_price'] ?? null),
            max(0, (int) ($data['stock'] ?? 0)),
            $data['image_url'] ?? '',
            $data['product_url'] ?? '',
            $data['warranty'] ?? '',
            $data['shipping_note'] ?? '',
        ]);

        return $this->find((int) $this->db->lastInsertId());
    }

    public function update(int $id, array $data): ?array
    {
        $current = $this->find($id);
        if (!$current) {
            return null;
        }

        $stmt = $this->db->prepare(
            'UPDATE products
             SET category_id = ?, brand = ?, model_number = ?, name = ?, description = ?, price = ?, original_price = ?, stock = ?, image_url = ?, product_url = ?, warranty = ?, shipping_note = ?
             WHERE id = ?'
        );
        $stmt->execute([
            $this->nullableInt($data['category_id'] ?? $current['category_id']),
            $data['brand'] ?? $current['brand'],
            $data['model_number'] ?? $current['model_number'],
            $data['name'] ?? $current['name'],
            $data['description'] ?? $current['description'],
            $this->number($data['price'] ?? $current['price']),
            $this->nullableNumber($data['original_price'] ?? $current['original_price'] ?? null),
            max(0, (int) ($data['stock'] ?? $current['stock'])),
            $data['image_url'] ?? $current['image_url'],
            $data['product_url'] ?? $current['product_url'],
            $data['warranty'] ?? $current['warranty'],
            $data['shipping_note'] ?? $current['shipping_note'],
            $id,
        ]);

        return $this->find($id);
    }

    public function delete(int $id): bool
    {
        $stmt = $this->db->prepare('DELETE FROM products WHERE id = ?');
        return $stmt->execute([$id]);
    }

    private function hydrate(array $product): array
    {
        foreach (['highlights_json' => 'highlights', 'specs_json' => 'specs'] as $column => $key) {
            $decoded = [];
            if (!empty($product[$column])) {
                $decoded = json_decode($product[$column], true) ?: [];
            }
            $product[$key] = $decoded;
            unset($product[$column]);
        }

        return $product;
    }

    private function nullableInt(mixed $value): ?int
    {
        return $value === '' || $value === null ? null : (int) $value;
    }

    private function number(mixed $value): float
    {
        return (float) ($value === '' || $value === null ? 0 : $value);
    }

    private function nullableNumber(mixed $value): ?float
    {
        return $value === '' || $value === null ? null : (float) $value;
    }
}
