import tfjs from '@tensorflow/tfjs-node';
import mobilenet from '@tensorflow-models/mobilenet';
import puppeteer from 'puppeteer-extra';
import stealth from 'puppeteer-extra-plugin-stealth';
import confusables from 'confusables';
import axios from 'axios';
import http from '../../utils/request';

puppeteer.use(stealth());
const model = await mobilenet.load({ version: 2, alpha: 1 });
const browser = await puppeteer.launch({ headless: false });
const page = await browser.newPage();
await page.goto('https://discord.com/register');

const atob = (base64) => JSON.parse(Buffer.from(base64, 'base64').toString());
const between = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

async function getBufferFromUrl(url) {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    return Buffer.from(response.data, 'utf-8');
}

export default class {
    constructor(key, proxy) {
        this.session = http(proxy && `http://${proxy}`, {
            Connection: 'keep-alive',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 11; Pixel 5 Build/RD2A.211001.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/83.0.4103.120 Mobile Safari/537.36',
            Origin: 'https://newassets.hcaptcha.com',
            'X-Requested-With': 'com.discord',
            'Sec-Fetch-Site': 'same-site',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
            'Accept-Encoding': 'gzip, deflate',
            'Accept-Language': 'en-US,en;q=0.9,cs-CZ;q=0.8,cs;q=0.7',
        });
    }

    getBalance() {
        return 'infinite';
    }

    async startSolving(url, sitekey) {
        this.host = url.split('/')[2];
        this.sitekey = sitekey;
        return 'bypass';
    }

