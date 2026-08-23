from datetime import datetime

class OrderService:
    def __init__(self, db_session, payment_service):
        self.db = db_session
        self.payment_service = payment_service

    def create_order(self, user_id: int, items: list, shipping_address: str):
        """Creates an order and reserves stock"""
        total = sum(item['price'] * item['quantity'] for item in items)
        
        # Insert into orders table
        order_id = self.db.insert("orders", {
            "user_id": user_id,
            "total_amount": total,
            "status": "pending",
            "shipping_address": shipping_address
        })

        # Insert items
        for item in items:
            self.db.insert("order_items", {
                "order_id": order_id,
                "product_id": item["product_id"],
                "quantity": item["quantity"],
                "unit_price": item["price"]
            })

        return {"order_id": order_id, "total": total, "status": "pending"}

    def get_order_by_id(self, order_id: int):
        return self.db.query("SELECT * FROM orders WHERE id = %s", (order_id,))
