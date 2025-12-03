#!/bin/bash

# Create dist directory if it doesn't exist
mkdir -p dist

# Create the tarball
echo "Packaging Linux Agent..."
tar -czvf dist/actionfi-linux-agent.tar.gz \
    index.js \
    package.json \
    linux-installer/setup.sh \
    linux-installer/actionfi-agent.service

echo "================================="
echo "Package created: dist/actionfi-linux-agent.tar.gz"
echo "You can transfer this single file to your Linux servers."
