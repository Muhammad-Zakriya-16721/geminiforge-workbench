#!/bin/sh
cd /home/user/gf && node build.mjs >/dev/null && npx tsc --noEmit -p . && npx vite build --outDir dist-prod >/dev/null 2>&1 && (curl -s -o /dev/null http://127.0.0.1:5198/ || (nohup npx vite preview --outDir dist-prod --host 127.0.0.1 --port 5198 >/tmp/vprev.log 2>&1 & sleep 3)) && BASE=http://127.0.0.1:5198/ node check.mjs 2>&1 | grep -v agent-proxy | grep -E "FAIL|passed|Error"
