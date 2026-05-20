const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();

async function test() {
  try {
    console.log("Getting options for RELIANCE.NS...");
    const options = await yahooFinance.options('RELIANCE.NS');
    console.log("Option keys:", Object.keys(options));
    if (options.options && options.options.length > 0) {
      const optObj = options.options[0];
      console.log("Calls count:", optObj.calls.length);
      console.log("Puts count:", optObj.puts.length);
      console.log("Sample call object:", JSON.stringify(optObj.calls[0], null, 2));
    } else {
      console.log("No options array found for RELIANCE.NS");
    }
  } catch (err) {
    console.error("Error in test:", err.message || err);
  }
}

test();
