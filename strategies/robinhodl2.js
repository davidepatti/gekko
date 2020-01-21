var _ = require('lodash');
var log = require('../core/log.js');

var entry_price;
var max_patience;
var patience;
var required_gain;
var dismiss_gain;

var report_step;

// redirect the console.log
var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'a'});
var log_stdout = process.stdout;

console.log = function(d) { //
	  log_file.write(util.format(d) + '\n');
	  log_stdout.write(util.format(d) + '\n');
};

var method = {};

// prepare everything our method needs
method.init = function() {
	this.name = 'robinhodl';

	this.currentTrend = this.settings.starting_trend;
	// the following will be considered only if starting trend is set to UP
	
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


	// in candles...
	report_step = this.settings.log_step;

	console.log('Initializing RobinHodl....');
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
	let required_diff_up = (this.settings.thresholds.MAdiffUP)*price;
	let required_diff_down = (this.settings.thresholds.MAdiffDOWN)*price;

	report_step = report_step-1;

	var message;
	if (report_step==0) {
		message = 'LOG:'+candle.start.format()+'[Price:'+ price.toFixed(2)+ '] [Status:' + this.currentTrend + '] [SMA:' + resSMA.toFixed(2) +' DMA:' + resDEMA.toFixed(2) + '] [diff (current/required UP/DOWN):'+ diff.toFixed(2)+ '/ ' + required_diff_up.toFixed(2)+' / '+required_diff_down.toFixed(2)+']';
		console.log(message); 
		report_step = this.settings.log_step;
	}

	if (this.currentTrend=='neutral') {
		// set trend down
		if(resSMA < resDEMA - required_diff_down) {
			console.log('##');

			message = 'LOG:'+candle.start.format()+'[Price:'+ price.toFixed(2)+ '] [Status:' + this.currentTrend + '] [SMA:' + resSMA.toFixed(2) +' DMA:' + resDEMA.toFixed(2) + '] [diff (current/required):'+ diff.toFixed(2)+ '/' + required_diff_down.toFixed(2)+']';
			console.log(message); 
		
			message = 'LOG:'+candle.start.format()+'-> Bears detected-> setting DOWN and waiting for bulls...';
			console.log(message);
			this.currentTrend = 'down';
		}
		// tred up, buy
		if(resSMA > resDEMA + required_diff_up) {
			console.log('##');

			message = 'LOG:'+candle.start.format()+'[Price:'+ price.toFixed(2)+ '] [Status:' + this.currentTrend + '] [SMA:' + resSMA.toFixed(2) +' DMA:' + resDEMA.toFixed(2) + '] [diff (current/required):'+ diff.toFixed(2)+ '/' + required_diff_up.toFixed(2)+']';
			console.log(message); 
		
			message = 'LOG:'+candle.start.format()+'->Bulls detected-> BUYing, going HODL and waiting for gain...';
			console.log(message);
			this.currentTrend = 'up';
			this.advice('long');
			entry_price = price;
			patience = max_patience;
		}
	}
	// when down, uptrend detection enables a buy & hodl position
	if(this.currentTrend == 'down') {
		if(resSMA > resDEMA + required_diff_up) {
			console.log('##');

			message = 'LOG:'+candle.start.format()+'[Price:'+ price.toFixed(2)+ '] [Status:' + this.currentTrend + '] [SMA:' + resSMA.toFixed(2) +' DMA:' + resDEMA.toFixed(2) + '] [diff (current/required):'+ diff.toFixed(2)+ '/'  + required_diff_up.toFixed(2)+']';
			console.log(message); 
		
			message = 'LOG:'+candle.start.format()+'->Bulls detected-> BUYing, going HODL and waiting for gain...';
			console.log(message);

			this.currentTrend = 'up';
			this.advice('long');
			entry_price = price;
			patience = max_patience;
		}
	} 

	if (this.currentTrend=='up') {
		
		let price_diff = price-entry_price;
		let gain = price_diff/entry_price;

		patience = patience -1;

		// 1) Sell because of reached gain
		if (gain>= required_gain) {
			console.log('##');
			message = 'LOG:'+candle.start.format()+' # GAIN TARGET detected! -> Going neutral, Selling at price: ' + price.toFixed(2) +  ', myprice: ' + entry_price.toFixed(2) + ' -> GAIN: ' + price_diff.toFixed(2);
                        console.log(message);
			this.currentTrend = 'neutral';
			this.advice('short');
		}
		//else if (patience%240==0) console.log(candle.start.format(),'Current Gain: ',gain,', Still Waiting for ',required_gain,', patience remaining ',patience, ' candles...');

		// 2) Sell because of end of patience
		else if (patience==0)  {
			if (gain >= dismiss_gain) {
				console.log('##');
				message = 'LOG:'+candle.start.format()+' Lost Patience! Selling at ' + price.toFixed(2) + ' --> theoric gain: '+gain.toFixed(2) + ' --> value: '+(price-entry_price).toFixed(2);
				console.log(message);
				this.advice('short');
				this.currentTrend = 'neutral';
			}
			else {
				//console.log(candle.start.format(),'Lost Patience! But not enough gain, delaying of 24 candles --> theoric gain %: ',gain);
				patience = 1;
			}
		} 
		
		// 3) Sell because of trend change
		else if (resSMA < resDEMA - required_diff_down) {
			if (gain >= dismiss_gain) {
				console.log('##');
				message = 'LOG:'+candle.start.format()+ '#### Trend change! Selling at '+price.toFixed(2)+' --> theoric gain: '+gain.toFixed(2)+ ' --> value: '+(price-entry_price).toFixed(2);
				console.log(message);
				this.currentTrend = 'down';
				this.advice('short');
			}
		}
	}
}

module.exports = method;
