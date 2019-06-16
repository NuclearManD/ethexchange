
pragma solidity ^0.5.1;

contract ERC20 {
	function totalSupply() public view returns (uint);
	function balanceOf(address tokenOwner) public view returns (uint balance);
	function allowance(address tokenOwner, address spender) public view returns (uint remaining);
	function transfer(address to, uint tokens) public returns (bool success);
	function approve(address spender, uint tokens) public returns (bool success);
	function transferFrom(address from, address to, uint tokens) public returns (bool success);

	event Transfer(address indexed from, address indexed to, uint tokens);
	event Approval(address indexed tokenOwner, address indexed spender, uint tokens);
}

contract ERC20TokenLatch {
    
	
	uint public base_price;			// base price in 1/10000 ether
	uint public min_fee;			// min fee for trades
	uint public fee_div;			// divisor for the fee
	uint public min_balance;		// minimum balance for the fee acceptor account
	
	address payable public owner;
    
    address payable public latched_contract;
    
    constructor(address payable latch) public {
        latched_contract=latch;
        owner = msg.sender;
		base_price=1000;
		min_balance = 5 ether;
		fee_div = 100;
		min_fee = .00001 ether;
    }
    
    function balanceOf(address tokenOwner) public view returns (uint balance){
        return ERC20(latched_contract).balanceOf(tokenOwner);
    }
    
    function totalSupply() public view returns (uint){
        return ERC20(latched_contract).totalSupply();
    }
    
    function transfer(address target, uint qty) private{
        ERC20(latched_contract).transfer(target, qty);
    }
    
	function getFee() public view returns (uint fee){
		uint a = owner.balance;
		if(a>min_balance)return min_fee;
		return (min_balance-a)/fee_div;
	}
	
	function getSellReturn(uint amount) public view returns (uint value){	// ether for selling amount tokens
		uint a = getFee();
		if(a>(amount*base_price/10000))return 0; // if the fee outweighs the return
		return (amount*base_price/10000) - a;
	}
	
	function getBuyCost(uint amount) public view returns (uint cost){		// ether cost for buying amount tokens
	    return (amount*base_price/10000) + getFee();
	}
	
	function buy(uint tokens)public payable{
	    uint cost = getBuyCost(tokens);
		require(msg.value>=cost);
		require(canBuy(tokens));
		msg.sender.transfer(msg.value-cost);
		owner.transfer(getFee()-min_fee);
		transfer(msg.sender,tokens);
	}
	
	function sell(uint tokens)public{
	    require(ERC20(latched_contract).allowance(msg.sender, address(this))>=tokens);
	    uint result = getSellReturn(tokens);
		require(address(this).balance>result);
		require(msg.sender!=owner);
		msg.sender.transfer(result);
		owner.transfer(getFee()-min_fee);
		ERC20(latched_contract).transferFrom(msg.sender,address(this),tokens);
	}
    
    function canBuy(uint amount) public view returns (bool possible){			// returns true if this amount of token can be bought - does not account for Ethereum account balance
        return ERC20(latched_contract).balanceOf(address(this))>=amount;
    }
    
    function canSell(uint amount) public view returns (bool possible){			// returns true if this amount of token can be sold - does not account for token account balance
	    return (address(this).balance>=getSellReturn(amount));
    }
	
	function get_tradable() public view returns (uint tradable){
		return ERC20(latched_contract).balanceOf(address(this));
	}
	
	function setPrice(uint newPrice) public{
		require(msg.sender==owner);
		base_price = newPrice;
	}
	
	function setFeeParams(uint new_min_fee, uint new_fee_div, uint new_min_bal) public{
	    require(msg.sender==owner);
	    min_fee = new_min_fee;
	    min_balance = new_min_bal;
	    fee_div = new_fee_div;
	}
	
	function collect(uint amount) public{
		require(msg.sender==owner);
		require(address(this).balance>=amount+1 ether);
		owner.transfer(amount);
	}
}
