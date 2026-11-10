#!/usr/bin/env bash

PORT="${1:-5173}"

echo "Checking for processes using port $PORT..."

# Find PIDs using lsof, fallback to fuser
PIDS=$(lsof -ti :"$PORT" 2>/dev/null)

if [ -z "$PIDS" ] && command -v fuser >/dev/null 2>&1; then
  PIDS=$(fuser "$PORT"/tcp 2>/dev/null)
fi

if [ -z "$PIDS" ]; then
  echo "No process found using port $PORT."
  exit 0
fi

echo "Found PID(s) on port $PORT: $PIDS"

# Try graceful SIGTERM first
echo "Sending SIGTERM to PID(s): $PIDS..."
kill -15 $PIDS 2>/dev/null

sleep 1

# Check if still running, if so, force SIGKILL
REMAINING=""
for pid in $PIDS; do
  if kill -0 "$pid" 2>/dev/null; then
    REMAINING="$REMAINING $pid"
  fi
done

if [ -n "$REMAINING" ]; then
  echo "Process(es) still alive. Sending SIGKILL to:$REMAINING..."
  kill -9 $REMAINING 2>/dev/null
  sleep 0.5
fi

# Final verification
FINAL_CHECK=$(lsof -ti :"$PORT" 2>/dev/null)
if [ -z "$FINAL_CHECK" ]; then
  echo "Successfully terminated process(es) on port $PORT."
else
  echo "Warning: Port $PORT may still be in use by PID(s): $FINAL_CHECK"
  exit 1
fi

