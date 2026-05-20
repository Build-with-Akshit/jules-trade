const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
console.log("Keys on yahooFinance prototype:", Object.getOwnPropertyNames(Object.getPrototypeOf(yahooFinance)));
console.log("Keys on yahooFinance itself:", Object.keys(yahooFinance));
console.log("YahooFinance modules:", Object.keys(yahooFinance).filter(k => typeof yahooFinance[k] === 'function' || typeof yahooFinance[k] === 'object'));
