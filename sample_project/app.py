from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List

app = FastAPI(title="E-Commerce Core API", version="1.0.0")

class OrderItemSchema(BaseModel):
    product_id: int
    quantity: int
    price: float

class CheckoutRequest(BaseModel):
    user_id: int
    items: List[OrderItemSchema]
    shipping_address: str
    payment_method: str

@app.get("/api/health")
def health_check():
    return {"status": "healthy"}

@app.post("/api/auth/login")
def login(credentials: dict):
    return {"token": "mock-jwt-token"}

@app.get("/api/products")
def list_products():
    return [{"id": 1, "sku": "PROD-101", "title": "Wireless Keyboard", "price": 49.99}]

@app.get("/api/orders/{order_id}")
def get_order(order_id: int):
    return {"order_id": order_id, "status": "shipped"}

@app.post("/api/checkout")
def checkout(request: CheckoutRequest):
    return {"status": "success", "order_id": 1001, "invoice": "INV-883921"}

@app.post("/api/payments/webhook")
def stripe_webhook(payload: dict):
    return {"received": True}
