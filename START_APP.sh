#!/bin/bash

# WordMaster - Clean Start Script
# This script kills any running instances and starts the app fresh

echo "🧹 Cleaning up any running processes..."

# Kill any existing WordMaster processes
pkill -f "WordMasterApp" 2>/dev/null
pkill -f "expo start" 2>/dev/null
pkill -f "jest-worker.*WordMaster" 2>/dev/null

sleep 2

# Check if ports are free
if lsof -i :8081 >/dev/null 2>&1; then
    echo "⚠️  Port 8081 is still in use, killing..."
    lsof -ti :8081 | xargs kill -9 2>/dev/null
fi

echo "✅ All clean!"
echo ""
echo "🚀 Starting WordMaster..."
echo ""

# Navigate to app directory and start
cd /Users/robbie/Tab/Projects/Wordmaster/WordMasterApp

# Start Expo
npx expo start --ios

# Note: This will:
# 1. Start the Expo dev server
# 2. Automatically open iOS Simulator
# 3. Launch the WordMaster app
# 
# When the app opens, tap "Start Learning" to begin!
