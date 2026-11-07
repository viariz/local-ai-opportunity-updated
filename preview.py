#!/usr/bin/env python3
"""Preview either edition locally. Never expose the full folder publicly."""
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit, unquote
import argparse
from site_pages import redirects, PAGES

parser=argparse.ArgumentParser()
parser.add_argument('edition', choices=['public','full'])
parser.add_argument('--port', type=int, default=8000)
args=parser.parse_args()
root=Path(__file__).resolve().parent/args.edition
routes=redirects()
slugs={p['slug'] for p in PAGES}
routes["/"] = "/introduction"
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(root),**kw)
    def list_directory(self,path): self.send_error(404);return None
    def translate_path(self,path):
        clean=unquote(urlsplit(path).path).strip('/')
        if clean in slugs:return str(root/(clean+'.html'))
        return super().translate_path(path)
    def send_head(self):
        parsed=urlsplit(self.path)
        if parsed.path in routes:
            self.send_response(302)
            self.send_header('Location',routes[parsed.path]+('?' + parsed.query if parsed.query else ''))
            self.send_header('Content-Length','0')
            self.end_headers();return None
        return super().send_head()
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        super().end_headers()
print('Preview:',f'http://localhost:{args.port}/introduction',flush=True)
ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
