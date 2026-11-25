"""Verify the hosted WSGI layer without calling a real AI service."""
import json
from io import BytesIO
from unittest import TestCase
from unittest.mock import patch
from wsgiref.util import setup_testing_defaults
from wsgiref.validate import validator

import pythonanywhere_app
from test_server import scripted_transport


class HostedTests(TestCase):
    origin = "https://group19.example"

    def request(self, method, path, origin="", data=None):
        body = json.dumps(data).encode() if data is not None else b""
        env = {}
        setup_testing_defaults(env)
        env.update({
            "REQUEST_METHOD": method, "PATH_INFO": path, "QUERY_STRING": "",
            "HTTP_ORIGIN": origin, "CONTENT_TYPE": "application/json",
            "CONTENT_LENGTH": str(len(body)), "wsgi.input": BytesIO(body),
        })
        status = []
        with patch("server.PUBLIC_ORIGIN", self.origin), patch("pythonanywhere_app.PUBLIC_ORIGIN", self.origin):
            response = validator(pythonanywhere_app.application)(env, lambda s, h, exc_info=None: status.append(s))
            try:
                content = b"".join(response)
            finally:
                response.close()
        return int(status[0].split()[0]), content

    def test_public_page_and_no_secret_paths(self):
        status, content = self.request("GET", "/")
        self.assertEqual(status, 200)
        self.assertIn(b"Lost and Found Group 19", content)
        self.assertEqual(self.request("HEAD", "/app.js"), (200, b""))
        for path in ["/.env", "/server.py", "/pythonanywhere_app.py"]:
            self.assertEqual(self.request("GET", path)[0], 404)

    def test_hosted_api_and_origin(self):
        with patch("server.ai", side_effect=scripted_transport):
            self.assertEqual(self.request("POST", "/api/start", data={})[0], 403)
            code, raw = self.request("POST", "/api/start", self.origin, {})
            self.assertEqual(code, 200)
            session = json.loads(raw)["session"]
            code, raw = self.request("POST", "/api/chat", self.origin,
                                     {"session": session, "text": "What colour is the cap?"})
            self.assertEqual(code, 200)
            self.assertIn("cap", json.loads(raw)["clues"])
