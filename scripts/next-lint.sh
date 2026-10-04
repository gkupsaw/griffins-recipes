#!/bin/sh

echo "====== Running Pre-Commit SSR & Syntax Checks ======"

# Load environment paths for GUI Git clients
if [ -f "$HOME/.nvm/nvm.sh" ]; then
  . "$HOME/.nvm/nvm.sh"
elif [ -f "$HOME/.bash_profile" ]; then
  . "$HOME/.bash_profile"
elif [ -f "$HOME/.zshrc" ]; then
  . "$HOME/.zshrc"
fi

export PATH="$PATH:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

# 1. Fast Syntax & Formatting Guard (Only on staged files)
echo "Linting & formatting with Biome..."
npx @biomejs/biome check --staged --no-errors-on-unmatched
if [ $? -ne 0 ]; then
  echo "❌ Biome check failed. Commit aborted."
  exit 1
fi

# 2. Strict Type Safety Guard
echo "Verifying TypeScript types..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript type-check failed. Commit aborted."
  exit 1
fi

# 3. Ultimate Next.js SSR Compilation Guard
echo "Verifying Next.js SSR compilation..."
# Next.js utilizes caching, so if nothing changed structurally, subsequent runs are fast.
npx next build
if [ $? -ne 0 ]; then
  echo "❌ Next.js build failed. Your SSR or Server Components are broken! Commit aborted."
  exit 1
fi

echo "✅ All checks passed! Proceeding with commit."
exit 0
