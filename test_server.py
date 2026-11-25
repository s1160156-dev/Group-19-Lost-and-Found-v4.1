"""Local tests with a mocked AI transport; these do NOT verify OpenRouter access."""
import json
import threading
import unittest
import urllib.request
import urllib.error
from unittest.mock import patch
import server
from clues import plan

def scripted_transport(messages):
    checkpoint = json.loads(messages[-1]["content"])["case_desk_sentence_to_copy"]
    return checkpoint, "MOCK-TEST-NOT-LIVE"

class Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.http = server.ThreadingHTTPServer(("127.0.0.1", 0), server.Handler)
        cls.base = f"http://127.0.0.1:{cls.http.server_address[1]}"
        threading.Thread(target=cls.http.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.http.shutdown()
        cls.http.server_close()

    def request(self, path, data=None, headers=None):
        req = urllib.request.Request(self.base + path, data=None if data is None else json.dumps(data).encode(),
                                     headers=headers or ({"Content-Type": "application/json"} if data is not None else {}))
        try:
            with urllib.request.urlopen(req) as response:
                return response.status, json.load(response)
        except urllib.error.HTTPError as exc:
            with exc:
                return exc.code, json.load(exc)

    def start(self):
        with patch.object(server, "ai", side_effect=scripted_transport), patch.object(server.secrets, "choice", side_effect=lambda seq:seq[1]):
            status, data = self.request("/api/start", {"kind":"bottle"})
        self.assertEqual(status, 200)
        self.assertNotIn("item", data)
        return data["session"]

    def test_private_files_not_served(self):
        for path in ["/.env","/server.py","/../.env","/.git/config"]:
            self.assertEqual(self.request(path)[0],404)

    def test_complete_flow_mocked_ai(self):
        sid = self.start()
        with patch.object(server, "ai", side_effect=scripted_transport):
            status, data = self.request("/api/chat", {"session":sid,"text":"What colour is the cap?"})
            self.assertEqual(data["clues"], {"cap":"white"})
            self.assertEqual(self.request("/api/return",{"session":sid,"item":"B","confirmed":True})[0],400)
            for text in ["Does it have a sticker?", "What shape is the sticker?", "What colour is the bottle itself?",
                         "So the bottle is blue, the cap is white, and the sticker is shaped like a star. Is that right?"]:
                final_status, final_data = self.request("/api/chat", {"session":sid,"text":text})
                self.assertEqual(final_status,200,final_data)
            self.assertEqual(final_data["confirmation"],text)
        self.assertEqual(status,200)
        self.assertEqual(data["reply"],"The cap is white.")
        self.assertFalse(self.request("/api/return",{"session":sid,"item":"A","confirmed":True})[1]["correct"])
        self.assertEqual(self.request("/api/return",{"session":sid,"item":"B","confirmed":False})[0],400)
        self.assertTrue(self.request("/api/return",{"session":sid,"item":"B","confirmed":True})[1]["correct"])
        with patch.object(server,"ai",return_value=("Strength: You asked about the cap.\nNext step: Confirm the details.", "MOCK")) as mocked:
            self.assertEqual(self.request("/api/feedback",{"session":sid})[0],200)
            self.assertEqual(self.request("/api/feedback",{"session":sid})[0],200)
            self.assertEqual(mocked.call_count,1)
        self.assertEqual(self.request("/api/chat",{"session":sid,"text":"Hi"})[0],400)

    def test_failed_call_does_not_mutate_transcript(self):
        sid=self.start()
        before=len(server.SESSIONS[sid]["messages"])
        with patch.object(server,"ai",side_effect=ValueError("Simulated provider outage")):
            status,_=self.request("/api/chat",{"session":sid,"text":"What colour?"})
        self.assertEqual(status,400)
        self.assertEqual(len(server.SESSIONS[sid]["messages"]),before)

    def test_unverified_provider_reply_does_not_award_clue(self):
        sid=self.start()
        with patch.object(server,"ai",return_value=("It is red instead. The cap is white.", "MOCK")):
            status,_=self.request("/api/chat",{"session":sid,"text":"What colour is the cap?"})
        self.assertEqual(status,400)
        self.assertEqual(server.SESSIONS[sid]["clues"],{})

    def test_summary_and_clues(self):
        for item in server.ITEMS["bottle"]:
            summary=f"So your bottle is {item['colour']}, with a {item['detail']} cap and a {item['mark']}-shaped sticker. Is that correct?"
            _, clues, conf, _ = plan(summary, {}, "", item)
            self.assertFalse(conf or clues)
            _, clues, _, _ = plan("Does it have a sticker?", clues, "", item)
            self.assertNotIn("sticker", clues)
            for q in ["Is the bottle blue or black?", "Is the cap black or white?", "What do you mean by a little shape?"]:
                _, clues, _, _ = plan(q, clues, "", item)
            self.assertEqual(len(clues),3)
            _, _, conf, _ = plan("So all three are correct, right?", clues, "", item)
            self.assertFalse(conf)
            _, _, conf, _ = plan(summary, clues, "", item)
            self.assertEqual(conf,summary)
            _, _, conf, _ = plan(summary.replace("with a ", "with a red ",1), clues, conf, item)
            self.assertFalse(conf)

    def test_cross_origin_blocked(self):
        status,_=self.request("/api/start",{},{"Content-Type":"application/json","Origin":"https://untrusted.example"})
        self.assertEqual(status,403)

    def test_hosted_origin(self):
        with patch.object(server, "PUBLIC_ORIGIN", "https://group19.example"), patch.object(server, "ai", side_effect=scripted_transport):
            for origin in ["", "null", "https://other.example", f"http://localhost:{server.PORT}"]:
                headers = {"Content-Type": "application/json"}
                if origin:
                    headers["Origin"] = origin
                self.assertEqual(self.request("/api/start", {}, headers)[0], 403)
            headers = {"Content-Type": "application/json", "Origin": "https://group19.example"}
            self.assertEqual(self.request("/api/start", {}, headers)[0], 200)

    def test_free_model_guard(self):
        with patch.object(server,"KEY","TEST-PLACEHOLDER-NOT-A-CREDENTIAL"),patch.object(server,"MODEL","not-free"),patch.object(server,"FREE_ONLY",True):
            with self.assertRaisesRegex(ValueError,"Free-only"):
                server.ai([])

    def test_missing_key(self):
        with patch.object(server,"KEY",""):
            with self.assertRaisesRegex(ValueError,"No API key"):
                server.ai([])

if __name__=="__main__":
    unittest.main(verbosity=2)