    async waitForResponse() {
        const { body } = await this.session.get('https://api.ipify.org/');
        const ip = body.trim();
        console.log(`checked proxy: ${ip}`);
        let tries = 0;
        while (true) {
            tries += 1;
            if (tries > 5) throw Error('could not solve captcha');
            try {
                const { body: js } = await this.session.get(`https://hcaptcha.com/1/api.js?render=explicit&onload=onHcaptchaLoaded&recaptchacompat=off&hl=en-US&host=${this.host}&sentry=true`);
                const version = js.match(/hcaptcha\.com\/captcha\/v1\/([0-9a-z]{5,})/)[1];
                this.session.updateHeaders({
                    Referer: `https://newassets.hcaptcha.com/captcha/v1/${version}/static/hcaptcha-challenge.html`,
                });

                const { json: config } = await this.session.get(`https://hcaptcha.com/checksiteconfig?v=${version}&host=${this.host}&sitekey=${this.sitekey}&sc=1&swa=1`);
                const jwt = config.c;
                const hswUrl = `${atob(jwt.req.split('.')[1]).l}/hsw.js`;

                const { body: hsw } = await this.session.get(hswUrl);
                const n = await page.evaluate(`
                    ${hsw}
                    hsw("${jwt.req}")
                `);

                const timestamp = Date.now();
                const width = between(800, 1500);
                const height = Math.round(width * 1.75);
                const getTopLevel = (time) => {
                    return {
                        st: between(100, 400),
                        sc: {
                            availWidth: width,
                            availHeight: height,
                            width,
                            height,
                            colorDepth: 24,
                            pixelDepth: 24,
                            availLeft: 0,
                            availTop: 0,
                        },
                        nv: {
                            vendorSub: '',
                            productSub: '20030107',
                            vendor: 'Google Inc.',
                            maxTouchPoints: 5,
                            hardwareConcurrency: 4,
                            cookieEnabled: true,
                            appCodeName: 'Mozilla',
                            appName: 'Netscape',
                            appVersion: '5.0 (Linux; Android 11; Pixel 5 Build/RD2A.211001.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/83.0.4103.120 Mobile Safari/537.36',
                            platform: 'Linux i686',
                            product: 'Gecko',
                            userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5 Build/RD2A.211001.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/83.0.4103.120 Mobile Safari/537.36',
                            language: 'en-US',
                            languages: ['en-US'],
                            onLine: true,
                            doNotTrack: null,
                            geolocation: {},
                            mediaCapabilities: {},
                            connection: {},
                            webkitTemporaryStorage: {},
                            webkitPersistentStorage: {},
                            userActivation: {},
                            deviceMemory: 4,
                            clipboard: {},
                            credentials: {},
                            keyboard: {},
                            locks: {},
                            mediaDevices: {},
                            serviceWorker: {},
                            storage: {},
                            contacts: {},
                            bluetooth: {},
                            usb: {},
                            plugins: [],
                        },
                        dr: '',
                        inv: true,
                        exec: true,
                        wn: [[width, height, 1, time - 5]],
                        'wn-mp': 0,
                        xy: [[0, 0, 1, time - 5]],
                        'xy-mp': 0,
                    };
                };
                const { json: captcha } = await this.session.post(`https://hcaptcha.com/getcaptcha?s=${this.sitekey}`, new URLSearchParams({
                    v: version,
                    sitekey: this.sitekey,
                    n,
                    hl: 'en',
                    host: this.host,
                    c: JSON.stringify(jwt),
                    motionData: JSON.stringify({
                        st: timestamp,
                        v: 1,
                        topLevel: getTopLevel(timestamp),
                        session: [],
                        widgetList: ['02fqdn2577oy'],
                        widgetId: '02fqdn2577oy',
                        href: 'file:///android_asset/hcaptcha-form.html',
                        prev: {
                            escaped: false,
                            passed: false,
                            expiredChallenge: false,
                            expiredResponse: false,
                        },
                    }),
                }).toString(), {
                    'Content-Type': 'application/x-www-form-urlencoded',
                });
                if ('generated_pass_UUID' in captcha) {
                    return captcha.generated_pass_UUID;
                }

                if (captcha.request_type !== 'image_label_binary') throw Error('invalid captcha type');
                const jwt2 = captcha.c;
                const label = confusables.remove(captcha.requester_question.en.replace(/Please click each image containing an? /, ''));
                const synonyms = {
                    truck: ['van'],
                    bicycle: ['bike', 'compass', 'clock', 'tricycle', 'unicycle'],
                    boat: ['maran', 'yawl', 'schooner', 'ship', 'ocean liner'],
                    motorbus: ['bus', 'passenger car'],
                    motorcycle: ['moped', 'thresher', 'motor scooter'],
                    train: ['locomotive'],
                    seaplane: ['airplane'],
                    airplane: ['airliner'],
                };

                if (label === 'seaplane') throw Error(`unsupported label: ${label}`);

                const answers = Object.fromEntries(await Promise.all(captcha.tasklist.map(async (img) => {
                    const buffer = await getBufferFromUrl(img.datapoint_uri);
                    const tensor = tfjs.node.decodeImage(buffer);
                    const classifications = await model.classify(tensor);
                    const isLabel = classifications.filter((x) => x.probability > 0.05).some(({ className }) => {
                        return className.includes(label) || synonyms[label]?.some((x) => className.includes(x));
                    });
                    return [img.task_key, isLabel ? 'true' : 'false'];
                })));

                const waitTime = captcha.tasklist.length * 300 + Math.random() * 500;
                await new Promise((res) => setTimeout(res, waitTime));
                const timestamp2 = Date.now();
                const touches = [
                    [46.26829147338867, 172.0126953125],
                    [248.4447021484375, 149.47274780273438],
                    [159.7191162109375, 242.9304504394531],
                    [267.34521484375, 348.3852233886719],
                    [280.0733337402344, 460.7474060058594],
                    [37.54315185546875, 250.9284973144531],
                    [239.7075958251953, 368.38037109375],
                    [230.982421875, 140.3840637207031],
                    [293.89215087890625, 296.3719482421875],
                    [293.89215087890625, 454.9306640625],
                ];

                const { json: response } = await this.session.post(`https://hcaptcha.com/checkcaptcha/${captcha.key}?s=${this.sitekey}`, {
                    v: version,
                    job_mode: 'image_label_binary',
                    answers,
                    serverdomain: this.host,
                    sitekey: this.sitekey,
                    motionData: JSON.stringify({
                        st: timestamp2,
                        dct: timestamp2 + 3,
                        ts: touches.map((x, i) => [[0, ...x], timestamp2 + 19900 + i * 900]),
                        'ts-mp': 830,
                        te: touches.map((x, i) => [[0, ...x], timestamp2 + 19990 + i * 900]),
                        'te-mp': 828.5555555555555,
                        mm: touches.map((x, i) => [...x.map(Math.floor), timestamp2 + 20000 + i * 900]),
                        'mm-mp': 829.4444444444445,
                        md: touches.map((x, i) => [...x.map(Math.floor), timestamp2 + 20002 + i * 900]),
                        'md-mp': 829.2222222222222,
                        mu: touches.map((x, i) => [...x.map(Math.floor), timestamp2 + 20004 + i * 900]),
                        'mu-mp': 830.4444444444445,
                        topLevel: getTopLevel(timestamp2),
                        v: 1,
                    }),
                    n: await page.evaluate(`
                        ${hsw}
                        hsw("${jwt2.req}")
                    `),
                    c: JSON.stringify(jwt2),
                });
                if ('generated_pass_UUID' in response) {
                    return response.generated_pass_UUID;
                }
            } catch (e) {

            }
        }
    }
}
