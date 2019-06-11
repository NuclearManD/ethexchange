// protocols:

/* "legacy"
 * 
 * setPrice(price)	: sets the price to price/10000
 * buy(amount)		: buy tokens
 * sell(amount)		: sell tokens
 * price			: current price of the token
 * get_tradable()	: returns tokens that are for sale
*/

/* "Tr100"
 * 
 * buy(amount)			: buy tokens
 * sell(amount)			: sell tokens
 * getSellReturn(amount)	: ether for selling amount tokens
 * getBuyCost(amount)		: ether cost for buying amount tokens
 * get_tradable()	: returns tokens that are for sale
 * 
 * This protocol does not specify specific setPrice or other control functions.
 */

var protocol = "Tr100";

var decimals = 18;

function getSellReturn(token_contract, amount, callback){
	if(protocol=="legacy"){
		token_contract.price.call((error, result) => {
			callback(error, result.toNumber()/10000*amount);
		});
	}else if(protocol=="Tr100"){
		token_contract.getSellReturn(web3.toBigNumber(Math.pow(10, decimals)*amount), (error, result) => {
			callback(error, result.toNumber()/Math.pow(10, decimals));
		});
	}
}

function getBuyCost(token_contract, amount, callback){
	if(protocol=="legacy"){
		token_contract.price.call((error, result) => {
			//console.log(amount, result.toNumber());
			callback(error, (result.toNumber()/10000)*amount);
		});
	}else if(protocol=="Tr100"){
		token_contract.getBuyCost(web3.toBigNumber(Math.pow(10, decimals)*amount), (error, result) => {
			callback(error, result.toNumber()/Math.pow(10, decimals));
		});
	}
}

function getTokensAvailable(token_contract, callback){
	if(protocol=="legacy"){
		token_contract.get_tradable.call((error, result) => {
			callback(error, result.toNumber()/Math.pow(10, decimals));
		});
	}else if(protocol=="Tr100"){
		token_contract.get_tradable.call((error, result) => {
			callback(error, result.toNumber()/Math.pow(10, decimals));
		});
	}
}
