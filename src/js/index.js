var contract_adr = "0xcb874d77bf4cbaeb379d60b9fc0e546edc830e79";

if (typeof window.ethereum === "undefined") {
	console.log("Metamask not installed!");
	
	// tell the user
	document.getElementById("container").innerHTML = "<h1>MetaMask is required for EthExchange!</h1><br>" + 
	"<a href = \"https://metamask.io/\" id=\"lnk\"></a>";
	var img = document.createElement('img');
	img.src = "images/metamask.png";
	document.getElementById("lnk").appendChild(img);
	throw new Error();
}


var ether_price_url = 'https://api.coinmarketcap.com/v1/ticker/ethereum/';

var ether_price, token_price=-1, tokens_circulating=-1, ether_balance=-1, token_balance=-1, token_avail=-1, token_contract, token_qty=0;

function loadRemoteFile(url){
	var Http = new XMLHttpRequest();
	Http.open("GET", url, false);
	Http.send();
	if(Http.status==200){
		return Http.responseText;
	}else
		return null;
}

function updateEtherPrice(){
	var Http = new XMLHttpRequest();
	Http.open("GET", ether_price_url, true);
	Http.send();
	Http.onreadystatechange = (e) => {
		ether_price = JSON.parse(Http.response)[0].price_usd;
		document.getElementById("etherprice").textContent = "Ethereum Price: $" +  Math.round(ether_price*100)/100.0 + " USD";
	}
}

function updateAccountData(){
	var acc = web3.eth.accounts[0];
	document.getElementById("etheradr").textContent = acc;
	document.getElementById("etheradr").href = "https://etherscan.io/address/"+acc;
	web3.eth.getBalance(acc,(error,result) => {
		ether_balance = result/1e+18;
		document.getElementById("ethbalance").textContent = "Ether Balance: " + result/1e+18 + " ETH";
		updateButtonStates();
	});
}

function updateTokenData(){
	token_contract.totalSupply.call((error, result) => {
		tokens_circulating = result.toNumber()/1e+18;
		document.getElementById("tokentotal").textContent = "Tokens in circulation: "+tokens_circulating;
		if(token_price>0)
			document.getElementById("tokenmtcap").textContent = "Token market cap: "+tokens_circulating*token_price*ether_price+" USD";
	});
	token_contract.balances.call(web3.eth.accounts[0],(error, result) => {
		token_balance = result.toNumber()/1e+18;
		document.getElementById("tokbalance").textContent = "Token balance: "+token_balance;
		updateButtonStates();
	});
	token_contract.get_tradable.call((error, result) => {
		token_avail = result.toNumber()/1e+18;
		document.getElementById("tokenavail").textContent = "Tokens for sale: "+token_avail;
		updateButtonStates();
	});
	if(typeof token_contract.price === "undefined"){
		console.log("This contract is outdated and does not expose the 'price' variable.  Token price and market cap will be unavailable.");
		document.getElementById("tokenprice").textContent = "Token price is unknown.";
		document.getElementById("tokenmtcap").textContent = "Token market cap is unknown.";
	}else{
		token_contract.price.call((error, result) => {
			token_price = result.toNumber()/10000.0;
			document.getElementById("tokenprice").textContent = "Token price: "+token_price+" ETH";
			updateButtonStates();
			if(tokens_circulating>0)
				document.getElementById("tokenmtcap").textContent = "Token market cap: "+tokens_circulating*token_price*ether_price+" USD";
		});
	}
}

function updateAll(){
	// load easy stuff first
	updateEtherPrice();
	updateAccountData();
	updateTokenData();
}

function updateButtonStates(){
	/*token_contract.allowance.call((error, result) => {
			token_price = result.toNumber()/100.0;
			document.getElementById("tokenprice").textContent = "Token price: "+token_price+" ETH";
			updateButtonStates();
			if(tokens_circulating>0)
				document.getElementById("tokenmtcap").textContent = "Token market cap: "+tokens_circulating*token_price*ether_price+" USD";
		});*/
	var disable = false;
	token_qty = document.getElementById("tokens").value;
	if(token_qty==0||ether_balance<0.01){
		document.getElementById("sell_btn").disabled = true;
		document.getElementById("buy_btn").disabled = true;
		return;
	}
	document.getElementById("sell_btn").disabled = false;
	document.getElementById("buy_btn").disabled = false;
	if(token_price*token_qty>ether_balance || token_avail<token_qty){
		document.getElementById("buy_btn").disabled = true;
	}
	if(token_qty>token_balance){
		document.getElementById("sell_btn").disabled = true;
	}
}

var was_admin = false;

function mainUpdate(){
	
	if(web3.version.network!="3"){
		window.location.reload();
		return;
	}
	
	updateAccountData();
	updateTokenData();
	
	token_contract.owner.call((error, result) => {
		var is_admin = result==web3.eth.accounts[0];
		if(is_admin!=was_admin){
			if(is_admin){
				document.getElementById("admin-box").style.display = '';
				document.getElementById("setprice_btn").onclick=onSetPrice;
				document.getElementById("setavail_btn").onclick=onSetAvail;
				document.getElementById("collect_btn").onclick=onCollect;
				document.getElementById("donate_btn").onclick=onDonate;
			}else{
				document.getElementById("admin-box").style.display = 'none';
			}
			was_admin = is_admin;
		}
	});
}

