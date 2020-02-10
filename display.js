// Offset PDT = UTC-7 
// Offset PST = UTC-8
// Offset UTC = 0
// Offset IST = +5.5

// ServiceNow Stock Symbol = "NOW"

var stringToDisplay = "Hello makerslab!";
var utcOffset = +8;
var stockSymbol = "NOW";

function getStringToDisplay(){
    return stringToDisplay;
}

function getStockSymbol(){
    return stockSymbol;
}

function getUtcOffset(){
    return utcOffset;
}
module.exports.getStringToDisplay = getStringToDisplay;
module.exports.getStockSymbol = getStockSymbol;
module.exports.getUtcOffset = getUtcOffset;
