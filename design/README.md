# Design

Status, 10 October 2026, about 15:30: the team has its own identity (Rama's logo and palette), so the visual direction is settled. The comparison page `daleel-design-directions.html` leads with that brand applied to the three demo screens (panel 00), followed by the five highest-scoring layout directions from the art-director run (panels 01 to 05). Their colours are superseded; their layout ideas remain options.

| Path | What it is |
|---|---|
| `brand/tokens.css` | Brand colour tokens with measured contrast and the pairs that must never carry text |
| `dir-0.html` | The brand applied to Plan, Look Up and Ask |
| `dir-1.html` to `dir-5.html` | Route Band Signage, Lagoon After Dark, Hashiya Folio, Girih Screen, Mleiha Field Sheet |
| `specs/` | The eight direction specs, the three judges' scores, and the workflow journal |
| `daleel-design-directions.html` | The assembled comparison page |

To rebuild after editing a panel:

    python tools/build_design_panels.py
    python tools/assemble_design_page.py design/specs/workflow-journal.jsonl design design/daleel-design-directions.html

Still needed from Rama: the logo as SVG (or a transparent PNG) in `brand/`, and the names of the wordmark fonts. Marcellus and Noto Naskh Arabic stand in until then.
