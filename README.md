# YatraMitra

YatraMitra is a React and TypeScript prototype for discovering Rajasthan heritage, local food and crafts, planning trips, finding travel companions, and browsing a map. It preserves the project’s indigo, cream and saffron identity and supports English and Hindi.

## Run locally

```powershell
npm install
npm run dev
```

Production checks:

```powershell
npm run build
npm run lint
```

## Routes

- `/` — destination search and featured experiences
- `/explore` and `/destination/:id` — destination discovery and guides
- `/planner` — editable itineraries, budget estimates, local saving and route map
- `/buddies` — simulated traveller matching, requests and chat
- `/experiences` — food and craft catalogue with image previews
- `/map` and `/hotels` — destination map and sample hotel listings
- `/about`, `/privacy`, `/terms`, `/feedback` — project information and local feedback

## Data and integrations

There is no backend, database, account service, booking provider, or live traveller-messaging integration. Demo profile/authentication data, saved itineraries, and buddy interactions remain in browser local storage. Feedback is saved locally and is not transmitted.

OpenStreetMap tiles and the public OSRM routing endpoint support maps and driving-route estimates without an API key; availability and rate limits are controlled by those providers. Google Maps links open externally for directions and searches. Heritage narration uses the browser’s speech-synthesis voices. Verified image records reference Wikimedia Commons; loading and attribution depend on the remote source.

Visitor hours, closures, ticket amounts, sample hotel rates, food/vendor suggestions, and buddy profiles are labelled as unverified or demo data where applicable. Confirm current details with official venues and providers. The app does not claim bookings, live prices, identity verification, emergency response, or real messaging. The browser’s emergency-information panel cites India’s 112 number; it does not verify local service availability.
