# FOHClock

This module controls and monitors the FOHClock app on an iPhone or iPad.

## Setup

### FOHClock Relay (recommended)

1. Open **Settings → Companion Relay** in FOHClock and copy the device ID.
2. In Companion, add a FOHClock connection and select **FOHClock Relay**.
3. Enter the device ID. No IP address or port is required.
4. Optionally set a **Nickname**, shown to FOHClock when approving the pairing (defaults to the connection's own name in Companion if left blank).
5. Approve the new Companion pairing in FOHClock.

The pairing is remembered until it is removed in the app or by an administrator. Several Companion installations can be paired with the same device. FOHClock must be active to receive commands; a command sent during a brief disconnect is held for up to ten seconds.

### Local HTTP fallback

1. Open **Settings → Lokalt HTTP-API (reserve)** in FOHClock.
2. Enable **HTTP API** and keep FOHClock active with the screen awake.
3. Select **Local HTTP fallback** in the Companion connection.
4. Enter the complete address shown by the app (or only its IP address), port `8080`, and the access code.
5. The Companion computer and iPhone/iPad must be on the same local network.

Relay mode receives live status over a persistent secure connection. Local mode polls the app; the default 250 ms interval provides a responsive button display.

## Presets

The module includes ready-made buttons for:

- live timer display, plus separate hours/minutes/seconds displays;
- clock, stopwatch, and countdown modes;
- 10 and 30 seconds;
- 1, 5, 10, 15, and 30 minutes;
- 1 hour;
- start/resume, pause, and stop/reset;
- −5, −1 minute, −10 seconds, +10 seconds, +1, +5 minutes to adjust the active timer.

The duration presets select countdown mode and load the chosen duration. They do not start the timer automatically. The adjust-time presets add or subtract time from whichever timer is currently active (stopwatch or countdown) without stopping or resetting it.

## Actions

- **Set display mode** selects clock, stopwatch, or countdown.
- **Set countdown duration** accepts separate hours, minutes, and seconds.
- **Set current timer value** changes the displayed stopwatch or countdown value without changing whether it is running.
- **Adjust active timer** adds (or, with a negative number, subtracts) seconds from the active stopwatch or countdown without stopping or resetting it. For a countdown this shifts the remaining time; for a stopwatch it shifts the elapsed time.
- **Timer transport** starts/resumes, pauses, or stops and resets the timer.

In FOHClock, stop is represented by the API reset command: it stops the timer and returns it to its configured starting value.

## Variables

`display` is the formatted live time and is the most useful button-text variable. `hours`, `minutes`, and `seconds` are the same value split into its two-digit components, for buttons that show only one unit; before the first successful poll they read `HH:MM:SS` and `HH`/`MM`/`SS` so buttons never show blank text. The module also exposes mode, state, running/overtime flags, duration, elapsed time, current value, displayed seconds, and server time.

`update_available` and `latest_version` reflect whether a newer module release exists on GitHub (checked once at startup, then every 24 hours). Companion cannot install it automatically — download the new `.tgz` from the release and use **Import module package** to update.

## Troubleshooting

- **Pairing awaiting approval:** open FOHClock and approve the Companion shown under **Companion Relay**.
- **Bad relay configuration:** enter the complete device ID shown by FOHClock.
- **Bad local configuration:** enter the IP address, hostname, or complete `http://...:port` address shown by FOHClock.
- **Authentication failure:** copy the current access code from FOHClock, or leave the field blank if access-code protection is disabled.
- **Relay connection failure:** make sure FOHClock is active and has internet access.
- **Local connection failure:** make sure FOHClock is active, its API is enabled, the device is awake, and both devices are on the same network.

## Updates

Releases are published at [github.com/kjetilpp/FOHClock-Companion](https://github.com/kjetilpp/FOHClock-Companion). The module checks that repository for a newer version on startup and once a day; when one exists, it logs a warning with a download link and sets the `update_available`/`latest_version` variables. Installing an update is still a manual step: download the `.tgz` from the linked release and re-import it in Companion.
