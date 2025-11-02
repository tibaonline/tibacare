#!/bin/bash

PATIENT_NAME=$1
SERVICE=$2
TIME=$3
PROVIDER="2E5UjoYcx7PDXJ2Qwgr2s9xgrEI2"

curl -s -X POST "https://firestore.googleapis.com/v1/projects/tibacare-bf54b/databases/(default)/documents/bookings" \
  -H "Content-Type: application/json" \
  -d "{
    \"fields\": {
      \"patientName\": { \"stringValue\": \"$PATIENT_NAME\" },
      \"service\": { \"stringValue\": \"$SERVICE\" },
      \"preferredTime\": { \"timestampValue\": \"$TIME\" },
      \"providerId\": { \"stringValue\": \"$PROVIDER\" },
      \"status\": { \"stringValue\": \"Queued\" }
    }
  }"
