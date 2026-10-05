# Multiplayer in the Existing World

Friends and games are part of the original Motherboard scene. There is one WebGL renderer and the same existing planets, characters, buildings, weather and transit system. No separate game world is loaded. `/play` redirects to the original page.

Open **World > Friends & games** or visit the game stations in Motherboard Commons. The new stations extend the central boulevard from local z=152 to z=225. Each station supports nearby E interaction, pointer selection, and a navigation button. Room setup and board games use a side panel; car racing and crew flight use the original full-screen world canvas.

## Local Run

Use Node 24.14 or later. Node's SQLite API stores room identities and results in the ignored `.data/friends.sqlite` database.

Run these commands in separate terminals:

```sh
npm run dev -- --hostname 127.0.0.1 --port 3001
npm run friends:server
npm run friends:relay
```

Prepare the Linux guest once:

```sh
npm run friends:prepare
```

On Windows with an enterprise certificate store, use `node --use-system-ca scripts/prepare-friends-pc.mjs`. Do not disable TLS verification.

Open `http://127.0.0.1:3001/?friends=1`. Create a room, choose a guest name, and share its invite link. Up to five clients can join; each gets an independent character color. A local URL is reachable only on this computer unless networking is deliberately configured.

## Activities

- **Race:** three car models, 1-10 laps, a looped circuit through the existing orbital neighborhood, server physics and finish timing. The original world camera follows the car. The completed round returns players to the Commons winner podium.
- **Chess:** exactly two ready players, legal moves through chess.js, 10- or 30-minute clocks per player, promotion, checkmate, draws, timeouts and resignation. Remaining room members can spectate.
- **Sudoku:** a generated common puzzle, per-player grids, pencil notes, conflict marking and server-validated completion times. Solutions are not sent to clients.
- **Target range:** a 60-second non-violent target shooting competition. Hits and firing cadence are checked on the server.
- **Table tennis:** two ready players, server-side Cannon physics, pointer/touch/keyboard controls, first to 11 with a two-point margin (hard cap 21), and concession.
- **Crew starship:** five seats, first boarder as captain, shared destinations and cabin/exterior view. Disembarking uses the existing transit platform on the actual selected planet.
- **Records:** each room stores the last podium and top three players per game. Results are applied once per match and survive server restarts. Guest identity is stored in this browser; clearing it creates a different player, not an authenticated account.
- **Voice:** microphone off by default; explicit permission enables peer-to-peer WebRTC within the room. Muting/leaving stops tracks. Other networks may require a configured TURN server.
- **Linux PC:** a real v86-emulated Buildroot Linux 6.8 guest, serial console, pause and state export/restore. It is a minimal Linux shell, not a modern desktop browser. Guest filesystem access does not expose host files.

The host selects the game and settings. Changing settings clears readiness. Players ready up before the host starts. Network controls expire when input stops; disconnected players have a 30-second reconnect grace period. Competitive records are intended for private casual rooms, not cheat-proof public tournaments.

## Guest Web Access

Enable **Internet** before booting the PC. Inside Linux:

```sh
uname -a
udhcpc -i eth0
wget -T 20 -qO- http://example.com
```

The default local guest relay is `http://127.0.0.1:8788/fetch?url=`. It accepts only configured local browser origins, public HTTP(S) GET/HEAD destinations on ports 80/443, and bounded responses. It validates and pins DNS addresses and checks redirects; private, loopback, metadata and reserved addresses are blocked. It strips host cookies and credentials. This is limited web retrieval, not unrestricted guest TCP networking, authenticated browsing, or a public proxy.

The relay also includes a restricted Wisp endpoint for separately configured clients. The built-in PC uses v86's HTTP backend. Keep the relay loopback-only; public hosting requires separate authentication, network isolation and egress policy.

## Internet Deployment

The portfolio frontend can remain on its existing host. The room server must be a long-running Node 24 service with WebSocket support and a persistent disk; it cannot run as an ordinary Vercel serverless function.

Room server environment:

```text
FRIENDS_HOST=0.0.0.0
FRIENDS_PORT=8787
FRIENDS_DATABASE=/data/friends.sqlite
FRIENDS_ORIGINS=https://your-portfolio.example
```

