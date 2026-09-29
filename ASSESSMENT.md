# ICE Task 3 — Local edge AI assessment (brief Task 1)

Student: Jacobus de Vaal · ST10540900

Read the original README.md in full before starting. This extension preserves the original dashboard. Its actual stack is React/Vite and Node/Express, even though the brief calls it plain HTML/CSS/JavaScript. No website deployment is needed.

Verification performed here is recorded in `assessment/VERIFICATION.md`. All three model paths have run locally in the Linux test workspace; browser appearance and your Windows run still need confirmation.

## 1. GitHub steps to complete in your own account

1. Visit https://github.com/The-ProfessorGG and click **Follow**.
2. Visit https://github.com/The-ProfessorGG/global-situation-dashboard and click **Star**.
3. Click **Fork**, select your account and create the fork.
4. Clone YOUR fork with Git, replacing YOUR_USERNAME below:

```powershell
git clone https://github.com/YOUR_USERNAME/global-situation-dashboard.git
cd global-situation-dashboard
Get-Content README.md
```

Copy the contents of this assessment package into that clone, allowing replacement of its updated source files. Do not copy a separate .git directory. The package excludes .git, dependencies, model weights and Python environments. Check `git remote -v` still points to your fork before committing.

Follow/star/fork were NOT performed on your behalf. Keep screenshots or the fork URL as evidence. Starter inspected at commit `3271f51137307db72195898dc7a3074038825f38`.

## 2. Start A and B on Windows

Use Node.js 22.12+ (or a compatible newer release), npm and Git. The installed Vite requires Node `^20.19.0 || >=22.12.0`; simply having any Node 20 release is insufficient.

1. Double-click `SETUP-WINDOWS.cmd`. It installs dependencies, checks the models and builds the app.
2. Double-click `START-DASHBOARD.cmd`.
3. Open http://127.0.0.1:5173 in your browser. Keep both terminal windows open.
4. The **EDGE AI ASSESSMENT** panel appears at the top of the right sidebar.
5. Wait for earthquake, volcano and cyber data to load. Select **Freeze dashboard**.
6. Run A, run B, then **Compare 20 runs**. Download the evidence JSON.

Equivalent manual commands, in two terminals opened in the project folder:

```powershell
npm ci
npm run server
```

```powershell
npm run dev
```

A and B do not require Ollama. The starter's separate free-text assistant still requires `ollama pull llama3.1` and a running local Ollama service as explained in the original README. It is not model A, B or C.

## 3. Purpose and interpretation of each model

### A — deterministic fixed-rule expert model

Purpose: prioritise review of supplied event records consistently. Known exploitation takes highest priority; otherwise earthquake magnitudes use classroom thresholds 3, 5 and 7, and CVSS uses thresholds 4, 7 and 9. Open volcano records receive routine review priority without asserting eruption severity. Missing numerical fields return UNKNOWN.

Value: transparent reasons and exact repeatability. Limitation: this is a small rule-based model, explicitly permitted by the brief, not a trained predictor. Earthquake magnitude alone cannot measure impact, and CVSS alone cannot establish local compromise.

### B — probabilistic categorical model

Purpose: show how sampling changes output while holding the input fixed. It uses A's ordinal band as the centre of a hand-specified distribution over four review-priority labels:

`P(K=k | x) = exp(-(k-b(x))^2 / (2*0.85^2)) / sum_j exp(-(j-b(x))^2 / (2*0.85^2))`

`k,j ∈ {0,1,2,3}`; `b(x)` is A's band. Each run draws a fresh random value and samples one label for each supported event. Missing attributes remain UNKNOWN. The probability vector is stable; the sampled label may change. A fixed seed is not used in normal runs.

Value: a directly inspectable probability distribution and a reproducible explanation of the mechanism. Limitation: these probabilities are educational assumptions, not learned or calibrated probabilities of harm. Variation alone does not demonstrate accuracy, and repeated sampled results are possible. Both A and B are intentionally small non-LLM models.

### C — Tencent R3-Skill

Purpose: match a dashboard question to an appropriate local analysis routine. The actual Tencent R3-Embedding-0.6B model recalls four candidates from a five-routine library; Tencent R3-Rerank-0.6B reranks them. The best routine runs a fixed local summariser over the supplied events.

Value: demonstrates neural semantic retrieval connected to dashboard data. Limitation: C is a skill router, not a general text-generation model or a third mutually exclusive randomness category. Routing uses the question plus the first five event records, capped at 1,024 model tokens; the selected summariser uses all supplied events. Scores are ranking values, not confidence probabilities. A top match can still be wrong or unsupported by available data.

## 4. Install and run Tencent locally

Install Python 3.12 (including the Windows `py` launcher). Allow several GB of disk space for dependencies and two model downloads. CPU is selected explicitly so this path does not depend on NVIDIA/CUDA or AMD GPU support.

1. Run `SETUP-R3-WINDOWS.cmd`. Downloads require internet, but no dashboard data is sent to a cloud AI service.
2. Run `START-R3-WINDOWS.cmd`. Wait for `Tencent R3-Skill ready`.
3. Keep the two dashboard terminals open too. Freeze a snapshot and enter a routing question in the assessment panel, for example: “Which skill can review earthquake magnitudes in these events?”
4. Click **Run C: Tencent R3-Skill** and save the evidence JSON. Verify the selected routine and its summary against the frozen data.

Manual setup if needed:

```powershell
py -3.12 -m venv .venv
.venv\Scripts\python.exe -m pip install torch --index-url https://download.pytorch.org/whl/cpu
.venv\Scripts\python.exe -m pip install -r assessment\r3-requirements.txt
.venv\Scripts\python.exe scripts\download_r3.py
.venv\Scripts\python.exe server\r3_service.py
```

