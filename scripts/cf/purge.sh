#!/bin/bash

# Check if environment variables are set
if [ -z "$CF_ZONE_ID" ]; then
  echo "Error: CF_ZONE_ID environment variable is not set."
  exit 1
fi

if [ -z "$CF_PURGE_CACHE_API_TOKEN" ]; then
  echo "Error: CF_PURGE_CACHE_API_TOKEN environment variable is not set."
  exit 1
fi

echo "Purging Cloudflare cache for zone $CF_ZONE_ID..."

# Run the curl command
response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
     -H "Authorization: Bearer $CF_PURGE_CACHE_API_TOKEN" \
     -H "Content-Type: application/json" \
     --data '{"purge_everything":true}')

# Output the result
echo "$response"

# Check if successful
if echo "$response" | grep -q '"success":true'; then
  echo "Cache purged successfully!"
else
  echo "Failed to purge cache."
  exit 1
fi
