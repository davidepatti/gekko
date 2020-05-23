var _ = require('lodash');
var log = require('../core/log.js');

var entry_price;
var max_patience;
var patience;
var target_gain;
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
	this.name = 'robinHODL';

	this.currentTrend = this.settings.starting_trend;
	max_patience = this.settings.max_patience;
	patience = max_patience;
	dismiss_gain = this.settings.dismiss_gain;
	target_gain = this.settings.target_gain;
	this.requiredHistory = this.tradingAdvisor.historySize;

	// the following will be considered only if manually setting starting trend
	if (this.currentTrend=='up') {
		patience = 132;
		entry_price = this.settings.entry_price;
		this.advice('long');
	}


	// define the indicators we need to determine UP and DOWN
	// https://www.investopedia.com/terms/d/double-exponential-moving-average.asp
	this.addIndicator('dema', 'DEMA', this.settings);
	this.addIndicator('sma', 'SMA', this.settings.weight);

	// in candles...
	report_step = this.settings.log_step;

	console.log('Starting RobinHODL...');
	console.log('-------------------------------------');
	console.log('weight: '+this.settings.weight);
	console.log('starting trend: '+this.settings.starting_trend);
	if (this.currentTrend!='neutral') {
		console.log('entry price: '+this.settings.entry_price);
	}
	console.log('max patience: '+this.settings.max_patience);
	console.log('current patience: '+patience);
	console.log('dismiss_gain: '+this.settings.dismiss_gain);
	console.log('target_gain: '+this.settings.target_gain);
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
	let req_diff_up = (this.settings.MAdiffUP)*price;
	let req_diff_down = (this.settings.MAdiffDOWN)*price;
	let price_diff = price-entry_price;
	let gain = price_diff/entry_price;

	report_step = report_step-1;

	var message;
	if (report_step==0) {
		if (this.currentTrend=='neutral') {
		message = 'LOG:'+candle.start.format('YY-MM-DD HH:mm')+' [Price:'+ price.toFixed(0)+ '] [' + this.currentTrend + '] [SMA:' + resSMA.toFixed(0) +' DMA:' + resDEMA.toFixed(0) + '] [diff (curr/req UP-DOWN):'+ diff.toFixed(0)+ '/ ' + req_diff_up.toFixed(0)+'-'+req_diff_down.toFixed(0)+']';
		}
		else {
		message = 'LOG:'+candle.start.format('YY-MM-DD HH:mm')+' [Price:'+ price.toFixed(0)+ '] [' + this.currentTrend + '] [entry:'+entry_price+' gain:'+gain.toFixed(2)+' curr patience:'+patience+'] [diff (curr/req UP-DOWN):'+ diff.toFixed(0)+ '/ ' + req_diff_up.toFixed(0)+'-'+req_diff_down.toFixed(0)+']';
		}
		console.log(message); 
		report_step = this.settings.log_step;
	}

	if (this.currentTrend=='neutral') {
		// set trend down
		if(resSMA < resDEMA - req_diff_down) {
			console.log('##EVENT-->');
			message = 'LOG:'+candle.start.format('YY-MM-DD HH:mm')+' [Price:'+ price.toFixed(2)+ '] [' + this.currentTrend + '] [SMA:' + resSMA.toFixed(2) +' DMA:' + resDEMA.toFixed(2) + '] [diff (curr/req UP-DOWN):'+ diff.toFixed(2)+ '/ ' + req_diff_up.toFixed(2)+'-'+req_diff_down.toFixed(2)+']';
			console.log(message); 
		
			message = 'LOG:'+candle.start.format('YY-MM-DD HH:mm')+'-> Bears detected-> setting DOWN and waiting for bulls...';
			console.log(message);
			this.currentTrend = 'down';
		}
		// tred up, buy
		if(resSMA > resDEMA + req_diff_up) {
			console.log('##EVENT-->');
			message = 'LOG:'+candle.start.format('YY-MM-DD HH:mm')+' [Price:'+ price.toFixed(2)+ '] [' + this.currentTrend + '] [SMA:' + resSMA.toFixed(2) +' DMA:' + resDEMA.toFixed(2) + '] [diff (curr/req UP-DOWN):'+ diff.toFixed(2)+ '/ ' + req_diff_up.toFixed(2)+'-'+req_diff_down.toFixed(2)+']';

			console.log(message); 
		
			message = 'LOG:'+candle.start.format('YY-MM-DD HH:mm')+'->Bulls detected-> BUYing, going HODL and waiting for gain...';
			console.log(message);
			this.currentTrend = 'up';
			this.advice('long');
			entry_price = price;
			patience = max_patience;
		}
	}
	// when down, uptrend detection enables a buy & hodl position
	if(this.currentTrend == 'down') {
		if(resSMA > resDEMA + req_diff_up) {
			console.log('##EVENT-->');
			message = 'LOG:'+candle.start.format('YY-MM-DD HH:mm')+' [Price:'+ price.toFixed(2)+ '] [' + this.currentTrend + '] [SMA:' + resSMA.toFixed(2) +' DMA:' + resDEMA.toFixed(2) + '] [diff (curr/req UP-DOWN):'+ diff.toFixed(2)+ '/ ' + req_diff_up.toFixed(2)+'-'+req_diff_down.toFixed(2)+']';
			console.log(message); 
		
			message = 'LOG:'+candle.start.format('YY-MM-DD HH:mm')+'->Bulls detected-> BUYing, going HODL and waiting for gain...';
			console.log(message);

			this.currentTrend = 'up';
			this.advice('long');
			entry_price = price;
			patience = max_patience;
		}
	} 

	if (this.currentTrend=='up') {
		
		price_diff = price-entry_price;
		gain = price_diff/entry_price;

		patience = patience -1;

		// 1) Sell because of reached gain
		if (gain>= target_gain) {
			console.log('##EVENT-->');
			message = 'LOG:'+candle.start.format('YY-MM-DD HH:mm')+' # GAIN TARGET detected! -> Going neutral, Selling at price: ' + price.toFixed(2) +  ', myprice: ' + entry_price.toFixed(2) + ' -> GAIN: ' + price_diff.toFixed(2);
                        console.log(message);
			this.currentTrend = 'neutral';
			this.advice('short');
		}

		// 2) Sell because of end of patience
		else if (patience==0)  {
			if (gain >= dismiss_gain) {
				console.log('##EVENT-->');
				message = 'LOG:'+candle.start.format('YY-MM-DD HH:mm')+' Lost Patience! Selling at ' + price.toFixed(2) + ' --> theoric gain: '+gain.toFixed(2) + ' --> value: '+(price-entry_price).toFixed(2);
				console.log(message);
				this.advice('short');
				this.currentTrend = 'neutral';
			}
			else {
				patience = 1;
			}
		} 
		
		// 3) Sell because of trend change
		else if (resSMA < resDEMA - req_diff_down) {
			if (gain >= dismiss_gain) {
				console.log('##EVENT-->');
				message = 'LOG:'+candle.start.format('YY-MM-DD HH:mm')+ '#### Trend change! Selling at '+price.toFixed(2)+' --> theoric gain: '+gain.toFixed(2)+ ' --> value: '+(price-entry_price).toFixed(2);
				console.log(message);
				this.currentTrend = 'down';
				this.advice('short');
			}
		}
	}
}

module.exports = method;
