#create a certificate

execute this commands into:
```
cd web-app-deploy/private

openssl req -x509 -newkey rsa:2048 -keyout keytmp.pem -out cert.pem -days 365

openssl rsa -in keytmp.pem -out key.pem
```
