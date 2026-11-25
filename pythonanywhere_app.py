"""WSGI entry point for a single-worker PythonAnywhere deployment."""
from http import HTTPStatus
from io import BytesIO

from server import Handler, PUBLIC_ORIGIN


class Request:
    do_GET = Handler.do_GET
    do_POST = Handler.do_POST
    respond = Handler.respond

    def __init__(self, environ):
        self.path = environ.get("PATH_INFO", "/")
        self.headers = {
            "Origin": environ.get("HTTP_ORIGIN", ""),
            "Content-Length": environ.get("CONTENT_LENGTH") or "0",
            "Content-Type": environ.get("CONTENT_TYPE", ""),
        }
        self.rfile = environ["wsgi.input"]
        self.wfile = BytesIO()
        self.response_headers = []

    def send_response(self, status):
        self.status = f"{status} {HTTPStatus(status).phrase}"

    def send_header(self, name, value):
        self.response_headers.append((name, value))

    def end_headers(self):
        pass


def application(environ, start_response):
    request = Request(environ)
    if environ["REQUEST_METHOD"] in {"GET", "HEAD"}:
        request.do_GET()
    elif environ["REQUEST_METHOD"] == "POST":
        if not PUBLIC_ORIGIN.startswith("https://"):
            request.respond(503, {"error": "The public HTTPS address is not configured on the game server."})
        else:
            request.do_POST()
    else:
        request.send_header("Allow", "GET, HEAD, POST")
        request.respond(405, {"error": "Method not allowed."})
    content = request.wfile.getvalue()
    request.send_header("Content-Length", str(len(content)))
    start_response(request.status, request.response_headers)
    return [b"" if environ["REQUEST_METHOD"] == "HEAD" else content]
