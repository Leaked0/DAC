import Kopeechka from './kopeechka';
import Mailtm from './mailtm';

const services = {
    kopeechka: Kopeechka,
    mailtm: Mailtm,
};

/**
 * @typedef {Class} EmailService
 * @property {string} key - Service api key
 * @property {function} getBalance - Get service credit balance
 * @property {function} getEmail - Get a phone number from the api
 * @property {function} waitForLink - Wait for the phone number to receive a code
 * @property {function} cancel - Cancel the inbox
 */

/**
 * Returns the specified phone api
 * @return {EmailService} phone api
 */
export default (service, key, ...args) => {
    if (!services[service]) throw Error(`${service} is not supported`);
    return new services[service](key, ...args);
};