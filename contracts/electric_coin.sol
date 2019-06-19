/**
 *Submitted for verification at Etherscan.io on 2019-06-12
*/

pragma solidity ^0.5.1;

contract ERC20Interface {
	function totalSupply() public view returns (uint);
	function balanceOf(address tokenOwner) public view returns (uint balance);
	function allowance(address tokenOwner, address spender) public view returns (uint remaining);
	function transfer(address to, uint tokens) public returns (bool success);
	function approve(address spender, uint tokens) public returns (bool success);
	function transferFrom(address from, address to, uint tokens) public returns (bool success);

	event Transfer(address indexed from, address indexed to, uint tokens);
	event Approval(address indexed tokenOwner, address indexed spender, uint tokens);
}

contract ElectricCoin is ERC20Interface {

	string public symbol;
	string public  name;
	uint8 public decimals;
	uint _totalSupply;
	
	address payable public owner;

	mapping(address => uint) public balances;
	mapping(address => mapping(address => uint)) allowed;

	// ------------------------------------------------------------------------
	// Constructor
	// ------------------------------------------------------------------------
	constructor() public {
		symbol = "LLL";
		name = "Electric Coin";
		decimals = 18;
		_totalSupply = 1000000000 * 10**uint(decimals);
		owner = msg.sender;
		balances[owner] = _totalSupply;
		emit Transfer(address(0), owner, _totalSupply);
		fee = .0001 ether;
	}

	function totalSupply() public view returns (uint) {
		return _totalSupply;
	}

	function balanceOf(address tokenOwner) public view returns (uint balance) {
		return balances[tokenOwner];
	}

	function transfer(address to, uint tokens) public returns (bool success) {
		require(to!=address(0));
		require(tokens<=balances[msg.sender]);
		balances[msg.sender] = balances[msg.sender] - tokens;
		balances[to] = balances[to] + tokens;
		emit Transfer(msg.sender, to, tokens);
		return true;
	}

	function approve(address spender, uint tokens) public returns (bool success) {
		allowed[msg.sender][spender] = tokens;
		emit Approval(msg.sender, spender, tokens);
		return true;
	}

	function transferFrom(address from, address to, uint tokens) public returns (bool success) {
		require(to!=address(0));
		require(balances[from]>=tokens);
		require(allowed[from][msg.sender]>=tokens);
		balances[from] = balances[from] - tokens;
		allowed[from][msg.sender] = allowed[from][msg.sender] - tokens;
		balances[to] = balances[to] + tokens;
		emit Transfer(from, to, tokens);
		return true;
	}

	function allowance(address tokenOwner, address spender) public view returns (uint remaining) {
		return allowed[tokenOwner][spender];
	}
	
	function mint(address target, uint amt) public{
		require(msg.sender==owner);
		balances[target] += amt;
		emit Transfer(target, address(0), amt);
	}
	function burn(uint amt) public{
		require(msg.sender==owner);
		require(balances[owner]>=amt);
		balances[owner]-=amt;
	}
	
	function destroy() public {
		require(msg.sender==owner);
		selfdestruct(msg.sender);
	}
	
	
    
    uint64 trade_increment = 1;
	
	uint public fee;	    		// fee for trades
    
    mapping(uint32 => address payable) public buy_order_owners;
    mapping(uint32 => uint256)   public  buy_order_qty;
    mapping(uint32 => uint64)   public  buy_order_price;
    uint32 public num_buy_orders = 0;
    uint32 public max_buy_price_idx;
    
    mapping(uint32 => address payable) public sell_order_owners;
    mapping(uint32 => uint256)   public  sell_order_qty;
    mapping(uint32 => uint64)   public  sell_order_price;
    uint32 public num_sell_orders = 0;
    uint32 public min_sell_price_idx;
    
    function rmBuyOrder(uint32 idx) private {
        buy_order_owners[idx]=buy_order_owners[num_buy_orders];
        buy_order_qty[idx]=buy_order_qty[num_buy_orders];
        buy_order_price[idx]=buy_order_price[num_buy_orders];
        num_buy_orders--;
        if(max_buy_price_idx==idx){
            max_buy_price_idx=0;
            for(uint32 i=1;i<num_buy_orders;i++){
                if(buy_order_price[max_buy_price_idx]<buy_order_price[i])max_buy_price_idx=i;
            }
        }
    }
    
    function rmSellOrder(uint32 idx) private {
        sell_order_owners[idx]=sell_order_owners[num_sell_orders];
        sell_order_qty[idx]=sell_order_qty[num_sell_orders];
        sell_order_price[idx]=sell_order_price[num_sell_orders];
        num_sell_orders--;
        if(min_sell_price_idx==idx){
            min_sell_price_idx=0;
            for(uint32 i=1;i<num_sell_orders;i++){
                if(sell_order_price[min_sell_price_idx]>sell_order_price[i])min_sell_price_idx=i;
            }
        }
    }
    
    function addBuyOrder(address payable adr, uint256 qty, uint64 price) private {
        buy_order_owners[num_buy_orders] = adr;
        buy_order_qty[num_buy_orders] = qty;
        buy_order_price[num_buy_orders] = price;
        if(price>buy_order_price[max_buy_price_idx])max_buy_price_idx = num_buy_orders;
        if(num_buy_orders==0)max_buy_price_idx = 0;
        num_buy_orders++;
    }
    
    function addSellOrder(address payable adr, uint256 qty, uint64 price) private {
        sell_order_owners[num_sell_orders] = adr;
        sell_order_qty[num_sell_orders] = qty;
        sell_order_price[num_sell_orders] = price;
        if(price<sell_order_price[min_sell_price_idx])min_sell_price_idx = num_sell_orders;
        if(num_sell_orders==0)min_sell_price_idx = 0;
        num_sell_orders++;
    }
    
    function maxBuyPrice() public view returns (uint64 price){
        return buy_order_price[max_buy_price_idx];
    }
    
    function minSellPrice() public view returns (uint64 price){
        return sell_order_price[min_sell_price_idx];
    }
    
    function getPrice() public view returns (uint64){
        if(num_sell_orders==0){
            if(num_buy_orders==0)return 1000;
            else return maxBuyPrice();
        }else if(num_buy_orders==0) return minSellPrice();
        return (minSellPrice()+maxBuyPrice())/2;
    }
    
	function getFee() public view returns (uint){
		return fee;
	}
	
	function getBuyPrice() public view returns (uint64){
	    if(num_buy_orders>0)return maxBuyPrice()+trade_increment;
	    else return getPrice();
	}
	
	function getSellPrice() public view returns (uint64){
	    if(num_sell_orders>0)return minSellPrice()-trade_increment;
	    else return getPrice();
	}
	
	function getSellReturn(uint amount) public view returns (uint){	// ether for selling amount tokens
	    // computing fees for selling is difficult and expensive, so I'm not doing it.  Not worth it.
		return (getSellPrice()*amount)/10000;
	}
	
	function getBuyCost(uint amount) public view returns (uint){		// ether cost for buying amount tokens
	    return ((amount*getBuyPrice())/10000) + fee;
	}
	
	function buy(uint tokens)public payable{
	    uint cost = getBuyCost(tokens);
		require(msg.value>=cost);
		
		// handle fee and any extra funds
		msg.sender.transfer(msg.value-cost);
		owner.transfer(fee);
		
		// get info needed for trading
	    uint64 buy_price = getBuyPrice();
	    uint left = tokens;
	    
		// now try to fulfill the order
		for(uint32 i=0;i<num_sell_orders;i++){
		    if(buy_price<minSellPrice())
		        break; // cannot fulfill order because there is not a sell order that would satisfy
		    
		    if(sell_order_price[i]<=buy_price){
		        // we can trade some!
		        if(sell_order_qty[i]>left){
		            // we can trade all!
		            sell_order_qty[i]-=left;
		            sell_order_owners[i].transfer((sell_order_price[i]*left)/10000);
		            transfer(msg.sender, left);
		            
		            // send the owner any extra funds
		            owner.transfer(((buy_price-sell_order_price[i])*left)/10000);
		            
		            // order fully fulfilled
		            return;
		        }else{
    		        // will complete a single sell order, but buy order will have some left over
    		        uint qty = sell_order_qty[i];
    		        left-=qty;
    	            sell_order_owners[i].transfer((sell_order_price[i]*qty)/10000);
    	            transfer(msg.sender, qty);
    	            
    	            // send the owner any extra funds
    	            owner.transfer(((buy_price-sell_order_price[i])*qty)/10000);
    	            
    	            // delete the order that was completed
    	            rmSellOrder(i);
    		    }
		    }
		}
		
		// if we are here then some of the order is left.  Place the order in the queue.
		addBuyOrder(msg.sender, left, buy_price);
		
	}
	
	
	
	function sell(uint tokens)public{
	    require(balanceOf(msg.sender)>=tokens);
		
		// handle fee and any extra funds
		balances[msg.sender]-=tokens;
		balances[address(this)]+=tokens;
		emit Transfer(msg.sender, address(this), tokens);
		
		// get info needed for trading
	    uint64 sell_price = getSellPrice();
	    uint left = tokens;
	    
		// now try to fulfill the order
		for(uint32 i=0;i<num_buy_orders;i++){
		    if(sell_price>maxBuyPrice())
		        break; // cannot fulfill order because there is not a buy order that would satisfy
		    
		    if(buy_order_price[i]>=sell_price){
		        // we can trade some!
		        if(buy_order_qty[i]>left){
		            // we can trade all!
		            buy_order_qty[i]-=left;
		            transfer(buy_order_owners[i],left);
		            msg.sender.transfer((sell_price*left)/10000);
		            
		            // send the owner any extra funds
		            owner.transfer(((buy_order_price[i]-sell_price)*left)/10000);
		            
		            // order fully fulfilled
		            return;
		        }else{
    		        // will complete a single sell order, but buy order will have some left over
    		        uint qty = buy_order_qty[i];
    		        left-=qty;
    	            
		            transfer(buy_order_owners[i],qty);
    	            msg.sender.transfer((sell_price*qty)/10000);
    	            
    	            // send the owner any extra funds
    	            owner.transfer(((buy_order_price[i]-sell_price)*qty)/10000);
    	            
    	            // delete the order that was completed
    	            rmBuyOrder(i);
    		    }
		    }
		}
		
		// if we are here then some of the order is left.  Place the order in the queue.
		addSellOrder(msg.sender, left, sell_price);
	}
	
	
	function placeBuyOrder(uint tokens, uint64 price10000) public payable{
	    uint cost = fee + ((tokens*price10000)/10000);
	    require(msg.value>=cost);
		
		// handle fee and any extra funds
		msg.sender.transfer(msg.value-cost);
		owner.transfer(fee);
		
	    uint left = tokens;
	    
		// now try to fulfill the order
		for(uint32 i=0;i<num_sell_orders;i++){
		    if(price10000<minSellPrice())
		        break; // cannot fulfill order because there is not a sell order that would satisfy
		    
		    if(sell_order_price[i]<=price10000){
		        // we can trade some!
		        if(sell_order_qty[i]>left){
		            // we can trade all!
		            sell_order_qty[i]-=left;
		            sell_order_owners[i].transfer((sell_order_price[i]*left)/10000);
		            transfer(msg.sender, left);
		            
		            // send the owner any extra funds
		            owner.transfer(((price10000-sell_order_price[i])*left)/10000);
		            
		            // order fully fulfilled
		            return;
		        }else{
    		        // will complete a single sell order, but buy order will have some left over
    		        uint qty = sell_order_qty[i];
    		        left-=qty;
    	            sell_order_owners[i].transfer((sell_order_price[i]*qty)/10000);
    	            transfer(msg.sender, qty);
    	            
    	            // send the owner any extra funds
    	            owner.transfer(((price10000-sell_order_price[i])*qty)/10000);
    	            
    	            // delete the order that was completed
    	            rmSellOrder(i);
    		    }
		    }
		}
		
		// if we are here then some of the order is left.  Place the order in the queue.
		addBuyOrder(msg.sender, left, price10000);
		
	}   
	
	function placeSellOrder(uint tokens, uint64 price10000) public{
	    require(balanceOf(msg.sender)>=tokens);
		
		// handle fee and any extra funds
		balances[msg.sender]-=tokens;
		balances[address(this)]+=tokens;
		emit Transfer(msg.sender, address(this), tokens);
		
		// get info needed for trading
	    uint left = tokens;
	    //}/*
	    
		// now try to fulfill the order
		for(uint32 i=0;i<num_buy_orders;i++){
		    if(price10000>maxBuyPrice())
		        break; // cannot fulfill order because there is not a buy order that would satisfy
		    
		    if(buy_order_price[i]>=price10000){
		        // we can trade some!
		        if(buy_order_qty[i]>left){
		            // we can trade all!
		            buy_order_qty[i]-=left;
		            transfer(buy_order_owners[i],left);
		            msg.sender.transfer((price10000*left)/10000);
		            
		            // send the owner any extra funds
		            owner.transfer(((buy_order_price[i]-price10000)*left)/10000);
		            
		            // order fully fulfilled
		            return;
		        }else{
    		        // will complete a single sell order, but buy order will have some left over
    		        uint qty = buy_order_qty[i];
    		        left-=qty;
    	            
		            transfer(buy_order_owners[i],qty);
    	            msg.sender.transfer((price10000*qty)/10000);
    	            
    	            // send the owner any extra funds
    	            owner.transfer(((buy_order_price[i]-price10000)*qty)/10000);
    	            
    	            // delete the order that was completed
    	            rmBuyOrder(i);
    		    }
		    }
		}
		
		// if we are here then some of the order is left.  Place the order in the queue.
		addSellOrder(msg.sender, left, price10000);
	}//*/
    
    function canBuy(uint amount) public pure returns (bool possible){			// returns true if this amount of token can be bought - does not account for Ethereum account balance
        return true;
    }
    
    function canSell(uint amount) public pure returns (bool possible){			// returns true if this amount of token can be sold - does not account for token account balance
	    return true;
    }
	
	function get_tradable() public view returns (uint){
        return totalSupply();
    }
	
	function setFee(uint new_fee) public{
	    require(msg.sender==owner);
	    fee=new_fee;
	}
	
	function getAllowed() public view returns (uint){
	    return allowance(msg.sender, address(this));
	}
}
