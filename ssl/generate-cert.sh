#!/bin/bash

# Create a root CA certificate
openssl req -x509 \
  -newkey rsa:2048 \
  -nodes \
  -keyout ssl/rootCA.key \
  -out ssl/rootCA.pem \
  -subj "/CN=localhost" \
  -days 3650

# Create a certificate signing request
openssl req \
  -newkey rsa:2048 \
  -nodes \
  -keyout ssl/localhost.key \
  -out ssl/localhost.csr \
  -subj "/CN=localhost"

# Create a config file for the extensions
cat > ssl/localhost.ext << EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names
[alt_names]
DNS.1 = localhost
IP.1 = 127.0.0.1
EOF

# Create the signed certificate
openssl x509 \
  -req \
  -in ssl/localhost.csr \
  -CA ssl/rootCA.pem \
  -CAkey ssl/rootCA.key \
  -CAcreateserial \
  -out ssl/localhost.crt \
  -days 365 \
  -sha256 \
  -extfile ssl/localhost.ext

echo "Certificates generated in the ssl/ directory"
echo "You'll need to trust the rootCA.pem certificate in your keychain"