Inference sets `HF_HUB_OFFLINE=1` and `TRANSFORMERS_OFFLINE=1`, uses local paths and `local_files_only=True`, and does not execute remote model code. If C cannot load, its error is reported; no fake or fallback Tencent result is produced. Model downloads are separate from inference.

## 5. Comparison and evidence

Keep the event snapshot frozen; do not refresh it between repeated runs. The SHA-256 identifies the normalised input, not the original live feed response. A valid A comparison has one distinct substantive output across 20 runs. B may have multiple distinct outputs; equality on a few draws is allowed. UNKNOWN-only snapshots will not vary.

The **Load labelled demo** button uses synthetic records, useful for testing when feeds are unavailable. Its export is explicitly labelled synthetic and must not be submitted as proof of live data. The model panel includes only fetched earthquakes, volcanoes, CVEs and KEV records; it excludes the starter's hard-coded example markers and simulated aircraft/vessels. Some starter cyber locations are display placeholders and are not used by the priority rules.

Collect on your PC:

- Your fork URL and follow/star evidence.
- Browser screenshot showing the localhost address and loaded global event data.
- A/B repeat-run result and its downloaded snapshot/evidence JSON.
- C's actual ranked skills and summary with the local Python service running.
- The short model note below, adjusted only to match what actually ran.

The original dashboard retrieves public feeds and some assets over the internet. This is distinct from cloud AI inference, which this extension does not use. Some feeds may be blocked, rate-limited or empty. An empty feed is not evidence of zero events. CISA is fetched through the starter's third-party CORS proxy; data freshness should be checked at its source.

## 6. Short deliverable note — use after confirming the local runs

“Model A is a deterministic rule-based model that assigns the same review priority to identical dashboard inputs. Model B is a probabilistic categorical model that samples a priority from a hand-specified distribution, so repeated runs on the same frozen inputs can differ. Model C uses Tencent's locally stored R3 embedding and reranking models to select an analysis routine, with all model inference performed on my machine.”

Do not use the last sentence as a completion claim until C actually runs on your machine. If installation fails, record the attempted commands and exact error, consistent with the brief's ‘see if you can install’ wording.

## References

The-ProfessorGG (n.d.) *Global Situation Dashboard*. Available at: https://github.com/The-ProfessorGG/global-situation-dashboard (Accessed: 29 September 2026).

Tencent (2026) *R3-Skill: Skill Is Not Document*. Available at: https://github.com/Tencent/R3-Skill (Accessed: 29 September 2026).

Tencent (2026) *R3-embedding-0.6b*. Available at: https://huggingface.co/tencent/R3-embedding-0.6b (Accessed: 29 September 2026).

Tencent (2026) *R3-rerank-0.6b*. Available at: https://huggingface.co/tencent/R3-rerank-0.6b (Accessed: 29 September 2026).


## ICE Task 4 — Query, Record, and Reflect (brief Task 2)

The dashboard now includes a **ICE TASK 4 — STANDARD QUESTIONS** control in the Edge AI Assessment panel. Use a frozen live dashboard snapshot, then select **Run standard questions ×2**. The application sends the exact six lecturer-supplied questions to Model A and Model B twice each while keeping the snapshot hash fixed.

The ICE Task 4 evidence view shows:

- the exact six standard questions;
- Model A Run 1 and Run 2;
- Model B Run 1 and Run 2;
- the SHA-256 of the frozen normalised dashboard input;
- the number of unique answer sets produced by each model; and
- a downloadable `ice-task-4-standard-questions-evidence.json` (earlier exports used `task2-standard-questions-evidence.json`) file.

Model A answers are derived from the same fixed review rules already used for event classification. Model B first samples its event review priorities from the existing hand-specified categorical distributions and then derives its answers from that sampled view. As a result, Model A should repeat exactly while Model B may differ between runs.

The weekly volcano question is deliberately conservative: the live EONET panel supplies current open records, not a complete weekly historical time series. Both models therefore state that an up/down weekly trend cannot be established from the frozen point-in-time snapshot rather than inventing a trend.

For the video, keep the ICE Task 4 table and snapshot hash visible while briefly showing both repeated runs. The existing **Compare 20 runs** control remains useful as additional consistency evidence, but it does not replace the required six-question demonstration.


### ICE Task 4 improvements — model version 1.2.0

Each question now shows whether A and B changed between the two runs. The result also exports a per-question comparison and completion timestamp. Identical probabilistic draws remain valid: variation measures consistency, not accuracy, and two runs do not estimate reliability.

New downloads include the assignment label, schema version, snapshot capture time, export time, synthetic-data flag, source and full results. Snapshots contain analysis fields only, excluding globe rendering objects. Capture time is not a guarantee that all feeds are fresh. The snapshot hash still identifies the normalised model input.

Seismic answers now distinguish magnitudes below the classroom threshold of 5. Cyber review priority follows the actual rule-based severity and excludes invalid CVSS values. Regional answers explicitly cover earthquake records only; the supplied locations cannot establish overall multi-hazard regional risk.

Validation: eight automated model tests passed, including low-severity inputs, invalid CVSS, repeated answers and identical probabilistic results. A browser visual check and full frontend build were not performed in this update.

The earlier corrected evidence remains a historical version 1.1.1 run. Keep it unchanged. Generate a new ICE Task 4 export after updating the local code to demonstrate version 1.2.0; do not relabel earlier outputs as results from the new version. Video work is deferred.
