#!/bin/sh

echo "====== Running Pre-Commit Biome Checks ======"

# Load environment paths for GUI Git clients
if [ -f "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
elif [ -f "$HOME/.bash_profile" ]; then
  . "$HOME/.bash_profile"
elif [ -f "$HOME/.zshrc" ]; then
  . "$HOME/.zshrc"
fi

export PATH="$PATH:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# Run Biome to lint, format, and check your Next.js files
echo "Running biome lint check..."
npx @biomejs/biome check --staged --no-errors-on-unmatched
if [ $? -ne 0 ]; then
  echo "❌ Biome lint check failed. Commit aborted."
  exit 1
fi

echo "✅ Lint checks passed! Proceeding with commit."
exit 0
