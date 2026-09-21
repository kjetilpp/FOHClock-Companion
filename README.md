# FOHClock Companion module

Native Bitfocus Companion module for the FOHClock iPhone/iPad app. Relay mode connects by stable device ID without requiring the Companion computer to know the iPhone/iPad IP address or port. Local HTTP mode remains available as a fallback.

## Installation

Download `fohclock-<version>.tgz` from the [latest release](https://github.com/kjetilpp/FOHClock-Companion/releases/latest), then open **Modules** in Companion and choose **Import module package**.

## Development

```sh
npm install
npm test
npm run lint
npm run package
```

`npm run package` creates a `.tgz` file that can be installed with Companion's **Import module package** button.

See [companion/HELP.md](companion/HELP.md) for connection setup and usage.
