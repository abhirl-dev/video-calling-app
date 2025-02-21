class Log {
    static success(message, arg) {
        console.log(`%c${message}`, "color:green; background:#00FF0011; font-weight:bold", arg ?? "");
    }

    static error(message, arg) {
        console.log(`%c${message}`, "color:red;background:#FF000011; font-weight:bold", arg ?? "");
    }

    static info(message, arg) {
        console.log(`%c${message}`, "color:blue; background:#0000FF11; font-weight:bold", arg ?? "");
    }

    static warn(message, arg) {
        console.log(`%c${message}`, "color:orange; background:#FF992211; font-weight:bold", arg ?? "");
    }
}

export { Log };