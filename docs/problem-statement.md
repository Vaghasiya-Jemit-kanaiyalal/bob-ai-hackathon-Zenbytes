
# Problem Statement

## Background

Urban freight and last-mile logistics in India operate under extreme pressure. A typical mid-sized fleet operator in a city like Pune, Bengaluru, or Mumbai manages 50–200 vehicles simultaneously across dozens of routes — serving e-commerce warehouses, FMCG distributors, and port logistics corridors such as JNPT and Chennai Port. These fleets generate enormous volumes of trip data every day: GPS tracks, fuel logs, driver behaviour events, delivery timestamps, and maintenance records.

## The Problem

Fleet managers and dispatchers have no real-time, unified view of what is happening across their fleet. Critical risk signals — a vehicle running 38 minutes late on NH-48, a driver repeatedly triggering hard-braking events, a truck overdue for maintenance — are buried in spreadsheets, siloed in separate vehicle-tracking software, or simply never surfaced at all. When something goes wrong, the diagnosis is reactive: managers piece together information from three or four disconnected tools after the incident has already caused a delay, a delivery failure, or a road accident.

More specifically: there is no AI-driven early-warning system that scores each vehicle and trip for risk *before* the situation escalates, and there is no conversational interface that lets a dispatcher ask plain-language questions like *"Which vehicles on NH-48 are at critical risk today?"* and get an instant, grounded answer.

## Who is Affected

- **Fleet dispatchers** at logistics companies managing 20–500 vehicles — they need instant visibility into which trips are delayed and which vehicles need intervention, without digging through raw GPS logs
- **Fleet managers and operations leads** who need daily risk summaries, fuel efficiency trends, and route performance reports to make staffing and routing decisions
- **Safety officers** at transport companies who must track driver behaviour events (speeding, hard braking, lane departure) and flag repeat offenders before a serious incident occurs
- **Small and mid-size logistics operators** who cannot afford expensive enterprise telematics platforms and rely on CSV exports from basic GPS trackers

## Why It Matters

- **Safety**: Critical-risk vehicles on highway routes are a direct road-safety hazard. Undetected repeated speeding or lane-departure events increase accident probability significantly
- **Revenue loss**: A delayed freight trip on a corridor like South Port–JNPT can incur demurrage charges of ₹5,000–₹20,000 per hour; a single critical-risk vehicle flagged and rerouted early can recover that cost entirely
- **Fuel waste**: Without per-vehicle fuel efficiency scoring, operators have no visibility into which vehicles are consuming 20–30% more fuel than the fleet average — a direct operating cost that compounds daily across a large fleet
- **Driver accountability**: Without behaviour scoring, high-incident drivers continue operating with no structured feedback loop, increasing insurance premiums and liability exposure

## Why Existing Solutions Fall Short

Basic GPS tracking platforms (common in Indian mid-market fleets) show live vehicle positions but provide no risk intelligence — they do not score trips, aggregate driver behaviour, or flag anomalies proactively. Enterprise telematics suites (Trimble, Geotab) solve the data problem but cost ₹3,000–₹8,000 per vehicle per month and require dedicated implementation teams, putting them out of reach for most operators. Manual CSV-based reporting — the most common approach — is retrospective by nature, takes hours to compile, and has no predictive or conversational capability. None of these options offer an AI copilot that can answer free-form operational queries over the fleet's own data in real time.