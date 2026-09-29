# Verification record — 29 September 2026

These checks were performed in a Linux execution workspace, not on the student's Windows PC.

| Check | Result |
|---|---|
| Full starter README read | Completed before dependency installation |
| Starter source | The-ProfessorGG/global-situation-dashboard, commit 3271f51137307db72195898dc7a3074038825f38 |
| Production frontend build | Passed; Vite warns about the starter's large JavaScript bundle |
| A/B model checks | 3 tests passed: rule boundaries, missing data, probability normalisation and sampling |
| Synthetic fixed-input comparison | 20 runs: A = 1 unique output; B = 15 unique outputs |
| Actual USGS snapshot comparison through Vite proxy and Node backend | 39 records, 20 runs: A = 1 unique output; B = 20 unique outputs |
| Actual Tencent weight download | Both R3-embedding-0.6b and R3-rerank-0.6b downloaded |
| Tencent offline CPU inference | Passed; earthquake-review ranked first for an earthquake question |
| Tencent through the local Vite → Node → Python API path | HTTP 200; selected earthquake-review and summarised 39 real USGS records, maximum magnitude 5.4 |
| Missing Tencent service | Returns HTTP 503 and an explicit unavailable message; no fake result |
| Browser visual verification | Not completed: Chromium launch was blocked by the execution environment's socket restrictions |
| Follow, star and fork in student account | Not completed; requires the student's GitHub account |
| Run on student Windows PC | Not yet completed |

Evidence files:

- `local-evidence.json`: explicitly synthetic comparison fixture and all outputs.
- `live-usgs-evidence.json`: retrieved source URL, feed timestamp, normalised events and all comparison outputs.
- `r3-evidence.json`: Tencent inference on the labelled synthetic fixture.
- `r3-live-api-evidence.json`: actual Tencent API output on the real USGS snapshot.

Node version used: 24.19.0. Python version used: 3.12. Tested Python packages: torch 2.14.0+cpu, sentence-transformers 5.7.0, transformers 5.17.0, huggingface_hub 1.33.0, numpy 2.5.3. Windows installation remains to be verified.

A Vite watcher-limit issue caused by the Python environment/model folders was fixed by excluding `.venv` and `models` from watching. The API path was retested successfully afterwards.

Model probabilities are not calibrated hazard probabilities. The successful routing example is a smoke test, not a measured retrieval-accuracy benchmark. No trained-model performance claims are made.
