var contract_config = "coins/homt2.json";
var contract_data;

if(window.location.hash){
	contract_config = "coins/"+window.location.hash.substring(1)+".json";
}

var networks = {};
networks['1'] = 'Mainnet'
networks['3'] = 'Ropsten'

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

function sround(num){
	return Math.round(num*100.0)/100.0;
}

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
		ether_price = parseInt(JSON.parse(Http.response)[0].price_usd);
		document.getElementById("etherprice").textContent = "Ethereum Price: $" +  sround(ether_price) + " USD";
	}
}

function updateAccountData(){
	var acc = web3.eth.accounts[0];
	document.getElementById("etheradr").textContent = acc;
	document.getElementById("etheradr").href = "https://etherscan.io/address/"+acc;
	web3.eth.getBalance(acc,(error,result) => {
		ether_balance = result/1e+18;
		document.getElementById("ethbalance").textContent = "Ether Balance: " + result/1e+18 + " ETH ("+sround(ether_balance*ether_price)+" USD)";
		updateButtonStates();
	});
}

function updateTokenData(){
	getTotalSupply(token_contract, (error, result) => {
			tokens_circulating = result;
			document.getElementById("tokentotal").textContent = "Tokens in circulation: "+tokens_circulating;
			getBuyCost(token_contract,tokens_circulating,(error, result2) => {
				token_price = result2/tokens_circulating;
				document.getElementById("tokenprice").textContent = "Token buy price: "+token_price+" ETH ("+(token_price*ether_price)+" USD)";
				updateButtonStates();
				if(tokens_circulating>0)
					document.getElementById("tokenmtcap").textContent = "Token market cap: "+result2*ether_price+" USD";
			});
		});
	getBalance(token_contract,web3.eth.accounts[0],(error, result) => {
		token_balance = result;
		document.getElementById("tokbalance").textContent = "Token balance: "+token_balance+" ("+sround(token_balance*token_price)+" ETH | "+sround(token_balance*token_price*ether_price)+" USD)";
		updateButtonStates();
	});
	getForSale(token_contract,(error, result) => {
		token_avail = result;
		document.getElementById("tokenavail").textContent = "Tokens for sale: "+token_avail;
		updateButtonStates();
	});
	getFee(token_contract,(error, result) => {
		document.getElementById("tokenfee").textContent = "Trading fee: "+result+" ETH";
		updateButtonStates();
	});
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
	token_qty = parseInt(document.getElementById("tokens").value);
	if(token_qty==0||ether_balance<0.01){
		document.getElementById("sell_btn").disabled = true;
		document.getElementById("buy_btn").disabled = true;
		return;
	}
	canBuy(token_contract, token_qty, ether_balance, (error, result) => {
		if(error!=null)console.log(error);
		document.getElementById("buy_btn").disabled = !result;
	});
	canSell(token_contract, token_qty, token_balance, (error, result) => {
		if(error!=null)console.log(error);
		document.getElementById("sell_btn").disabled = !result;
	});
}

var was_admin = false;

function mainUpdate(){
	
	if(web3.version.network!=contract_data.network){
		window.location.reload();
		return;
	}
	
	updateAccountData();
	updateTokenData();
	
	if(contract_data.protocol=="legacy"){
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
}

function onModify(event){
	// first check if this buy/sell can be executed
	updateAccountData();
	updateTokenData();
	
	// now do all the other calculations
	token_qty = document.getElementById("tokens").value;
	//console.log(token_qty);
	getBuyCost(token_contract,token_qty,(error,result)=>{
		document.getElementById("buy_val").textContent = "Buy cost: " + result + " ETH ("+result*ether_price+" USD)";
	});
	getSellReturn(token_contract,token_qty,(error,result)=>{
		document.getElementById("sell_val").textContent = "Sell value: " + result + " ETH ("+result*ether_price+" USD)";
	});
}

function onBuy(event){
	buy(token_contract, contract_data, document.getElementById("tokens").value);
}

function onSell(event){
	sell(token_contract, contract_data, document.getElementById("tokens").value);
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
			to: contract_data.address,
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
	
	var json = loadRemoteFile(contract_config);
	
	if(json==null){
		document.getElementById("container").innerHTML = "<h1>Error: coin not tradable!</h1><br>\
		<p>The specified configuration file does not exist!  Looked for this file: "+contract_config+"</p>";
		return;
	}
	
	contract_data = JSON.parse(json);
	protocol = contract_data.protocol;
	
	document.getElementById("title").textContent = "EthX: Trade "+contract_data.symbol;
	
	if(web3.version.network!=contract_data.network){
		document.getElementById("container").innerHTML = "<h1>EthExchange needs to run on "+networks[contract_data.network]+".</h1><br>\
		<p>Please change the network in MetaMask to '"+networks[contract_data.network]+"'</p>";
		setInterval(function(){
			if(web3.version.network==contract_data.network)window.location.reload();
		}, 300);
		return;
	}
	
	// load easy stuff first
	updateEtherPrice();
	updateAccountData();
	
	document.getElementById("main-header").textContent = "Trade "+contract_data.name;
	
	// make sure token/contract stuff is set up before continuing...
	var Construct = web3.eth.contract(JSON.parse(loadRemoteFile(contract_data.abi)));
	token_contract = Construct.at(contract_data.address);
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
