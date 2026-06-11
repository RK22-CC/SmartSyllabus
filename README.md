# SmartSyllabus
 
A client-side web app that turns postsecondary course syllabi into a semester planning dashboard. Upload a PDF or text syllabus and get automated assessment extraction, workload risk scoring, a grade simulator, and a week-by-week study strategy — all saved locally in your browser with no backend required.
 
---
 
## Features
 
- **Syllabus parsing** — extracts assessments, weights, due dates, and bonus marks from PDF or text syllabi using the Anthropic API
- **Risk scoring** — rates workload pressure (0–100) based on deadline clustering and high-weight assessment concentration
- **Grade simulator** — enter real or hypothetical scores for each assessment; live-calculates your projected grade and the minimum final exam score needed for any target grade (A+ through Pass)
- **Bonus mark tracking** — bonus/extra-credit assessments are tracked separately with `+N%` display and included in grade projections
- **Week-by-week study strategy** — generated relative to today's date; one entry per Monday–Sunday week, with a single collapsed block for the final exam period
- **Manual date entry** — assessments without a listed date show a date picker; picking a date automatically regenerates the study strategy
- **Multi-course support** — up to 5 courses saved simultaneously, each with its own page and nav button
- **Persistent storage** — all analysis data and simulator scores are saved in `localStorage`; no server, no account
---
 
## File Structure
 
```
index.html                     # Landing page with hero, features, FAQ
course1.html – course5.html    # Per-course analysis pages
syllabus-reader.js             # All app logic (shared across all pages)
templatemo-catalyst-style.css  # Base stylesheet
templatemo-catalyst-script.js  # Nav toggle and scroll reveal helpers
```
 
---
 
## Setup
 
### 1. Get an Anthropic API key
 
Sign up at [console.anthropic.com](https://console.anthropic.com) and create an API key.
 
### 2. Add your key to the JS file
 
Open `syllabus-reader.js` and find this line (around line 240):
 
```js
const ANTHROPIC_KEY = 'YOUR_ANTHROPIC_KEY_HERE';
```
 
Replace the placeholder with your actual key.
 
### 3. Open locally
 
No build step or server required. Open `index.html` directly in a browser, or serve the folder with any static file server:
 
```bash
npx serve .
# or
python3 -m http.server 8080
```
 
> **Note:** The Anthropic API requires the `anthropic-dangerous-direct-browser-access: true` header for direct browser calls. This is already included in the fetch request. Do not expose your API key in a public deployment.
 
---
 
## How It Works
 
### Analysis pipeline
 
1. User clicks **Add Course Syllabus** and uploads a `.pdf` or `.txt` file
2. PDF text is extracted client-side using [PDF.js](https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js)
3. Extracted text (up to 15,000 characters) is sent to `claude-sonnet-4-5` with a structured JSON prompt
4. The model returns a single JSON object containing course metadata, assessments, risk score, grading scale, and weekly strategy
5. The result is saved to `localStorage` under `sr_course_N` and rendered on the course page
### Data schema returned by the API
 
```json
{
  "courseName": "string",
  "courseCode": "string | null",
  "courseEndDate": "YYYY-MM-DD | null",
  "assessments": [
    {
      "name": "string",
      "type": "exam | assignment | lab | quiz | project | participation | other",
      "weight": number,
      "bonus": boolean,
      "date": "string | null",
      "description": "string"
    }
  ],
  "riskScore": number,
  "riskFactors": ["string"],
  "weeklyStrategy": [
    { "period": "string", "focus": "string", "tasks": ["string"] }
  ],
  "gradingScale": {
    "A+": number, "A": number, "A-": number,
    "B+": number, "B": number, "B-": number,
    "C+": number, "C": number, "Pass": number
  }
}
```
 
### Grade simulator logic
 
The simulator calculates projected grade as:
 
```
grade = Σ(score_i × weight_i) / 100  +  Σ(bonus_score_j × bonus_weight_j / 100)
```
 
For a target grade `T`, the minimum final exam score needed is:
 
```
needed = (T × 100 − Σ(non-final scored contributions)) / final_weight
```
 
### localStorage keys
 
| Key | Contents |
|---|---|
| `sr_course_1` … `sr_course_5` | `{ analysis, savedAt }` — full API result + timestamp |
| `sr_scores_1` … `sr_scores_5` | `{ "score-0": 85, "score-2": 72, … }` — simulator inputs |
| `sr_storage_version` | Version flag used to clear stale default data on first load |
 
---
 
## Grading Scale
 
Default scale used when the syllabus doesn't specify one:
 
| Grade | Minimum % |
|---|---|
| A+ | 90 |
| A | 85 |
| A- | 80 |
| B+ | 77 |
| B | 73 |
| B- | 70 |
| C+ | 67 |
| C | 63 |
| Pass | 50 |
 
---
 
## Limitations
 
- Analysis quality depends on how clearly the syllabus is structured. Scanned PDFs with no text layer will not parse correctly.
- The API key is stored in plain text in `syllabus-reader.js`. Do not deploy this publicly without moving the key to a backend proxy.
- `localStorage` is browser and origin-specific. Clearing browser data will erase all saved courses.
- PDF extraction is capped at 20 pages to stay within API token limits.
