const speedTest = require("speedtest-net");
const { EventEmitter } = require("events");

class Iback extends EventEmitter {
    constructor(options) {
        super();
        this.options = {
            test: { maxTime: 5000 },
            retryOnError: 60,
            retryOnFailure: 0,
            minDownload: 0.01,
            minUpload: 0.01,
            maxPing: 5000,
            ...options
        };
    }

    retryIfNotTesting() {
        if (this.isTesting) return;

        this.emit("retrying");
        this.start();
    }

    retryIfWanted(err) {
        if (this.isTesting) return;
        if (this.isWaitingForRetry) return;

        const { retryOnError, retryOnFailure } = this.options;

        if (err && retryOnError === false) return;
        if (!err && retryOnFailure === false) return;

        this.retryingAfter =
            Math.max(err ? retryOnError : retryOnFailure, 0) || 0;

        if (this.retryingAfter === 0) {
            this.retryIfNotTesting();
            return;
        }

        this.isWaitingForRetry = true;

        let retryingAfterHandle;

        const updateRetryingAfter = () => {
            if (this.isTesting || this.retryingAfter === 0) {
                clearInterval(retryingAfterHandle);
                this.isWaitingForRetry = false;
                this.retryIfNotTesting();
            } else {
                this.emit("retryingafter", this.retryingAfter);
                this.retryingAfter--;
            }
        };

        retryingAfterHandle = setInterval(updateRetryingAfter, 1000);
    }

    checkResult(result) {
        const {
            speeds: { download, upload },
            server: { ping }
        } = result;

        const { minDownload, minUpload, maxPing } = this.options;

        if (download >= minDownload && upload >= minUpload && ping <= maxPing) {
            this.emit("iback", { download, upload, ping, result });
        } else {
            this.emit("failure", { download, upload, ping, result });
            this.retryIfWanted();
        }
    }

    start() {
        if (this.isTesting) return;
        this.isTesting = true;

        this.test = speedTest(this.options.test);

        this.test.on("data", result => {
            this.isTesting = false;
            this.emit("result", result);
            this.checkResult(result);
        });

        this.test.on("error", err => {
            this.isTesting = false;
            this.emit("error", err);
            this.retryIfWanted(err);
        });

        this.emit("testing");
    }
}

module.exports = {
    Iback
};
