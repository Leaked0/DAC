import Capmonster from './capmonster';
import Bypass from './bypass';

const services = {
    capmonster: Capmonster,
    bypass: Bypass,
};

/**
 * @typedef {Class} CaptchaService
 * @property {string} key - Service api key
 * @property {function} getBalance - Get service credit balance
 * @property {function} startSolving - Tell the service to start solving the captcha
 * @property {function} waitForResponse - Wait for the service to return a captcha response key
 */

/**
 * Returns the specified captcha api
 * @return {CaptchaService} captcha api
 */
export default (service, key, ...args) => {
    if (!services[service]) throw Error(`${service} is not supported`);
    return new services[service](key, ...args);
};
