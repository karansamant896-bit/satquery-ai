# SatQuery AI — Pre-Hackathon Build Checklist

## Models
For each selected tool, have checkpoint/weights, source, license, input shape, supported modality, sample command/API, runtime, memory expectation, and one known-good output.

## Adaptation
Prepare one defensible adaptation path before the event: base model, dataset/subset, adaptation method, saved checkpoint, validation sample, and explanation of how the adapted component is used.

## GeoTIFF
Have sample files for single optical, single SAR, optical+SAR, before/after. Verify open, metadata, preview, normalize, resize/tile, and derived visualization.

## Tool Registry
Pre-register VQA, captioning OR grounding, change analysis, optical-SAR analysis.

## Demo Prompts
Prepare 2–3 robust prompts per task.

## Demo Data
Keep a small known-good local dataset so the demo never depends on finding data during the event.

## Compute
Test model startup and one inference; record runtime, peak memory, and exact machine/GPU.

## Fallbacks
Define primary tool + fallback tool/deterministic safe path for each mandatory task. A fallback must never fabricate scientific results.

## Freeze
Confirm checkpoints load, sample inputs parse, all mandatory demo journeys pass, report downloads, execution trace is visible, and model/tool names are accurate.
