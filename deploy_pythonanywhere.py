"""Run in a PythonAnywhere Bash console after generating an API Token."""
import getpass
import json
import os
from pathlib import Path
import re
import sys
import tempfile
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
MARKER = "# Managed by Lost and Found Group 19 deployment"


def write_private_env(path, key, origin):
    with tempfile.NamedTemporaryFile(mode="w", dir=path.parent, delete=False) as out:
        temp = Path(out.name)
        out.write(f"OPENROUTER_API_KEY={key}\nPUBLIC_ORIGIN={origin}\n")
        out.write("OPENROUTER_MODEL=openrouter/free\nFREE_ONLY=true\n")
    try:
        temp.replace(path)
    finally:
        temp.unlink(missing_ok=True)


def deploy(region):
    token = os.getenv("API_TOKEN")
    username = getpass.getuser()
    if not token:
        raise SystemExit("Generate an API Token in PythonAnywhere Account → API Token, then open a NEW Bash console.")
    if not re.fullmatch(r"[A-Za-z0-9]+", username):
        raise SystemExit("Unexpected PythonAnywhere username. No changes made.")
    host, suffix = ("eu.pythonanywhere.com", "eu.pythonanywhere.com") if region == "eu" else ("www.pythonanywhere.com", "pythonanywhere.com")
    domain = f"{username.lower()}.{suffix}"
    origin = f"https://{domain}"
    base = f"https://{host}/api/v0/user/{username}/webapps/"
    config = Path("/var/www") / (domain.replace(".", "_") + "_wsgi.py")

    def call(method="GET", endpoint="", data=None):
        req = Request(base + endpoint, data=None if data is None else urlencode(data).encode(),
                      method=method, headers={"Authorization": f"Token {token}"})
        try:
            with urlopen(req, timeout=30) as res:
                raw = res.read()
                return json.loads(raw) if raw else None
        except HTTPError as exc:
            raise SystemExit(f"PythonAnywhere rejected {method} {endpoint or 'webapps/'} (HTTP {exc.code}).") from None
        except URLError:
            raise SystemExit("Could not connect to the PythonAnywhere API.") from None

    apps = call()
    exists = any(app.get("domain_name") == domain for app in apps)
    if exists and (not config.is_file() or not config.read_text().startswith(MARKER)):
        raise SystemExit("A web app already occupies this address. It was not overwritten.")
    if apps and not exists:
        raise SystemExit("This account already has a different web app. No second app was created.")

    key = getpass.getpass("New OpenRouter key (input is hidden): ").strip()
    if not re.fullmatch(r"sk-or-v1-[A-Za-z0-9_-]{32,}", key):
        raise SystemExit("The OpenRouter key format is unexpected. No changes made.")
    if not exists:
        call("POST", data={"domain_name": domain, "python_version": "python310"})
    config.write_text(f"{MARKER}\nimport sys\nsys.path.insert(0, {str(ROOT)!r})\nfrom pythonanywhere_app import application\n")
    write_private_env(ROOT / ".env", key, origin)
    call("PATCH", f"{domain}/", {"force_https": "true"})
    call("POST", f"{domain}/reload/")
    print(f"Public URL: {origin}/")
    print("Deployment reloaded. A live OpenRouter response still needs to be verified.")


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in {"us", "eu"}:
        raise SystemExit("Usage: python3 deploy_pythonanywhere.py us|eu")
    deploy(sys.argv[1])
