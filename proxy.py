import http.server
import ssl
import urllib.request
import sys

class Proxy(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.proxy()
    def do_POST(self):
        self.proxy()
    def do_OPTIONS(self):
        self.proxy()
    
    def proxy(self):
        try:
            url = f'http://localhost:3001{self.path}'
            headers = {k: v for k, v in self.headers.items() if k.lower() not in ('host',)}
            body = None
            if self.command in ('POST', 'PUT', 'PATCH'):
                length = int(self.headers.get('Content-Length', 0))
                if length > 0:
                    body = self.rfile.read(length)
            
            req = urllib.request.Request(url, data=body, headers=headers, method=self.command)
            resp = urllib.request.urlopen(req, timeout=30)
            
            self.send_response(resp.status)
            for k, v in resp.headers.items():
                if k.lower() not in ('transfer-encoding', 'connection'):
                    self.send_header(k, v)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(resp.read())
        except Exception as e:
            self.send_response(502)
            self.end_headers()
            self.wfile.write(str(e).encode())

if __name__ == '__main__':
    server = http.server.HTTPServer(('localhost', 3000), Proxy)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.load_cert_chain('certs/cert.pem', 'certs/key.pem')
    server.socket = ctx.wrap_socket(server.socket, server_side=True)
    print('HTTPS proxy on https://localhost:3000 -> http://localhost:3001')
    server.serve_forever()
