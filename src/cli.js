#!/usr/bin/env node

const meow = require("meow");
const logUpdate = require("log-update");
const logSymbols = require("log-symbols");
const Ora = require("ora");
const chalk = require("chalk");

const { getNotify } = require("./notification");
const { Iback } = require(".");

const errorRetryTimeDefault = 60;
const failureRetryTimeDefault = 0;

const minDownloadDefault = 0.01;
const minUploadDefault = 0.01;
const maxPingDefault = 5000;
const maxTimeDefault = 5000;

const cli = meow(
    `
        Usage
          $ iback

        Options
          --help Display this help
          --min-download=<speed>, -d=<speed> Set the minimum download speed in Mbps to pass the test
            default: ${minDownloadDefault}
          --min-upload=<speed>, -u=<speed> Set the minimum upload speed in Mbps to pass the test
            default: ${minUploadDefault}
          --max-ping=<ms>, -p=<ms> Set the maximum ping to pass the test
            default: ${maxPingDefault}
          --silent, -s  Don't send notifications
          --stiky-notifications, -sn Make all notifications wait
          --no-sounds, -ns Stop the notification sounds
          --notify-on-errors, -ne Show a notification when an error occurs
          --log-errors, -le Log errors
          --error-retry-time=<seconds>, -ert=<seconds> Set the time to wait before retrying when an error occurs
            default: ${errorRetryTimeDefault}
          --no-error-retry, -ner Don't retry when an error occurs
          --notify-on-failures, -nf Show a notification when the test result is slow Internet
          --log-failures, -lf Log failures (Slow Internet)
          --failure-retry-time=<seconds>, -frt=<seconds> Set the time to wait before retrying when the Internet is slow
            default: ${failureRetryTimeDefault}
          --no-failure-retry, -nfr Don't retry when the Internet is slow
          --max-time=<ms>, -mt Set the maximum length of a single test run (upload or download)
            default: ${maxTimeDefault}
        Examples
          $ iback --min-download=0.5 --log-failures
`,
    {
        flags: {
            "min-download": {
                type: "string",
                alias: "d",
                default: minDownloadDefault.toString()
            },
            "min-upload": {
                type: "string",
                alias: "u",
                default: minUploadDefault.toString()
            },
            "max-ping": {
                type: "string",
                alias: "p",
                default: maxPingDefault.toString()
            },
            silent: {
                type: "boolean",
                alias: "s"
            },
            "stiky-notifications": {
                type: "boolean",
                alias: "sn"
            },
            "no-sounds": {
                type: "boolean",
                alias: "ns"
            },
            "notify-on-errors": {
                type: "boolean",
                alias: "noe"
            },
            "log-errors": {
                type: "boolean",
                alias: "le"
            },
            "error-retry-time": {
                type: "string",
                alias: "ert",
                default: errorRetryTimeDefault.toString()
            },
            "no-error-retry": {
                type: "boolean",
                alias: "ner"
            },
            "notify-on-failures": {
                type: "boolean",
                alias: "nof"
            },
            "log-failures": {
                type: "boolean",
                alias: "lf"
            },
            "failure-retry-time": {
                type: "string",
                alias: "frt",
                default: failureRetryTimeDefault.toString()
            },
            "no-failure-retry": {
                type: "boolean",
                alias: "nfr"
            },
            "max-time": {
                type: "string",
                alias: "mt",
                default: maxTimeDefault.toString()
            }
        }
    }
);

const sounds = !cli.flags.noSounds;
const { silent, stikyNotifications } = cli.flags;

const notifySuccess = getNotify(true, sounds, silent);

const notifyFailure = getNotify(
    stikyNotifications,
    sounds,
    silent || !cli.flags.notifyOnFailures
);

const notifyError = getNotify(
    stikyNotifications,
    sounds,
    silent || !cli.flags.notifyOnErrors
);

const errorRetryTime =
    parseInt(cli.flags.errorRetryTime) || errorRetryTimeDefault;
const failureRetryTime =
    parseInt(cli.flags.failureRetryTime) || failureRetryTimeDefault;

const retryOnError = cli.flags.noErrorRetry ? false : errorRetryTime;
const retryOnFailure = cli.flags.noFailureRetry ? false : failureRetryTime;

const minDownload = parseFloat(cli.flags.d) || minDownloadDefault;
const minUpload = parseFloat(cli.flags.u) || minUploadDefault;
const maxPing = parseInt(cli.flags.p) || maxPingDefault;
const maxTime = parseInt(cli.flags.maxTime) || maxTimeDefault;

const iback = new Iback({
    test: { maxTime },
    minDownload,
    minUpload,
    maxPing,
    retryOnError,
    retryOnFailure
});

let state;

let showedErrorNotificationOnce = false;

let renderTestingIntervalHandler;

const renderTesting = () => {
    if (renderTestingIntervalHandler) return;

    const spinner = new Ora();

    const render = () => {
        if (state !== "testing") {
            clearInterval(renderTestingIntervalHandler);
            renderTestingIntervalHandler = null;
        } else {
            logUpdate(`${spinner.frame()}Testing`);
        }
    };

    renderTestingIntervalHandler = setInterval(render, 50);
};

const renderRetryingAfter = secondsLeftToRetry => {
    logUpdate(chalk.yellow(`Retrying after ${secondsLeftToRetry} seconds`));
};

const renderError = err => {
    logUpdate(
        `${logSymbols.error} ${chalk.red("Test failed")}` + "\n" + `${err}`
    );
    logUpdate.done();
};

const renderFailure = ({ download, upload, ping }) => {
    const downloadColored =
        download < minDownload ? chalk.red(download) : download;
    const uploadColored = upload < minUpload ? chalk.red(upload) : upload;
    const pingColored = ping > maxPing ? chalk.red(ping) : ping;
    logUpdate(
        `${logSymbols.warning} ${chalk.yellow(
            `Slow Internet, D/U: ${downloadColored}/${uploadColored} Mbps, Ping: ${pingColored} ms.`
        )}`
    );
    logUpdate.done();
};

const renderSuccess = ({ download, upload, ping }) => {
    logUpdate(
        `${logSymbols.success} ${chalk.green("Internet is back!")}
Ping ${chalk.blueBright(ping)} ${chalk.blue("ms")}
Download ${chalk.blueBright(download)} ${chalk.blue("Mbps")}
Upload ${chalk.blueBright(upload)} ${chalk.blue("Mbps")}`
    );
};

iback.on("testing", () => {
    state = "testing";
    renderTesting();
});

iback.on("error", err => {
    state = "error";

    if (cli.flags.logErrors) {
        renderError(err);
    }

    if (!showedErrorNotificationOnce) {
        notifyError(
            "Test Error" + (cli.flags.noErrorRetry ? "." : ", retrying..")
        );
        showedErrorNotificationOnce = true;
    }
});

iback.on("retrying", () => (showedErrorNotificationOnce = false));

iback.on("retryingafter", secondsLeftToRetry => {
    state = "awaitingretry";
    renderRetryingAfter(secondsLeftToRetry);
});

iback.on("failure", result => {
    state = "failure";

    const { download, upload, ping } = result;

    if (cli.flags.logFailures) {
        renderFailure(result);
    }

    notifyFailure(
        `Slow Internet (D/U: ${download}/${upload} Mbps, Ping: ${ping} ms)` +
            (cli.flags.noFailureRetry ? "." : ", retrying..")
    );
});

iback.on("iback", result => {
    state = "success";
    renderSuccess(result);
    notifySuccess(`Internet is Back!`);
});

iback.start();
