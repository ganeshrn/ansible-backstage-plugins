#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
  echo "📋 Loading environment variables from .env..."
  export $(cat .env | grep -v '^#' | xargs)
  echo "✅ Environment variables loaded"
  echo "   MCP_TOKEN: ${MCP_TOKEN:0:20}..."
else
  echo "❌ .env file not found!"
  exit 1
fi

# Start Backstage
echo "🚀 Starting Backstage..."
yarn start

