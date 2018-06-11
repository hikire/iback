# Iback

This CLI tool notifies you when your internet connection speed is back to normal, so you can kick back instead of watching Chrome's dinosaur while clicking F5.

## Installation

```sh
npm i -g iback
```

## Usage

```sh
iback
```

### Options

    --help Display this help
    --min-download=<speed>, -d=<speed> Set the minimum download speed in Mbps to pass the test
      default: 0.01
    --min-upload=<speed>, -u=<speed> Set the minimum upload speed in Mbps to pass the test
      default: 0.01
    --max-ping=<ms>, -p=<ms> Set the maximum ping to pass the test
      default: 5000
    --silent, -s  Don't send notifications
    --stiky-notifications, -sn Make all notifications wait
    --no-sounds, -ns Stop the notification sounds
    --log-errors, -le Log errors
    --error-retry-time=<seconds>, -ert=<seconds> Set the time to wait before retrying when an error occurs
      default: 60
    --no-error-retry, -ner Don't retry when an error occurs
    --log-failures, -lf Log failures (Slow Internet)
    --failure-retry-time=<seconds>, -frt=<seconds> Set the time to wait before retrying when the Internet is slow
      default: 0
    --no-failure-retry, -nfr Don't retry when the Internet is slow
    --max-time=<ms>, -mt Set the maximum length of a single test run (upload or download)
      default: 5000

### Examples

```sh
iback --min-download=0.5 --log-failures
```

## API

Iback can be extended or built on:

```sh
npm i -S iback
```

```js
const { Iback } = require("iback");

const iback = new Iback({ minDownload: 3 });

iback.on("iback", sendSMS);

iback.on("error", logError);
```

### Options

Iback receives an options object can be like this:

```js
const options = {
    test: { maxTime: 5000 }, // original speedtest-net settings, see (https://github.com/ddsol/speedtest.net)
    retryOnError: 60, // time to retry after error, or false to disable autoretry on errors
    retryOnFailure: 0, // time to retry after failure, or false to disable autoretry on errors
    minDownload: 0.01, // minimum accepted download speed in Mbps
    minUpload: 0.01, // minimum accepted upload speed in Mbps
    maxPing: 5000, // maximum accepted ping speed in ms
    ...options
};
const iback = new Iback(options);
```

### Events

#### testing

Fired when testing the connection starts.

```js
iback.on("testing", cb);
```

#### iback

Fired when test finishes and the internet connection meets the specified requirements in options.

Callback receives an object conains the following:

-   download: the download speed.
-   upload: the upload speed.
-   ping: ping to the testing server.
-   result: original [speedtest-net](https://github.com/ddsol/speedtest.net) result.

```js
iback.on("iback", ({ download, upload, ping, result }) => {
    console.dir({ download, upload, ping });
});
```

#### failure

Fired when test finishes and the internet connection doesn't meet the specified requirements in options.

Callback receives an object conains the following:

-   download: the download speed.
-   upload: the upload speed.
-   ping: ping to the testing server.
-   result: original [speedtest-net](https://github.com/ddsol/speedtest.net) result.

```js
iback.on("failure", ({ download, upload, ping, result }) => {
    console.dir({ download, upload, ping });
});
```

#### error

Fired when an error occur and the test couldn't be finished.

Callback receives error string.

```js
iback.on("error", err => {
    console.error(err);
});
```

#### result

Fired when test finishes.

Callback receives an object conains the following:

-   result: original [speedtest-net](https://github.com/ddsol/speedtest.net) result.

```js
iback.on("result", result => {
    console.dir(result);
});
```

#### retryingafter

Fired each second while waiting for a retry.

Callback receives the number of remaining seconds before next retry.

```js
iback.on("retryingafter", secondsLeftToRetry => {
    console.dir(secondsLeftToRetry);
});
```

#### retrying

Fired just before starting the test again.

```js
iback.on("retrying", () => console.log("retrying now"));
```

## Troubleshooting

If the notifications don't work please see [node-notifier](https://github.com/mikaelbr/node-notifier).
