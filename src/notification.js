const notifier = require("node-notifier");

const options = {
    title: "Iback"
    // TODO: add icon,
};

const getNotify = (wait = true, sound = true, silent = false) => {
    if (silent) {
        return () => {};
    } else {
        return message => notifier.notify({ ...options, wait, sound, message });
    }
};

module.exports = { getNotify };
