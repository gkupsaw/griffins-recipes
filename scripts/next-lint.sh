#!/bin/sh

echo "====== Running Pre-Commit Validations ======"

# Load environment paths for GUI Git clients
if [ -f "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
elif [ -f "$HOME/.bash_profile" ]; then
  . "$HOME/.bash_profile"
elif [ -f "$HOME/.zshrc" ]; then
  . "$HOME/.zshrc"
fi

export PATH="$PATH:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# 1. Run Biome formatter script
echo "Running: npm run format..."
npm run format
if [ $? -ne 0 ]; then
  echo "❌ Formatting failed. Commit aborted."
  exit 1
fi

# 2. Run production build script to verify SSR
echo "Running: npm run build..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Next.js build failed. Your SSR or Server Components are broken! Commit aborted."
  exit 1
fi

echo "✅ All checks passed! Proceeding with commit."
exit 0
