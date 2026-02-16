#!/bin/bash

# WordMaster - Clean Start Script
# Kills any running instances and starts the Expo frontend.
# The backend API runs on AWS and does not need to be started locally.

echo "Cleaning up any running processes..."

pkill -f "WordMasterApp" 2>/dev/null
pkill -f "expo start" 2>/dev/null
pkill -f "jest-worker.*WordMaster" 2>/dev/null

sleep 2

if lsof -i :8081 >/dev/null 2>&1; then
    echo "Port 8081 is still in use, killing..."
    lsof -ti :8081 | xargs kill -9 2>/dev/null
fi

echo "All clean!"
echo ""
echo "Starting WordMaster..."
echo ""

cd /Users/robbie/Tab/Projects/Wordmaster/WordMasterApp

npx expo start --ios
