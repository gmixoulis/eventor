---
name: event-assistant-grounding
description: Use when the event Ask chat answers wrong or misses Greek.
category: assistant
---

# Event assistant answers from the facts, in the asker's language

Test each answer path with a Greek question, an English date question, a named speaker, and a follow-up after a cancel. Word overlap alone is not retrieval.

- When word matching finds no facts, pass the model the event overview (event, session and venue facts, capped at 8) instead of replying "unknown" without asking it. A Greek question shares no words with English facts.
- Put English and Greek month, weekday and time-of-day words in the scope vocabulary. Without them, "What happens on 9 December?" is refused as out of scope.
- Answer "who is speaking" from the speaker list only when the question names no speaker. A bare "who" (for example "who organises it?") must not trigger the list, and a named speaker ("Is Lars Rasmussen speaking?") goes to the model.
- Pitch and startup list questions ("Which startups are pitching?", "who is pitching", "list the pitches") are answered from the pitch entities, not by word retrieval: the pitch facts never contain the word "pitching", so retrieval returned side events. Put the verb forms users type ("pitching", "pitch") in the scope vocabulary, or "who is pitching" is refused before any answer path runs. A named startup still goes to its summary; topic questions ("talks about AI and startups") still go to retrieval.
- Never send a cancelled exchange back as history. The system prompt also states that the latest message is the request; without it the model redid an earlier cancelled turn instead of the new one.
- Pitch helper: fill a missing why-now or the ask with a plausible general statement, never "not specified". Still invent no numbers, customers or funding.
- Verify on the live server: each question class, the answer text and its source list. Add a unit test per fix that fails without it.