Build the frontend with `NEXT_PUBLIC_FRIENDS_URL=wss://your-room-server.example/friends`. Use TLS and an explicit origin allowlist. Run a single server instance with this SQLite implementation; horizontal scaling requires coordinated room ownership and shared persistence.

Optional TURN configuration: `FRIENDS_TURN_URLS` is a comma-separated list of TURN URLs; `FRIENDS_TURN_SECRET` is the private shared secret of a TURN REST-credential server. The server issues short-lived client credentials. Never set the secret in a `NEXT_PUBLIC_` variable.

For a separately secured hosted guest web relay, set `NEXT_PUBLIC_GUEST_RELAY=https://your-private-relay.example/fetch?url=`. The provided relay intentionally does not bind to public interfaces. Prepare and include Linux assets in the frontend build; they are ignored in Git. Runtime firmware and kernel sources, sizes, and SHA-256 hashes are recorded by the preparation script. Preserve the upstream licenses and source obligations if redistributing guest images.

No cloud resources are provisioned automatically. No deployment or Git push is part of local setup.

### Render Setup for This Site

The repository's `render.yaml` defines only the multiplayer room service. It
does not move or rebuild the Vercel website and does not expose the local Linux
guest relay. Its allowed browser origin is:

```text
https://portfolio-pied-one-ko0zgnyz2r.vercel.app
```

The template selects a paid `0.5c-512mb` service and a 1 GB persistent disk.
Review the current price in Render before approving creation. Render's free
service cannot attach the persistent disk required to retain the SQLite room
identities and records across restarts. A local configuration file alone does
not create an account, deploy a service, or incur hosting charges.

1. Create an account at <https://dashboard.render.com/register>, using GitHub sign-in if convenient. Complete sign-in and any billing steps directly in Render; do not share passwords, tokens, or payment details in chat.
2. Publish the prepared `render.yaml` to `sahil-lab/portfolio` when ready. Until it is committed and pushed, Render cannot load the local template.
3. In Render, choose **New > Blueprint**, connect `sahil-lab/portfolio`, select the branch containing the template, and review the service and disk costs. Approve creation only after accepting those costs. Keep one instance; SQLite and active rooms are not shared across multiple server instances.
4. Wait for the service to become live. Open its actual Render HTTPS address with `/health` appended. It should return `{"ok":true,"capacity":5}`. Use the hostname Render assigns; the template's service name does not guarantee a particular public hostname.
5. In **Vercel > Project > Settings > Environment Variables**, set `NEXT_PUBLIC_FRIENDS_URL` for Production to that hostname with `wss://` and `/friends`, for example `wss://your-assigned-host.onrender.com/friends`. This example hostname is a placeholder, not a running service.
6. Redeploy the frontend so the public variable is included in its browser build, then open **World > Friends & games** and test creating a room and joining it from a second browser.

Use the exact origin above, without a trailing slash, for browser testing.
Other Vercel preview addresses are intentionally not authorized. If the public
website address changes, update `FRIENDS_ORIGINS` explicitly; do not use a
wildcard origin. Automatic deploys are disabled in this template because a
server restart disconnects active games. Deploy backend updates manually from
Render. Persistent records survive, but in-progress matches are held in memory.

The service runs Node 24, binds on `0.0.0.0:10000`, checks `/health`, and writes
SQLite files beneath `/var/data`. Render terminates TLS for public WSS traffic.
Voice on restrictive networks may still need the optional TURN configuration
described above. This setup does not provision TURN or hosted guest networking.

## Verification

```sh
npm run test:friends
npx tsc --noEmit --incremental false
npm exec --yes --package=playwright -- node scripts/check-friends-world.cjs
npm exec --yes --package=playwright -- node scripts/check-friends.cjs
npm exec --yes --package=playwright -- node scripts/check-friends-pc.cjs
```

Browser checks use installed Microsoft Edge. The current-world check requires the same renderer, scene and planet identities throughout the journey, validates walk-up stations and disembarking, and captures desktop/mobile output. The game check uses two browsers plus three additional WebSocket clients, real peer audio packets, game results and guest web retrieval. Browser evidence is written under ignored `outputs/playtest/` directories. Emulated mobile viewports are not physical-device certification.
