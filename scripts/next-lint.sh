#!/bin/sh

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
npm run format-check > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Formatting failed. Push aborted. Formatter will now run automatically, please push all changes."
  npm run format
  exit 1
fi

# 2. Run production build script to verify SSR
npm run build > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ Next.js build failed. Your SSR or Server Components are broken! Push aborted."
  exit 1
fi

echo "✅ All checks passed! Proceeding with push."
exit 0
