cat > /etc/nginx/sites-available/dcc-api << 'EOF'
  server {
      listen 80;
      server_name vbtsoybxichbrqgmwimzzxsgabdco.servgrid.xyz;

      location /ws {
          proxy_pass http://localhost:8080;
          proxy_http_version 1.1;
          proxy_set_header Upgrade $http_upgrade;
          proxy_set_header Connection "upgrade";
          proxy_set_header Host $host;
          proxy_read_timeout 86400;
      }

      location / {
          proxy_pass http://localhost:8080;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
      }
  }
EOF