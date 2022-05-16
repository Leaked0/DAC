import { WebSocket } from 'ws';
import zlib from 'zlib-sync';
import HttpsProxyAgent from 'https-proxy-agent';

const initializeGateway = (token, proxy) => new Promise((resolve) => {
    let heartbeat;
    let receivedAck = true;
    let sValue = null;
    let alreadyRestarted = false;
    const ws = new WebSocket('wss://gateway.discord.gg/?encoding=json&v=9&compress=zlib-stream', { agent: new HttpsProxyAgent(proxy), rejectUnauthorized: false });
    const inflate = new zlib.Inflate({
        chunkSize: 65535,
        flush: zlib.Z_SYNC_FLUSH,
    });
    const restart = (reason) => {
        if (!alreadyRestarted) {
            alreadyRestarted = true;
            if (heartbeat) clearInterval(heartbeat);
            if (ws.readyState === ws.OPEN) ws.close(1000);
            if (ws.readyState >= 2) setTimeout(() => initializeGateway(token, proxy), 5000);
        }
    };
    ws.on('close', (code, reason) => restart(reason.toString()));
    ws.on('message', (compressed) => {
        const l = compressed.length;
        const flush = l >= 4
            && compressed[l - 4] === 0x00
            && compressed[l - 3] === 0x00
            && compressed[l - 2] === 0xFF
            && compressed[l - 1] === 0xFF;
        inflate.push(compressed, flush && zlib.Z_SYNC_FLUSH);

        const message = JSON.parse(inflate.result.toString());
        const { op: code, d: data, t: eventName } = message;
        switch (code) {
        case 0: {
            sValue = message.s;
            if (eventName === 'READY') {
                resolve(data);
            }
            break;
        }
        case 1: {
            ws.send(JSON.stringify({ op: 1, d: sValue }));
            break;
        }
        case 7: {
            restart('server requested a reconnect');
            break;
        }
        case 9: {
            restart('session invalidated');
            break;
        }
        case 10: {
            heartbeat = setInterval(() => {
                if (!receivedAck) {
                    restart('server is not responding');
                } else {
                    ws.send(JSON.stringify({ op: 1, d: sValue }));
                    receivedAck = false;
                }
            }, data.heartbeat_interval);

            ws.send(JSON.stringify({
                op: 2,
                d: {
                    capabilities: 95,
                    client_state: {
                        guild_hashes: {},
                        highest_last_message_id: 0,
                        read_state_version: -1,
                        useruser_guild_settings_version: -1,
                    },
                    compress: true,
                    large_threshold: 100,
                    properties: {
                        browser: 'Discord Android',
                        browser_user_agent: 'Discord-Android/112009',
                        client_build_number: 112009,
                        client_version: '112.9 - Stable',
                        device: 'RMX2063, RMX2063EEA',
                        os: 'Android',
                        os_sdk_version: '30',
                        os_version: '11',
                        system_locale: 'en-US',
                    },
                    token,
                },
            }));
            break;
        }
        case 11: {
            receivedAck = true;
            break;
        }
        }
    });
});

export default initializeGateway;
