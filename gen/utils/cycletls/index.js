import childProcess from 'child_process';
import path, { dirname } from 'path';
import events from 'events';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';

let child;
let cycleTLSInstance;
const cleanExit = async (message) => {
    if (message) {
        console.log(message);
    }
    if (process.platform === 'win32') {
        await new Promise((resolve, reject) => {
            childProcess.exec(`taskkill /pid ${child.pid} /T /F`, (error, stdout, stderr) => {
                if (error) {
                    console.warn(error);
                }
                process.exit();
                resolve(stdout || stderr);
            });
        });
    } else {
        // linux/darwin os
        await new Promise(() => {
            process.kill(-child.pid);
            process.exit();
        });
    }
};
process.on('SIGINT', () => cleanExit());
process.on('SIGTERM', () => cleanExit());
class Golang extends events.EventEmitter {
    constructor(port) {
        super();
        this.server = new WebSocketServer({ port });
        this.requestIds = [];
        let executableFilename;
        if (process.platform === 'win32') {
            executableFilename = 'index.exe';
        } else if (process.platform === 'linux') {
            executableFilename = 'index';
        } else if (process.platform === 'darwin') {
            executableFilename = 'index-mac';
        } else {
            cleanExit(new Error('Operating system not supported'));
        }
        child = childProcess.spawn(path.join(dirname(fileURLToPath(import.meta.url)), `/${executableFilename}`), {
            env: { WS_PORT: port.toString() },
            shell: true,
            windowsHide: true,
            detached: process.platform !== 'win32',
        });
        child.stderr.on('data', (stderr) => {
            if (stderr.toString().includes('Request_Id_On_The_Left')) {
                const splitRequestIdAndError = stderr.toString().split('Request_Id_On_The_Left');
                const [requestId, error] = splitRequestIdAndError;
                this.emit(requestId, { error: new Error(error) });
                this.requestIds = this.requestIds.filter((id) => id !== requestId);
            } else {
                console.log('golang crashed, restarting server...');
                cycleTLSInstance = false;
                this.exit();
                childProcess.exec(`taskkill /pid ${child.pid} /T /F`);
                this.requestIds.forEach((requestId) => {
                    this.emit(requestId, { error: new Error('server crashed') });
                });
            }
        });
        this.server.on('connection', (ws) => {
            this.emit('ready');
            ws.on('message', (data) => {
                const message = JSON.parse(data);
                this.emit(message.RequestID, message.Response);
                this.requestIds = this.requestIds.filter((id) => id !== message.RequestID);
            });
        });
    }

    request(requestId, options) {
        [...this.server.clients][0].send(JSON.stringify({ requestId, options }));
        this.requestIds.push(requestId);
    }

    exit() {
        this.server.close();
    }
}
const getNewInstance = () => new Promise((resolveReady) => {
    const port = 9119;
    const debug = true;
    const instance = new Golang(port, debug);
    instance.on('ready', () => {
        const CycleTLS = (() => {
            const CycleTLS = async (url, options, method = 'get') => {
                return new Promise((resolveRequest, rejectRequest) => {
                    const requestId = `${url}${Math.floor(Date.now() * Math.random())}`;
                    if (!options.ja3) options.ja3 = '771,4865-4867-4866-49199-49195-49200-49196-158-49191-103-49192-107-163-159-52393-52392-52394-49327-49325-49315-49311-49245-49249-49239-49235-162-49326-49324-49314-49310-49244-49248-49238-49234-49188-106-49187-64-49162-49172-57-56-49161-49171-51-50-157-49313-49309-49233-156-49312-49308-49232-61-60-53-47-255,0-11-10-35-22-23-13-43-45-51,29-23-1035-25-24,0-1-2';
                    if (!options.body) options.body = '';
                    if (!options.proxy) options.proxy = '';
                    instance.request(requestId, {
                        url,
                        ...options,
                        method,
                    });
                    instance.once(requestId, (response) => {
                        if (response.error) return rejectRequest(response.error);
                        const { Status: status, Body: body, Headers: headers } = response;
                        if (headers['Set-Cookie']) headers['Set-Cookie'] = headers['Set-Cookie'].split('/,/');
                        resolveRequest({
                            status,
                            body,
                            headers,
                        });
                    });
                });
            };
            CycleTLS.head = (url, options) => {
                return CycleTLS(url, options, 'head');
            };
            CycleTLS.get = (url, options) => {
                return CycleTLS(url, options, 'get');
            };
            CycleTLS.post = (url, options) => {
                return CycleTLS(url, options, 'post');
            };
            CycleTLS.put = (url, options) => {
                return CycleTLS(url, options, 'put');
            };
            CycleTLS.delete = (url, options) => {
                return CycleTLS(url, options, 'delete');
            };
            CycleTLS.trace = (url, options) => {
                return CycleTLS(url, options, 'trace');
            };
            CycleTLS.options = (url, options) => {
                return CycleTLS(url, options, 'options');
            };
            CycleTLS.connect = (url, options) => {
                return CycleTLS(url, options, 'options');
            };
            CycleTLS.patch = (url, options) => {
                return CycleTLS(url, options, 'patch');
            };
            CycleTLS.exit = async () => {
                if (process.platform == 'win32') {
                    return new Promise((resolve) => {
                        childProcess.exec(`taskkill /pid ${child.pid} /T /F`, (error, stdout, stderr) => {
                            if (error) {
                                console.warn(error);
                            }
                            instance.exit();
                            resolve(stdout || stderr);
                        });
                    });
                } else {
                    return new Promise(() => {
                        process.kill(-child.pid);
                        instance.exit();
                    });
                }
            };
            return CycleTLS;
        })();
        resolveReady(CycleTLS);
    });
});

const initCycleTLS = async () => {
    cycleTLSInstance = getNewInstance();
    return async () => {
        if (!cycleTLSInstance) cycleTLSInstance = getNewInstance();
        return await cycleTLSInstance;
    };
};
export default initCycleTLS;
