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

var ether_price, token_price=-1, tokens_circulating=-1, token_contract, token_qty=0;

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
		document.getElementById("ethbalance").textContent = "Ether Balance: " + result/1e+18 + " ETH";
	});
}

function contract_read(f){
	f.call((error, result) => {
		console.log(result); 
	});
}

function updateTokenData(){
	token_contract.totalSupply.call((error, result) => {
		tokens_circulating = result.toNumber()/1e+18;
		document.getElementById("tokentotal").textContent = "Tokens in circulation: "+tokens_circulating;
		if(token_price!=-1)
				document.getElementById("tokenmtcap").textContent = "Token market cap: "+tokens_circulating*token_price*ether_price+" USD";
	});
	token_contract.balances.call(web3.eth.accounts[0],(error, result) => {
		document.getElementById("tokbalance").textContent = "Token balance: "+result.toNumber()/1e+18; 
	});
	if(typeof token_contract.price === "undefined"){
		console.log("This contract is outdated and does not expose the 'price' variable.  Token price and market cap will be unavailable.");
		document.getElementById("tokenprice").textContent = "Token price is unknown.";
		document.getElementById("tokenmtcap").textContent = "Token market cap is unknown.";
	}else{
		token_contract.price.call((error, result) => {
			token_price = result.toNumber()/100.0;
			document.getElementById("tokenprice").textContent = "Token price: "+token_price+" ETH";
			if(tokens_circulating!=-1)
				document.getElementById("tokenmtcap").textContent = "Token market cap: "+tokens_circulating*token_price*ether_price+" USD";
		});
	}
}

function onModify(event){
	token_qty = document.getElementById("tokens").value;
	console.log(token_qty);
	document.getElementById("value_ether").textContent = "Value in Ethereum: " + token_price*token_qty + " ETH";
	document.getElementById("value_usd").textContent = "Value in USD: $" + token_price*token_qty*ether_price;
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
	
	// load easy stuff first
	updateEtherPrice();
	updateAccountData();
	
	// make sure token/contract stuff is set up before continuing...
	var Construct = web3.eth.contract(JSON.parse(loadRemoteFile('abi.json')));
	token_contract = Construct.at("0x2576643f17da9b5d3ac26e8b96d3e0351118a78d");
	updateTokenData();
	
	// now that we're set up, add the event listener(s)
	document.getElementById("tokens").onkeydown=onModify;//.addEventListener('change', onModify);
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
