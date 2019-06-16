// protocols:

/* "legacy"
 * 
 * setPrice(price)	// sets the price to price/10000
 * buy(amount)		// buy tokens
 * sell(amount)		// sell tokens
 * price			// current price of the token
 * get_tradable()	// returns tokens that are for sale
 * totalSupply		// total coins in existence
 * balanceOf(adr)	// get balance of address
*/

/* "Tr100"
 * 
 * buy(amount)				// buy tokens
 * sell(amount)				// sell tokens
 * getSellReturn(amount)	// ether for selling amount tokens
 * getBuyCost(amount)		// ether cost for buying amount tokens
 * get_tradable()			// returns tokens that are for sale
 * totalSupply				// total coins in existence
 * balanceOf(adr)			// get balance of address
 * 
 * This protocol does not specify specific setPrice or other control functions.
 */

/* "Tr100b"
 * 
 * buy(amount)				// buy tokens
 * sell(amount)				// sell tokens
 * getSellReturn(amount)	// ether for selling amount tokens
 * getBuyCost(amount)		// ether cost for buying amount tokens
 * get_tradable()			// returns tokens that are for sale
 * getFee()					// returns current fee for any transaction - may change
 * totalSupply				// total coins in existence
 * balanceOf(adr)			// get balance of address
 * 
 * This protocol does not specify specific setPrice or other control functions.
 */

/* "Tr100b-compat"
 * 
 * buy(amount)				// buy tokens
 * sell(amount)				// sell tokens
 * getSellReturn(amount)	// ether for selling amount tokens
 * getBuyCost(amount)		// ether cost for buying amount tokens
 * get_tradable()			// returns tokens that are for sale
 * getFee()					// returns current fee for any transaction - may change
 * canBuy(amount)			// returns true if this amount of token can be bought - does not account for Ethereum account balance
 * canSell(amount)			// returns true if this amount of token can be sold - does not account for token account balance
 * latched_contract			// address of the latched contract
 * totalSupply				// total coins in existence
 * balanceOf(adr)			// get balance of address
 * 
 * This protocol does not specify specific setPrice or other control functions.
 * 
 * This is identical to the Tr100b protocol, except it is designed for contracts that 'latch' to another token contract.
 */

var protocol = "Tr100";

var decimals = 18;

function getSellReturn(token_contract, amount, callback){
	if(protocol=="legacy"){
		token_contract.price.call((error, result) => {
			callback(error, result.toNumber()/10000*amount);
		});
	}else if(protocol.substring(0,3)=="Tr1"){
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
	}else if(protocol.substring(0,3)=="Tr1"){
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
	}else if(protocol.startsWith("Tr1")){
		token_contract.get_tradable.call((error, result) => {
			callback(error, result.toNumber()/Math.pow(10, decimals));
		});
	}
}

function getFee(token_contract, callback){
	if(protocol.startsWith("Tr100b")){
		token_contract.getFee.call({
			from: web3.eth.accounts[0],
			gasPrice: "115200"
		},(error, result) => {
			callback(error, web3.fromWei(result, "ether").toNumber());
		});
	}else callback(null,0);
}

function getTotalSupply(token_contract, callback){
	if(protocol.startsWith("Tr") || protocol=="legacy"){
		token_contract.totalSupply.call((error,result) => {
			callback(error,result.toNumber()/Math.pow(10, decimals));
		});
	}
}

function getBalance(token_contract, address, callback){
	if(protocol.startsWith("Tr") || protocol=="legacy"){
		token_contract.balanceOf.call(web3.eth.accounts[0],(error, result) => {
			callback(error,result.toNumber()/1e+18);
		});
	}
}

function canBuy(token_contract, tokens, ether_bal, callback){
	getBuyCost(token_contract, tokens, (error, result) => {
		if(result>ether_bal+.0001){
			callback("Insufficient ether", false);
			return;
		}
		getForSale(token_contract, (error, result) => {
			if(result<tokens){
				callback("Not for sale", false);
				return;
			}
			if(protocol=="Tr100b-compat"){
				token_contract.canBuy.call(tokens, (error, result) =>{
					callback(error, result);
				});
			}else if(protocol.startsWith("Tr100")){
				callback(null, true);
			}else if(protocol=="legacy"){
				callback(null, true);
			}else{
				callback("Unknown protocol '"+protocol+"'", false);
			}
		});
	});
}

function canSell(token_contract, tokens, token_bal, callback){
	if(tokens>token_bal){
		callback("Insufficient tokens", false);
		return;
	}
	if(protocol=="Tr100b-compat"){
		token_contract.canSell.call(tokens, (error, result) =>{
			callback(error, result);
		});
	}else if(protocol.startsWith("Tr100")){
		callback(null, true);
	}else if(protocol=="legacy"){
		callback(null, true);
	}else{
		callback("Unknown protocol '"+protocol+"'", false);
	}
}

function getForSale(token_contract, callback){
	if(protocol.startsWith("Tr") || protocol=="legacy"){
		token_contract.get_tradable.call((error, result) => {
			callback(error, result.toNumber()/Math.pow(10, decimals));
		});
	}else{
		callback("Unknown protocol '"+protocol+"'", 0);
	}
}


