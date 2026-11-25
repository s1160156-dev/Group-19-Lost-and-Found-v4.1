"""Deterministic classroom progress. This is a task gate, not a language grade."""
import re

FEATURES = {"body": "bottle body", "cap": "cap", "sticker": "sticker shape"}
FIELDS = {"body": "colour", "cap": "detail", "sticker": "mark"}
COLOURS = r"blue|black|white|green|red|yellow|orange|purple|pink|brown|grey|gray|silver|navy|cream|beige|teal|gold|clear|transparent|turquoise|violet"
SHAPES = r"star|cat|heart|circle|square|triangle|flower|moon|dog|rabbit|bear|diamond|oval|sun|round|crescent|rectangle|dinosaur|smiley"
BODY = r"(?:bottle\s+body|body(?:\s+of\s+the\s+bottle)?|(?:water\s+)?bottle)"
CAP = r"(?:bottle\s+cap|cap|lid|top)"
STICKER = r"(?:sticker|shape|design)"

def tidy(s):
    return re.sub(r"[-–—]", " ", s.lower().replace("’", "'"))

def words(options, text):
    return set(re.findall(rf"\b(?:{options})\b", text))

def summary_matches(text, item):
    if re.search(r"\b(?:not|never|no|or|maybe|might|probably|either|except|without)\b|n['’]t\b", text):
        return False
    if not re.search(r"\b(?:right|correct|confirm|is\s+it|is\s+that|does\s+that|isn't\s+it)\b|\?", text):
        return False
    c, d, m = item["colour"], item["detail"], item["mark"]
    allowed = {c, d, m}
    if not words(COLOURS + "|" + SHAPES, text) <= allowed:
        return False
    # Support both “a blue bottle” and “the bottle is blue”, without confusing a cap with the body.
    def paired(noun, value):
        return bool(re.search(rf"\b(?:{noun}\s*(?:is|looks|:|=)?\s*(?:a\s+)?(?:colou?r(?:\s+is|:)?\s*)?{value}|{value}\s+{noun})\b", text))
    return (paired(BODY, c) or bool(re.search(rf"\b(?:so\s+)?(?:your\s+)?it(?:'s|\s+is)\s+{c}\b", text))) and paired(CAP, d) and (paired(STICKER, m) or bool(re.search(rf"\b{m}\s+shaped\s+sticker\b|\bsticker\s+is\s+shaped\s+like\s+(?:a\s+)?{m}\b", text)))

def plan(raw, clues, confirmation, item, last_reply=None):
    t = tidy(raw)
    same = lambda reply, allowed=(): (reply, dict(clues), confirmation, set(allowed))
    if re.search(r"\b(?:ignore|system\s+prompt|answer\s+key|tell\s+me\s+the\s+letter|which\s+(?:letter|number)|option\s+[abcd]|item\s+[abcd]|(?:is\s+it|guess)\s+[abcd]\s*\?)\b|\b(?:is it|guess)\s+[abcd]\s*\?", t):
        return same("Please describe the bottle rather than naming a letter.")
    has_cap = bool(re.search(rf"\b{CAP}\b", t))
    has_sticker = bool(re.search(rf"\b{STICKER}\b", t))
    has_body = bool(re.search(r"\b(?:body|main\s+colou?r|bottle\s+itself|side\s+of)\b", t))
    colours = words(COLOURS, t)
    shapes = words(SHAPES, t)
    readback = bool(re.search(r"\b(?:so\s+(?:your|the|it)|let me (?:check|confirm)|is (?:that|this) (?:right|correct)|am i right|do i have (?:that|it) right|let me make sure)\b", t)) or (has_cap and has_sticker and bool(shapes) and bool(colours))
    if readback:
        if len(clues) != 3:
            return same("We still need to check each clue separately. Ask about the missing details first.")
        if summary_matches(t, item):
            return ("Yes, all three details are right!", dict(clues), raw, set())
        return ("Not quite. Check the bottle colour, cap colour and sticker shape, then ask me to confirm again.", dict(clues), "", set())
    if re.search(r"\b(?:repeat|again|pardon)\b", t) and not (has_cap or has_sticker or has_body):
        return same(last_reply or "Sure. Which detail would you like me to repeat?", words(COLOURS + "|" + SHAPES, (last_reply or "").lower()))
    if sum([has_cap, has_sticker, has_body]) > 1:
        return same("Let’s take one clue at a time. Which detail would you like to check first?")
    if not ("?" in t or re.search(r"\b(?:what|which|does|is|can|could|would|tell|describe|how)\b", t)):
        return same("Could you ask me a question about the bottle, cap or sticker?")
    if has_sticker:
        if not re.search(r"\b(?:shape|look like|kind|design|mean|what\s+(?:is|does|sticker)|which\s+sticker)\b", t) and not shapes:
            return same("Yes, there’s a sticker with a little shape on it.")
        key = "sticker"
    elif has_cap:
        if not (re.search(r"\b(?:colou?r|look|describe|what|which|mean)\b", t) or colours):
            return same("What would you like to know about the cap?")
        key = "cap"
    elif has_body or re.search(r"\bcolou?r\b", t) or (re.search(r"\bbottle\b", t) and colours):
        key = "body"
    else:
        return same("Try asking about the bottle colour, the cap colour or the shape on the sticker.")
    value = item[FIELDS[key]]
    phrase = {"body": f"The bottle itself is {value}.", "cap": f"The cap is {value}.", "sticker": f"The sticker is shaped like a {value}."}[key]
    return (phrase, {**clues, key: value}, confirmation, {value})
