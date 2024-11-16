// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IRouterClient} from "@chainlink/contracts-ccip/src/v0.8/ccip/interfaces/IRouterClient.sol";
import {Client} from "@chainlink/contracts-ccip/src/v0.8/ccip/libraries/Client.sol";

contract Paysense is EIP712 {
    using ECDSA for bytes32;
    event Deposit(address indexed sender, uint256 amount, uint256 balance);

    IRouterClient private s_router;

    error NotEnoughBalance(uint256 currentBalance, uint256 calculatedFees);

    bytes32 private constant EXECUTE_TYPEHASH =
        keccak256(
            "Execute(address to,uint256 value,bytes data,uint256 nonce,uint256 deadline)"
        );

    /**
     * @dev Initializes the multi-signature wallet contract.
     * @param _owners An array of addresses representing the initial wallet owners.
     * @param _numConfirmationsRequired The minimum number of owner confirmations required for transaction execution.
     * @notice At least 1 owner is required to create the wallet.
     * @notice The threshold for confirmations should be set to 2 or more.
     * @notice Each owner must have a unique address, and zero addresses are not allowed.
     * @notice The number of required confirmations must be between 2 and the total number of owners.
     * @notice This function is called only once during contract deployment.
     */
    constructor(
        address[] memory _owners,
        uint256 _numConfirmationsRequired,
        address _router
    ) EIP712("MultisigCCIP", "1") {
        uint256 ownerCount = _owners.length;
        require(ownerCount >= 1, "At least 1 owner required");
        require(
            _numConfirmationsRequired >= 2 &&
                _numConfirmationsRequired <= ownerCount,
            "Invalid threshold"
        );

        for (uint256 i = 0; i < ownerCount; ) {
            address owner = _owners[i];
            require(
                owner != address(0) && !isOwner[owner],
                "Invalid or duplicate owner"
            );

            isOwner[owner] = true;
            ++i;
        }

        owners = _owners;
        ownersCount = ownerCount;
        numConfirmationsRequired = _numConfirmationsRequired;
        s_router = IRouterClient(_router);
        
    }

    function setCCIPRouter  (address _router) public onlyOwners
    {
       s_router = IRouterClient(_router);
    }
    mapping(bytes32 => bool) internal _authorizationStates;

    modifier nonceNotUsed(bytes32 nonce) {
        require(_authorizationStates[nonce] == false, "Nonce already used");
        _;
    }

    function changeThreshold(uint256 _value) public onlyWallet {
        require(_value >= 2, "threshold can't be less than 2");
        require(
            _value <= ownersCount,
            "Threshold can't be more than Owners length"
        );
        numConfirmationsRequired = _value;
    }

    /// @notice Adds a new owner to the multi-signature wallet.
    /// @dev Only the wallet owner can call this function.
    /// @param _address The address of the new owner to be added.
    function addOwner(address _address) public onlyWallet {
        require(_address != address(0), "address can't be null");
        require(!isOwner[_address], "Owner already added");
        isOwner[_address] = true;
        owners.push(_address);
        ownersCount++;
    }

    function deleteOwner(address _address) public onlyWallet {
        require(_address != address(0), "Zero address not allowed");
        require(isOwner[_address], "Owner doesn't exist");
        require(ownersCount > 2, "Cannot delete the last two owner");
        require(numConfirmationsRequired > 2, "Threshold cannot go below 2");
        isOwner[_address] = false;
        numConfirmationsRequired--;
        ownersCount--;
    }

    // Array of all owners
    address[] public owners;
    uint256 public ownersCount;

    // Mapping to track whether an address is an owner of the wallet
    mapping(address => bool) public isOwner;

    // The number of confirmations required for executing certain operations in the wallet
    uint256 public numConfirmationsRequired;

    // Mapping indicating whether a transaction is confirmed, indexed by transaction index and owner
    mapping(uint256 => mapping(address => bool)) public isConfirmed;

    // Modifier: Only allows execution by owners of the wallet
    modifier onlyOwners() {
        require(isOwner[msg.sender], "not owner");
        _;
    }

    // Modifier: Only allows execution by the wallet itself
    modifier onlyWallet() {
        require(msg.sender == address(this), "not Wallet");
        _;
    }

    /// @notice Default receive function that allows the contract to accept incoming Ether
    receive() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    /// @notice Fallback function to handle Ether sent to the contract without a specific function call
    fallback() external payable {
        emit Deposit(msg.sender, msg.value, address(this).balance);
    }

    function executeTransaction(
        address to,
        uint256 value,
        bytes memory data,
        uint256 deadline,
        bytes32 nonce,
        bytes[] memory signatures
    ) public payable nonceNotUsed(nonce) returns (bool success) {
        require(block.timestamp <= deadline, "Transaction expired");

        bytes32 txHash = keccak256(
            abi.encode(
                EXECUTE_TYPEHASH,
                to,
                value,
                keccak256(data),
                nonce,
                deadline
            )
        );
        bytes32 hash = _hashTypedDataV4(txHash);

        // Verify signatures
        verifySignatures(hash, signatures);

        // Execute the transaction
        (success, ) = to.call{value: value}(data);
        _authorizationStates[nonce]=true;
        require(success, "Failed to execute");
    }

    function transferTokensPayNative(
        uint64 _destinationChainSelector,
        address _receiver,
        address _token,
        uint256 _amount
    ) external onlyWallet returns (bytes32 messageId) {
        // Create an EVM2AnyMessage struct in memory with necessary information for sending a cross-chain message
        // address(0) means fees are paid in native gas
        Client.EVM2AnyMessage memory evm2AnyMessage = _buildCCIPMessage(
            _receiver,
            _token,
            _amount,
            address(0)
        );

        // Get the fee required to send the message
        uint256 fees = s_router.getFee(
            _destinationChainSelector,
            evm2AnyMessage
        );

        if (fees > address(this).balance)
            revert NotEnoughBalance(address(this).balance, fees);

        // approve the Router to spend tokens on contract's behalf. It will spend the amount of the given token
        IERC20(_token).approve(address(s_router), _amount);

        // Send the message through the router and store the returned message ID
        messageId = s_router.ccipSend{value: fees}(
            _destinationChainSelector,
            evm2AnyMessage
        );

        // Return the message ID
        return messageId;
    }

    function _buildCCIPMessage(
        address _receiver,
        address _token,
        uint256 _amount,
        address _feeTokenAddress
    ) private pure returns (Client.EVM2AnyMessage memory) {
        // Set the token amounts
        Client.EVMTokenAmount[]
            memory tokenAmounts = new Client.EVMTokenAmount[](1);
        tokenAmounts[0] = Client.EVMTokenAmount({
            token: _token,
            amount: _amount
        });

        // Create an EVM2AnyMessage struct in memory with necessary information for sending a cross-chain message
        return
            Client.EVM2AnyMessage({
                receiver: abi.encode(_receiver), // ABI-encoded receiver address
                data: "", // No data
                tokenAmounts: tokenAmounts, // The amount and type of token being transferred
                extraArgs: Client._argsToBytes(
                    // Additional arguments, setting gas limit and allowing out-of-order execution.
                    // Best Practice: For simplicity, the values are hardcoded. It is advisable to use a more dynamic approach
                    // where you set the extra arguments off-chain. This allows adaptation depending on the lanes, messages,
                    // and ensures compatibility with future CCIP upgrades. Read more about it here: https://docs.chain.link/ccip/best-practices#using-extraargs
                    Client.EVMExtraArgsV2({
                        gasLimit: 0, // Gas limit for the callback on the destination chain
                        allowOutOfOrderExecution: true // Allows the message to be executed out of order relative to other messages from the same sender
                    })
                ),
                // Set the feeToken to a feeTokenAddress, indicating specific asset will be used for fees
                feeToken: _feeTokenAddress
            });
    }

    function verifySignatures(bytes32 hash, bytes[] memory _signatures)
        internal
        view
    {
        address[] memory signers = new address[](_signatures.length);
        for (uint256 i = 0; i < _signatures.length; i++) {
            signers[i] = ECDSA.recover(hash, _signatures[i]);
            require(isOwner[signers[i]], "Not a member of Wallet");
        }

        uint256 uniqueSigners = 0;
        for (uint256 i = 0; i < signers.length; i++) {
            bool isDuplicate = false;
            for (uint256 j = 0; j < uniqueSigners; j++) {
                if (signers[i] == signers[j]) {
                    isDuplicate = true;
                    break;
                }
            }
            if (!isDuplicate) {
                uniqueSigners++;
            }
        }
        require(
            uniqueSigners >= numConfirmationsRequired,
            "Not enough unique signatures"
        );
    }

    /**
     * @dev Retrieves the addresses of all active wallet owners.
     * @return result An array containing the addresses of the wallet owners.
     * @notice Only active owners are included in the result; inactive owners are ignored.
     */
    function getOwners() public view returns (address[] memory) {
        address[] memory result = new address[](ownersCount);
        uint256 index = 0;
        for (uint256 i = 0; i < owners.length; i++) {
            if (isOwner[owners[i]]) {
                result[index] = owners[i];
                index++;
            }
        }

        return result;
    }

     // Transfer ETH to a specified address
    function transferEth(address payable _recipient, uint256 _amount) public onlyWallet {
        require(_amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = _recipient.call{value: _amount}("");
        require(success, "Failed to send Ether");
    }

    // Transfer ERC20 tokens to a specified address
    function transferERC20(address _token, address _recipient, uint256 _amount) public onlyWallet {
        require(_token != address(0), "Invalid token address");
        IERC20 token = IERC20(_token);
        bool success = token.transfer(_recipient, _amount);
        require(success, "Failed to transfer tokens");
    }

    /**
     * @dev Withdraws a specified amount of funds from the wallet to a specified address.
     * @param _amount The amount of funds to withdraw.
     * @param _address The address to which the funds will be transferred.
     * @notice This function can only be called by the wallet itself.
     * @notice The function checks if the wallet has sufficient funds for the specified amount before initiating the transfer.
     */
    function withdraw(uint256 _amount, address payable _address)
        public
        onlyWallet
    {
        require(address(this).balance >= _amount, "Insufficient funds");
        (bool sent, ) = _address.call{value: _amount}("");
        require(sent, "Failed to send Ether");
    }

    function getContractBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