function onModify(event){
	// first check if this buy/sell can be executed
	updateAccountData();
	updateTokenData();
	
	// now do all the other calculations
	token_qty = document.getElementById("tokens").value;
	//console.log(token_qty);
	document.getElementById("value_ether").textContent = "Value in Ethereum: " + token_price*token_qty + " ETH";
	document.getElementById("value_usd").textContent = "Value in USD: $" + token_price*token_qty*ether_price;
}

function onBuy(event){
	token_contract.buy(web3.toWei(token_qty, 'ether'), {
			gas: 300000,
			from: web3.eth.accounts[0],
			value: web3.toWei(token_price*token_qty, 'ether')
		}, (err, result) => {
			// Result is the transaction address of that function
			console.log("buy: "+result);
		});
}

function onSell(event){
	token_contract.sell(web3.toWei(token_qty,'ether'), {
			gas: 300000,
			from: web3.eth.accounts[0],
			value: 0
		}, (err, result) => {
			// Result is the transaction address of that function
			console.log("sell: "+result);
		});
}

function onSetPrice(event){
	if(document.getElementById("admin_price").value<0){
		alert("Cannot set the token price to a negative.");
		return;
	}
	token_contract.setPrice(web3.toBigNumber(Math.round(document.getElementById("admin_price").value*10000)), {
			gas: 300000,
			from: web3.eth.accounts[0],
			value: 0
		}, (err, result) => {
			// Result is the transaction address of that function
			console.log("set price: "+result);
		});
}

function onSetAvail(event){
	if(document.getElementById("admin_forsale").value<0){
		alert("Cannot set this value to a negative!");
		return;
	}
	token_contract.forsale(web3.toWei(document.getElementById("admin_forsale").value,'ether'), {
			gas: 300000,
			from: web3.eth.accounts[0],
			value: 0
		}, (err, result) => {
			// Result is the transaction address of that function
			console.log("set available: "+result);
		});
}

function onCollect(event){
	if(document.getElementById("collect_qty").value<=0){
		alert("Must collect more than zero ether!");
		return;
	}
	token_contract.collect(web3.toWei(document.getElementById("collect_qty").value,'ether'),{
			gas: 300000,
			from: web3.eth.accounts[0],
			value: 0
		}, (err, result) => {
			// Result is the transaction address of that function
			console.log("collect: "+result);
		});
}

function onDonate(event){
	if(document.getElementById("donate_qty").value<=0){
		alert("Cannot donate zero or negative Ether!");
		return;
	}
	web3.eth.sendTransaction({
			to: contract_adr,
			gas: 300000,
			from: web3.eth.accounts[0],
			value: web3.toWei(document.getElementById("donate_qty").value,'ether')
		}, (err, result) => {
			// Result is the transaction address of that function
			console.log("donate: "+result);
		});
}

// Metamask injects web3 into the js context.


window.addEventListener('load', async () => {
	window.web3 = new Web3(ethereum);
	try {
		// Request account access if needed
		await ethereum.enable();
	} catch (error) {
		// User denied account access...
		console.log("User denied access!");
		
		// tell the user
		document.getElementById("container").innerHTML = "<h1>EthExchange requires access to MetaMask.</h1><br>";
		throw new Error();
	}
	
	if(web3.version.network!="3"){
		document.getElementById("container").innerHTML = "<h1>EthExchange needs to run on the Ropsten testnet.</h1><br>\
		<p>Please change the network in MetaMask to 'Ropsten'</p>";
		setInterval(function(){
			if(web3.version.network=="3")window.location.reload();
		}, 300);
		return;
	}
	
	// load easy stuff first
	updateEtherPrice();
	updateAccountData();
	
	// make sure token/contract stuff is set up before continuing...
	var Construct = web3.eth.contract(JSON.parse(loadRemoteFile('abi.json')));
	token_contract = Construct.at(contract_adr);
	updateTokenData();
	
	// now that we're set up, add the event listener(s)
	document.getElementById("tokens").oninput=onModify;//.addEventListener('change', onModify);
	document.getElementById("buy_btn").onclick=onBuy;
	document.getElementById("sell_btn").onclick=onSell;
	document.getElementById("sell_btn").disabled = false;
	document.getElementById("buy_btn").disabled = false;
	
	setInterval(mainUpdate, 200);
	setInterval(updateEtherPrice, 60000);
});


/* Example of using an ethereum contract function:
 * 
 * 
yourContractInstance.bet(7, {
   gas: 300000,
   from: web3.eth.accounts[0],
   value: web3.toWei(0.1, 'ether')
}, (err, result) => {
   // Result is the transaction address of that function
});
 */
