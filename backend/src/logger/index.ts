function log(type: string, message: string) {
    if (process.env.NODE_ENV === "test")
        return;

    const currrentDateTime = new Date();

    console.log(`${currrentDateTime.toISOString()} [${type.toUpperCase()}] ${message}`);
}

function logObject(input: any) {
    if (process.env.NODE_ENV === "test")
        return;

    console.log(input);
}

function info(message: string) {
    log("INFO", message);
}

function debug(message: string) {
    log("DEBUG", message);
}

function warn(message: string) {
    log("WARN", message);
}

function error(message: string) {
    log("ERROR", message);
}

export const logger = {
    log,
    logObject,
    info,
    debug,
    warn,
    error
};
