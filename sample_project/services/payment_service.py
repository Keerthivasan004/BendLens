import uuid

class PaymentService:
    def __init__(self, db_session):
        self.db = db_session

    def process_payment(self, order_id: int, amount: float, payment_method: str):
        """Authorizes transaction and records in payments table"""
        txn_id = f"txn_{uuid.uuid4().hex[:12]}"
        
        self.db.insert("payments", {
            "order_id": order_id,
            "transaction_id": txn_id,
            "amount": amount,
            "payment_method": payment_method,
            "payment_status": "settled"
        })

        # Generate invoice
        invoice_number = f"INV-{uuid.uuid4().hex[:8].upper()}"
        self.db.insert("invoices", {
            "invoice_number": invoice_number,
            "order_id": order_id,
            "grand_total": amount,
            "status": "paid"
        })

        return {"transaction_id": txn_id, "invoice_number": invoice_number, "status": "settled"}
