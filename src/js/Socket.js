class Socket {
    #url;
    #username;
    #password;
    #reConnect;
    /**
     * @type {WebSocket}
     */
    #wss;

    /**
     * @param {SocketProps} props 
     */
    constructor(props) {
        this.#url = props.url;
        this.#username = props.username;
        this.#password = props.password;
        this.#reConnect = props.reconnect;
    }

    /**
     * @param {string} topic 
     * @returns {Socket}
     */
    subscribe(topic) {
        // const url = `${this.#url}?${encodeURIComponent(`username=${this.#username}&password=${this.#password}&topic=${topic}`)}`
        const url = this.#url
        this.#wss = new WebSocket(url);

        this.#wss.onopen = e => this.onConnect(e);
        this.#wss.onclose = async (e) => {
            if (this.#reConnect) {
                await sleep();
                this.subscribe(topic)
            }
            this.onDisconnect(e);
        };
        this.#wss.onmessage = e => {
            const json = JSON.parse(e.data);
            const message = new SocketResult(json.topic, json.event, json.data);
            if (message.topic === topic)
                this.onMessage(message);
        }
        return this;
    }

    onConnect = ((e) => { });
    onDisconnect = ((e) => { });
    onMessage = ((e = new SocketResult()) => { });

    /**
     * @param {string} topic 
     * @param {string} event
     * @param {any} data 
     */
    publish(topic, event, data) {
        try {
            const payload = {
                topic: topic,
                event: event,
                data: data,
            }
            this.#wss.send(JSON.stringify(payload));
        }
        catch (err) {
            console.error("FAILED TO SEND WEBSOCKET MESSAGE => ", err);
        }
    }

    disconnect() {
        this.#wss.close();
    }
}

async function sleep(milli = 1000) {
    return await new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve();
        }, milli);
    });
}

class SocketResult {
    /**
     * @param {string} topic 
     * @param {string} event
     * @param {any} data 
     */
    constructor(topic = "", event = "", data = null) {
        this.topic = topic;
        this.event = event;
        this.data = data;
    }
}

class SocketProps {
    /**
      * @param {string} url 
      * @param {string} username 
      * @param {string} password 
      * @param {boolean} reconnect 
      */
    constructor(url, username, password, reconnect = false) {
        this.url = url;
        this.username = username;
        this.password = password;
        this.reconnect = reconnect
    }
}

export { Socket };