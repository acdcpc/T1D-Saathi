#!/bin/bash
# Run before EAS build if needed
echo "Running pre-EAS checks..."
npx expo doctor 2>/dev/null || true
echo "Done."
