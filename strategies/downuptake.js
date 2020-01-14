var _ = require('lodash');
var log = require('../core/log.js');

var myprice;

var method = {};

// prepare everything our method needs
method.init = function() {
	this.name = 'downuptake';

	this.currentTrend = this.settings.starting_trend;
	// the following is considered only if starting trend is set to UP
	myprice = this.settings.entry_price;

	this.requiredHistory = this.tradingAdvisor.historySize;

	// define the indicators we need to determine UP and DOWN
	// https://www.investopedia.com/terms/d/double-exponential-moving-average.asp
	this.addIndicator('dema', 'DEMA', this.settings);
	this.addIndicator('sma', 'SMA', this.settings.weight);
}

method.update = function(candle) {
}

method.log = function() {
	let dema = this.indicators.dema;
	let sma = this.indicators.sma;
}

method.check = function(candle) {
	let dema = this.indicators.dema;
	let sma = this.indicators.sma;
	let resDEMA = dema.result;
	let resSMA = sma.result;
	let price = candle.close;
	let diff = resSMA - resDEMA;
	let required_diff = this.settings.thresholds.MAdiff;

	//console.log(candle.start.format());

	// When neutral, wait for a downtrend
	// If downtrend is detected, set DOWN status and wait UP for buying chances
	if (this.currentTrend=='neutral') {
		if(resSMA < resDEMA - required_diff) {
			console.log(candle.start.format(),'->[price:',price,'] Bears detected-> setting DOWN and waiting for bulls...');
			this.currentTrend = 'down';
		}
	}
	// when down, uptrend detection enables a buy & hodl position
	if(this.currentTrend == 'down') {
		//console.log('resSMA', resSMA.toFixed(5), ' resDEMA:', resDEMA.toFixed(5) + ' diff: ' + diff.toFixed(5), ' required diff: ', required_diff);
		if(resSMA > resDEMA + required_diff) {
			console.log(candle.start.format(),'->[price:',price,'] Bulls detected-> BUYing and going HODL and waiting for gain...');
			this.currentTrend = 'up';
			this.advice('long');
			myprice = price;
		}
	} 

	// when hodling, go short and sell if target gain reached
	if (this.currentTrend=='up') {
		let price_diff = price-myprice;
		let gain = price_diff/myprice;

		if (gain>= this.settings.thresholds.gain) {
			console.log(candle.start.format(),'# Gain detected -> Going neutral, Selling at price: ',price, ', myprice: ', myprice, 'gain -> ', price_diff);
			this.currentTrend = 'neutral';
			this.advice('short');
		}
	}
}

module.exports = method;
