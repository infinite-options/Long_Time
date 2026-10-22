# Long Time No See

A reunion game for web and mobile. Built with Expo, React Native, and Ably, the same stack as Every Circle.

Friends share a 6-character table code. Up to 16 people can sit down. Each phone has two tabs:

- **Keywords.** You get a different secret word for every other person, and no two words at the table are the same. When they say it, tap Heard it. Your card shows Done, and their phone pops up: "Alex just got you to say ELEPHANT!"
- **Bingo.** Each person gets a different 25 of the 30 stories. Tap a square and choose who claimed it. Five in a row, column, or either diagonal broadcasts that player's name to the table.

## Run it

```bash
cd ~/code/long-time-no-see
cp .env.example .env
# put your Ably key in EXPO_PUBLIC_ABLY_API_KEY
npm install
npm run web
```

`npm start` opens Expo for iOS and Android. Practice mode works on one phone with no key, so you can learn both games before the reunion.

## Ably

Create a free app at https://ably.com and copy the API key into `.env`.

In the Ably dashboard, add a channel rule for `^reunion:.*` with Persisted turned on. That lets a phone catch up if it joins late or refreshes. While people are still at the table, phones also exchange a snapshot, so a round still syncs if history is off.

The key is bundled into the app because it uses `EXPO_PUBLIC_`. For a private reunion, create a restricted key whose only capability is:

```json
{ "reunion:*": ["publish", "subscribe", "presence", "history"] }
```

Restart Expo after changing `.env`.

## How a table stays in agreement

Seats are dealt in the order people arrive and are not reshuffled. Words and bingo cards are computed from the table code plus those seats, so every phone agrees without a separate game server. Marks, heard-it taps, and Bingo calls travel as Ably messages. The same phone keeps its seat if the app is refreshed.
