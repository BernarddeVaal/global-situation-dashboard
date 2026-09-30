# ICE Task 4 — Query, Record, and Reflect

Jacobus de Vaal · ST10540900

## Implementation

Model A is a deterministic rule-based model: fixed earthquake magnitude and cybersecurity severity thresholds produce repeatable review priorities from identical inputs. Model B is a probabilistic categorical model: it samples priorities from hand-specified distributions centred on Model A's classification. Both run locally in Node.js and answer the same six standard questions twice using one frozen snapshot. The probabilities are educational assumptions, not trained or calibrated probabilities of harm.

Source: [models.js](../server/edge/models.js). Setup: [ASSESSMENT.md](../ASSESSMENT.md).

## Recorded-run evidence

[Download or inspect the evidence JSON](ice-task-4-standard-questions-evidence.json).

- Model version: 1.2.0.
- Captured: 30 September 2026, 14:24:32 South African time.
- Input: 89 fetched dashboard records — 37 earthquakes, 32 open volcano records and 20 cyber records.
- Six questions, two runs per model.
- Model A: one unique answer set; 21 HIGH/CRITICAL items in both runs.
- Model B: two unique answer sets; 30 then 35 HIGH/CRITICAL items.
- Model A earthquake region: Balleny Islands region in both runs.
- Model B earthquake regions: Balleny Islands region, then New Caledonia.
- Maximum earthquake magnitude: 5.6 near Yonakuni, Japan.
- Cyber review priority: CRITICAL; CVE-2026-100762, CVSS 9.6.
- Weekly volcano trend: cannot be established from a single snapshot.
- Snapshot SHA-256: `cd13c0b99f460c7923dcf52de1186d47df8c7c03bec062171a3965182dd1c7dd`.

The evidence was checked against the model's normalisation and hashing functions, and Model A's answers were independently reproduced. Repeatability is not a measure of accuracy; two sampled runs do not establish reliability. Geographic rankings cover earthquake records only.

## Video

Recording filename: `2026-09-30 14-24-06.mp4`.

The video is supplied separately through the college submission portal or an accessible video link. It is not contained in this GitHub repository. The repository link alone therefore does not deliver the video.

## Submission items

- This repository provides the runnable code, model identification note and recorded-run evidence.
- Attach the video separately when submitting.
- Follow the source author and star the source repository as required by the brief; those actions are not verified by this document.
