import exitHook from 'exit-hook';
import { STATUS_CODES } from 'http';
import initCycleTLS from './cycletls/index.js';

const getCycleTLSInstance = await initCycleTLS();
exitHook(async () => (await getCycleTLSInstance()).exit());

class HttpError extends Error {
    constructor(message, response) {
        super(message);
        this.name = this.constructor.name;
        this.response = response;
        Error.captureStackTrace(this, this.constructor);
    }
}

export default (proxy, headers = {}) => {
    let cookies = [];
    const send = async (method, url, body, additionalHeaders = {}, options = {}) => {
        if (body && typeof body !== 'string') {
            try {
                body = JSON.stringify(body);
                additionalHeaders['Content-Type'] = 'application/json; charset=UTF-8';
            } catch (e) {
                throw Error('Body is not json serializable.');
            }
        }
        let response = { status: 408 };
        let retries = 0;
        while (retries < 1 && (response.status === 408 || response.status === 502)) {
            try {
                response = await (await getCycleTLSInstance())(url, {
                    body,
                    proxy,
                    headers: { ...headers, ...additionalHeaders },
                    Cookies: cookies,
                    userAgent: headers['User-Agent'],
                    ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-21,29-23-24,0',
                    disableRedirect: true,
                    timeout: 10,
                    ...options,
                }, method);
            } catch (e) {
                response.status = 502;
                await new Promise((res) => setTimeout(res, 5000));
            }
            retries += 1;
        }

        if (response.headers['Set-Cookie']) {
            cookies = [...cookies, ...response.headers['Set-Cookie'].map((cookie) => ({
                name: cookie.split('=')[0],
                value: cookie.split('=')[1].split(';')[0],
            }))];
        }
        let json;
        try {
            json = JSON.parse(response.body);
        } catch (e) {}
        const responseWithJson = { ...response, json };
        if (response.status > 399) {
            if (response.status === 408 || response.status === 502) throw new HttpError('Proxy error', responseWithJson);
            throw new HttpError(`Request to ${url} failed with status ${response.status} - ${STATUS_CODES[response.status]}`, responseWithJson);
        }
        return responseWithJson;
    };

    return {
        get: (...args) => send('get', ...args),
        post: (...args) => send('post', ...args),
        patch: (...args) => send('patch', ...args),
        updateHeaders: (newHeaders) => headers = { ...headers, ...newHeaders },
    };
};
