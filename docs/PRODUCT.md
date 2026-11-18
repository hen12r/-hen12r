# Product strategy — the honest version

> Competitor facts below come from general knowledge, not fresh research for this document. **Verify current features and prices before using any of this publicly.**

## Competitive landscape
| Product | Strongest at | Weakness relevant to us |
|---|---|---|
| ChatGPT | General reasoning, voice mode, cross-chat memory, scheduled tasks | Not a structured organiser. Memory is opaque and hard to audit or export. No real task or reminder system of record |
| Voicenotes | Voice capture → transcript, summaries, action items, "ask your notes" | **Closest competitor to our core idea.** Weaker as a task/reminder manager |
| Otter.ai | Meeting transcription, speaker labels, meeting action items | Built for meetings, not personal life admin. Limited language set |
| Mem | AI-organised notes and chat over notes | Text-first. Repositioned several times |
| Motion | AI auto-scheduling of tasks into a calendar | Expensive, heavy, not voice-first |
| Todoist | Best-in-class task manager; has added AI and voice-to-tasks capture | Voice is an input feature, not memory or notes |

## The hard truth about the differentiator
"Speak once, and it becomes notes plus tasks plus reminders plus searchable memory" is **not unique**. Voicenotes does most of it, and Todoist plus ChatGPT cover the rest. If the pitch is "we connect all three", a well-funded incumbent can ship that as a feature in a quarter.

What is defensible, in order of strength:
1. **Trilingual en/fr/rw voice for Rwanda and francophone East Africa.** Incumbents optimise for English and big European languages. Code-switching between Kinyarwanda, French and English is how many users actually speak, and nobody serves it well. This is the wedge, **but only if the Kinyarwanda recognition is actually good.** Validate it first.
2. **Trust model: confirm-before-save, never-invent-dates, records-not-guesses memory.** A real UX difference from "AI that silently does things".
3. **Local pricing and payments.** $4.99/month is a meaningful amount for a Rwandan student. Check whether Stripe supports your business country at all. If it doesn't, mobile-money providers (MTN MoMo, Airtel Money via Flutterwave or similar) are likely the real billing path. Verify before building billing.

## Pricing critique
- **7 saved notes per month free is too stingy for a voice-capture habit product.** Users decide within the first week. At 7 notes they hit the wall on day 2 and churn before they're hooked. It also counts only notes, so tasks and reminders are unlimited, which makes the limit feel arbitrary.
- Better hypothesis: meter what costs you money, which is **AI captures (minutes processed)**. For example, 30 captures/month free and unlimited organisation of what you've saved. The DB already counts `voice_sessions` per month for this.
- $29.99/year vs $4.99/month is a 50% annual discount. That's aggressive; 20–35% is typical. Test it rather than assume it.
- The limit lives in one SQL function (`public.plan_limits`), so changing it is a one-line migration.

## Who to build for first
One narrow persona: **a Rwandan university student juggling school, a part-time job and family obligations, who thinks out loud in a mix of Kinyarwanda, French and English.** Ten of these people using it daily for two weeks is worth more than every feature on the roadmap.
