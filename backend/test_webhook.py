import hmac
import hashlib
import requests
import json

# Configuration
URL = "http://127.0.0.1:8000/webhook"
SECRET = "my_local_app_secret"  # Ensure this matches your .env

# Exact payload structure
payload_dict = {
    "object": "whatsapp_business_account",
    "entry": [{
        "id": "123",
        "changes": [{
            "value": {
                "messaging_product": "whatsapp",
                "metadata": {
                    "display_phone_number": "923001234567",
                    "phone_number_id": "1072266125971967"
                },
                "contacts": [{"profile": {"name": "Ahmed Test"}, "wa_id": "923001234567"}],
                "messages": [{
                    "from": "923001234567",
                    "id": "wamid.multitenanttest001",
                    "timestamp": "1700000000",
                    "type": "text",
                    "text": {"body": "Hello from multi-tenant test!"}
                }]
            },
            "field": "messages"
        }]
    }]
}

# Convert to compact JSON string (No extra spaces)
payload_bytes = json.dumps(payload_dict, separators=(',', ':')).encode('utf-8')

# Generate Signature
signature = "sha256=" + hmac.new(
    SECRET.encode('utf-8'),
    payload_bytes,
    hashlib.sha256
).hexdigest()

headers = {
    "Content-Type": "application/json",
    "X-Hub-Signature-256": signature
}

# Send request
print(f"Sending request to {URL}...")
response = requests.post(URL, data=payload_bytes, headers=headers)

print(f"Status Code: {response.status_code}")
print(f"Response Body: {response.text}")