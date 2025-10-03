# What The Warfighter? Challenge

## Overview
Make AI and robotics work with the modern warfighter – on the frontline. Participants collaborate with Milrem and Millog to build battlefield-ready tools that turn raw ideas into immediate operational solutions supporting Ukrainian front-line forces.

## Shared Context
Every order, gesture, and sensor ping can save or cost lives. Solutions must respect contested environments, low bandwidth, and GPS-denied conditions while remaining resilient, secure, and quickly deployable.

### Provided Equipment
- Logitech C270 webcams
- Raspberry Pi devices
- Optional game engine (Unity or Unreal Engine) for mission planning and higher-level logic simulations

### Prizes
1. €1000
2. €500
3. €250

### Winning Criteria
- Uniqueness: 70%
- Feasibility: 30%

### Mentors
- Kimmo Laine, Milrem Robotics, Managing Director
- Petri Suurnäkki, Milrem Robotics, Systems Architect
- Heikki Löytty, Millog, Marketing Manager
- Rasmus Basilier, Millog, Development Manager

---

## Path 1 – AI for Front and Rear
Turn raw, unstructured battlefield inputs into clear, actionable decisions and support fighters with maintenance or repair tasks.

### Target Capabilities
- Generative AI copilot that ingests chat logs, sensor snippets, and doctrine to draft 5-paragraph OPORD/FRAGOs and standard reports (e.g., EOINCREP, CASEVAC) with citations and confidence flags
- Automatic translation across NATO, national, and machine-readable schemas for shared situational awareness under low-bandwidth constraints
- Edge vision models (e.g., Segment Anything + lightweight classifiers) that compress image insights into concise text alerts instead of streaming video
- Local small-language-model maintenance assistant guiding repairs and troubleshooting, recording actions, and syncing compressed deltas when intermittent connectivity returns
- Robust operation under GPS spoofing and near-zero bandwidth, with secure reconciliation to C2 and maintenance systems once connectivity resumes

### Potential Solution Components
- Edge vision frameworks
- LLM + RAG pipelines
- Segment Anything
- Speech recognition toolkits (e.g., VOSK)
- Object detection models (e.g., YOLOv8)
- Model optimization for constrained devices (e.g., TensorRT)
- Retrieval-Augmented Generation frameworks
- Structured output enforcement (e.g., Pydantic)

---

## Path 2 – Working with Robots
Give ground robots intuitive, human-friendly interaction skills and coordinate expendable robots for scouting and breach support missions.

### Target Capabilities
- Gesture and voice-controlled interactions allowing warfighters to guide robots via natural commands and simple beacons
- Relative navigation using chained cues so rovers can shadow troops or navigate corridors when GNSS is jammed, with graceful fail-safes for lost commands
- Expendable robots detecting mines and tripwires, dropping IR/visual breadcrumbs, sharing detections over lightweight mesh networks, and cueing a mothership UGV for breach operations
- Swarm data fusion combining drone/UGV imagery to generate lane-clearing plans while maintaining strict bandwidth discipline (text-first reports, cropped evidence only)

### Potential Solution Components
- Hand signal interpretation (computer vision)
- Edge vision and image recognition pipelines
- Edge AI deployment
- Voice command processing (NLP)
- Droppable beacons (IR, acoustic, etc.)
- Relative movement planning
- Mission planning and data-fusion systems

---

## Challenge Recap
Both paths demand rugged, low-bandwidth, secure systems that put actionable intelligence and robotic assistance directly in the hands of modern warfighters. Teams should balance cutting-edge AI/robotics with battlefield constraints to deliver prototypes that can make a real impact.
