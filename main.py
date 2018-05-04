from http.server import BaseHTTPRequestHandler, HTTPServer
import threading
from socketserver import ThreadingMixIn
import time

def post(req):
    """
    Extract the POST body from a request.
    """
    print(type(req))
    if not "Content-Length" in req.headers.keys():
        return None
    try:
        content_length = int(req.headers["Content-Length"])
    except:
        return None
    return req.rfile.read(content_length)

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    pass

class RequestHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        pass

    def do_POST(self):
        content = post(self)
        with open("data/" + str(int(time.time() * 1000)) + ".json", "wb") as f:
            f.write(content)
        
        self.send_response(200, "OK")
        self.end_headers()
        self.wfile.write(b"ok")

print('Running server...')
server_address = ('', 8080)
httpd = ThreadedHTTPServer(server_address, RequestHandler)
httpd.serve_forever()