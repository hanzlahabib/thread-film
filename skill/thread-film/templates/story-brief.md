# Story brief

Fill this in before any capture or code. Keep every cell short. Full guidance: `rules/story.md`.

## Basics
- **Audience** (who, in one line):
- **Promise** (one sentence, no "and"):
- **Protagonist** (a person, or the object followed through the product):
- **Before** (their situation, in the viewer's words):
- **After** (the same situation, changed; which real screen shows it?):
- **Problem in the viewer's words** (a line they would say themselves):
- **Length**: 15 s / 30 s / 60 s. **Aspect ratios**: 9:16 and/or 16:9.

## Hook options (12 words or fewer, about the viewer's problem, no product name)
1.
2.
3.

**Chosen**:   **Why**:

## Beat sheet
| Beat | Duration | Screen | What changes for the protagonist | Voiceover line | On-screen label | Carried object | Sound |
|---|---|---|---|---|---|---|---|
| Hook | 0 to 2 s | | | | | | |
| Problem | | | | | | | |
| Turn | | | | | | | |
| Journey 1 | | | | | | | |
| Journey 2 | | | | | | | |
| Journey 3 | | | | | | | |
| Payoff | | | | | | | |
| Proof | | | | | | | |
| CTA | | | | (none: the CTA is not narrated) | | | |

## Proof and CTA
- **Proof allowed** (only what the real screens show; caption such as "Real screens, demo data"):
- **CTA wording**:  **Where**:  **On screen for** (seconds):

## Check
Copy `promise`, `hook`, `problem`, `payoff`, `cta` and the voiceover lines into the journey's `story` block and run `pnpm run story-check`.

---

# Worked example (fictional): "Ledgerleaf", 30 s, 9:16

A small invoicing app for freelancers. Everything below is invented for the example.

- **Audience**: freelance designers who chase late invoices.
- **Promise**: Know which invoice to chase today.
- **Protagonist**: Priya, a freelance illustrator, and one invoice (#0087) followed through the app.
- **Before**: "I scroll my email to remember who still owes me."
- **After**: the Overdue list shows #0087 with a reminder already sent.
- **Problem in the viewer's words**: "Who still owes me money?"

**Hooks**: (1) "Who still owes you money? Scroll your email to find out." (2) "Three invoices. One is overdue. Which?" (3) "I once chased the wrong client for a week." **Chosen**: 1, a friction moment the viewer owns.

| Beat | Duration | Screen | What changes for the protagonist | Voiceover line | On-screen label | Carried object | Sound |
|---|---|---|---|---|---|---|---|
| Hook | 0 to 2.5 s | Invoice list, wide | Priya cannot tell what is unpaid | Who still owes you money? | (none) | none | Room tone, no music yet |
| Problem | 2.5 to 6 s | Same list, close on three similar rows | Three rows look identical | Three invoices, all look the same. | "Which one is late?" | none | Music enters, low |
| Turn | 6 to 10 s | Overdue filter | The late one floats to the top | One tap sorts them by days late. | "Sorted by days late" | chip "#0087" leaves the row | Soft tick |
| Journey 1 | 10 to 15 s | Invoice detail | She sees 12 days late and the client's last reply | Open it. Twelve days late, last reply Tuesday. | "12 days late" | chip "#0087" settles in the header | Whoosh |
| Journey 2 | 15 to 21 s | Reminder composer | A polite reminder is ready to send | A polite reminder is already written. | "Reminder ready" | chip becomes the message | Whoosh |
| Payoff | 21 to 25 s | Overdue list, reminder sent | #0087 now reads "reminder sent" | You send it, and move on. | "Reminder sent" | none | Hold, music lifts |
| Proof | 25 to 27.5 s | Same screen, footnote | (nothing new) | (silence) | "Real screens, demo data" | none | Music fades |
| CTA | 27.5 to 30 s | End card | | (none) | "Try Ledgerleaf" and example.com | none | Quiet |

Voiceover (about 34 words, about 14 s of speech in 30 s, so there is room to breathe):
1. Who still owes you money?
2. Three invoices, all look the same.
3. One tap sorts them by days late.
4. Open it. Twelve days late, last reply Tuesday.
5. A polite reminder is already written.
6. You send it, and move on.

Why it works: a felt problem, a protagonist, a chip whose situation changes on every screen, one hold on the payoff and one CTA that is never narrated.
