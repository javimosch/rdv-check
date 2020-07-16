(docker rm -f rdvprefempt || true) && docker run -d --rm --name rdvprefempt -w /app \
--net=caddy-node_caddy --net-alias=rdvprefempt \
-v "$(pwd)/.env:/app/.env" \
-v "$(pwd)/public:/app/public" \
-v "$(pwd)/src:/app/src" \
-v "$(pwd)/deploy-entry.sh:/app/deploy-entry.sh" \
-v "$(pwd)/package.json:/app/package.json" \
-v "$(pwd)/package.lock.json:/app/package.lock.json" \
-v "/root/.npm/_cacache:/root/.npm/_cacache" node:13.8.0-alpine sh deploy-entry.sh;
docker logs -f rdvprefempt;