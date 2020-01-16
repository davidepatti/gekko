var _ = require('lodash');
var log = require('../core/log.js');

var entry_price;
var max_patience;
var patience;
var required_gain;
var dismiss_gain;

var method = {};

// prepare everything our method needs
method.init = function() {
	this.name = 'downuptake';

	this.currentTrend = this.settings.starting_trend;
	// the following is considered only if starting trend is set to UP
	entry_price = this.settings.entry_price;

	max_patience = this.settings.max_patience;
	dismiss_gain = this.settings.dismiss_gain;
	patience = max_patience;
	required_gain = this.settings.thresholds.gain;
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
	let required_diff = (this.settings.thresholds.MAdiff)*price;
	//let required_diff = 200;

	//console.log(candle.start.format());

	// When neutral, wait for a downtrend
	// If downtrend is detected, set DOWN status and wait UP for buying chances
	if (this.currentTrend=='neutral') {
		// set trend down
		if(resSMA < resDEMA - required_diff) {
			console.log('##');
			console.log(candle.start.format(),'SMA:',resSMA,' resDMA:',resDEMA,' required_diff:', required_diff);
			console.log(candle.start.format(),'->[price:',price,'] Bears detected-> setting DOWN and waiting for bulls...');
			this.currentTrend = 'down';
		}
		// tred up, buy
		if(resSMA > resDEMA + required_diff) {
			console.log('##');
			console.log(candle.start.format(),'SMA:',resSMA,' resDMA:',resDEMA,' required_diff:', required_diff);
			console.log(candle.start.format(),'->[price:',price,'] Bulls detected-> BUYing and going HODL and waiting for gain...');
			this.currentTrend = 'up';
			this.advice('long');
			entry_price = price;
			patience = max_patience;
		}
	}
	// when down, uptrend detection enables a buy & hodl position
	if(this.currentTrend == 'down') {
		if(resSMA > resDEMA + required_diff) {
			console.log('##');
			console.log(candle.start.format(),'SMA:',resSMA,' resDMA:',resDEMA,' required_diff:', required_diff);
			console.log(candle.start.format(),'->[price:',price,'] Bulls detected-> BUYing and going HODL and waiting for gain...');
			this.currentTrend = 'up';
			this.advice('long');
			entry_price = price;
			patience = max_patience;
		}
	} 

	// when hodling, go short and sell if target gain reached
	if (this.currentTrend=='up') {
		let price_diff = price-entry_price;
		let gain = price_diff/entry_price;

		patience = patience -1;

		// 1) Sell because of reached gain
		if (gain>= required_gain) {
			console.log('##');
			console.log(candle.start.format(),'# GAIN TARGET detected! -> Going neutral, Selling at price: ',price, ', myprice: ', entry_price, 'gain -> ', price_diff);
			this.currentTrend = 'neutral';
			this.advice('short');
		}
		//else if (patience%240==0) console.log(candle.start.format(),'Current Gain: ',gain,', Still Waiting for ',required_gain,', patience remaining ',patience, ' candles...');

		// 2) Sell because of end of patience
		else if (patience==0)  {
			if (gain >= dismiss_gain) {
				console.log('##');
				console.log(candle.start.format(),'Lost Patience! Selling at ',price,' --> theoric gain: ',gain);
				this.advice('short');
				this.currentTrend = 'neutral';
			}
			else {
				//console.log(candle.start.format(),'Lost Patience! But not enough gain, delaying of 24 candles --> theoric gain %: ',gain);
				patience = 1;
			}
		} 
		
		// 3) Sell because of trend change
		else if (resSMA < resDEMA - required_diff) {
			if (gain >= dismiss_gain) {
				console.log('##');
				console.log(candle.start.format(),'SMA:',resSMA,' resDMA:',resDEMA);
				console.log(candle.start.format(),'#### Trend change! Selling at ',price,' --> theoric gain: ',gain);
				this.currentTrend = 'down';
				this.advice('short');
			}
		}
	}
}

module.exports = method;
