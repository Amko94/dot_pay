#dot_pay — the .pay file format

Open, non-custodial file format for portable “digital cash”. Simple JSON with optional signatures and replay protection.

Status: pre-alpha • Goal: ship a walking-skeleton MVP (.pay create + open/verify, alg=none).

MVP scope

Create a .pay JSON with amount, asset, jti, createdAt, optional exp/note.

Open & validate basic rules; no signature when alg=none.

Roadmap (short)

Schema validation • Ed25519/ES256 signing • Replay registry • UX polish

—
Track progress via Issues/Projects. PRs welcome after v0.1.
