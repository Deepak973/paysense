  // SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./paysenseMain.sol";
import {CCIPReceiver} from "@chainlink/contracts-ccip/src/v0.8/ccip/applications/CCIPReceiver.sol";

contract PaysenseFactory is CCIPReceiver {
    IRouterClient private s_router;
    error NotEnoughBalance(uint256 currentBalance, uint256 calculatedFees);
    mapping(address => address[]) public userWallets;

    // Array to store all created OrbitWallet addresses
    address[] public allWallets;

    // Event emitted when a new OrbitWallet is created
    event WalletCreated(
        address indexed wallet,
        address[] owners,
        uint256 numConfirmationsRequired
    );

    constructor(address _router) CCIPReceiver(_router) {
        s_router = IRouterClient(_router); 
    }

      receive() external payable {
      
    }

    /**
     * @dev Creates a new OrbitWallet instance
     * @param _owners An array of addresses representing the initial wallet owners
     * @param _numConfirmationsRequired The minimum number of owner confirmations required for transaction execution
     * @return The address of the newly created OrbitWallet
     */
    function createWallet(
        uint64 _destinationChainSelector,
        address _receiver,
        address[] memory _owners,
        uint256 _numConfirmationsRequired
    ) public payable returns (address, bytes32 messageId) {
        //   bytes32 _salt = keccak256(
        //     abi.encode(_owners, _numConfirmationsRequired)
        // );

        // Get the bytecode of the MultisigWallet contract with constructor args
        // bytes memory bytecode = abi.encodePacked(
        //     type(MultisigWallet).creationCode,
        //     abi.encode(_owners, _numConfirmationsRequired)
        // );

        // Deploy the contract using create2
        // address walletAddress = deploy(bytecode, _salt);
        Paysense newWallet = new Paysense();
        Paysense(newWallet).initialize(_owners, _numConfirmationsRequired, address(s_router));

        address walletAddress = address(newWallet);


        bytes memory _data = abi.encode(_owners,_numConfirmationsRequired);
        Client.EVM2AnyMessage memory evm2AnyMessage = _buildCCIPMessage(
            _receiver,
            _data,
            address(0)
        );

        if (_destinationChainSelector != 0) {
            // Get the fee required to send the message
            uint256 fees = s_router.getFee(
                _destinationChainSelector,
                evm2AnyMessage
            );

            if (fees > msg.value)
                revert NotEnoughBalance(address(this).balance, fees);

            // Send the message through the router and store the returned message ID
            messageId = s_router.ccipSend{value: fees}(
                _destinationChainSelector,
                evm2AnyMessage
            );
        }

        // Add the new wallet to the list of all wallets
        allWallets.push(walletAddress);
        for(uint256 i=0;i<_owners.length;i++)
        {
            userWallets[_owners[i]].push(walletAddress);
        }
        emit WalletCreated(walletAddress,_owners,_numConfirmationsRequired);
        return (walletAddress, messageId);
    }

  function deploy(
        bytes memory bytecode,
        bytes32 _salt
    ) public payable returns (address) {
        address addr;

        assembly {
            addr := create2(
                callvalue(),            // wei sent with current call
                add(bytecode, 0x20),    // bytecode starts after the first 32 bytes
                mload(bytecode),        // load the size of the bytecode
                _salt                   // salt from function arguments
            )

            if iszero(extcodesize(addr)) {
                revert(0, 0)
            }
        }

        return addr;
    }

    /// @notice Construct a CCIP message.
    /// @dev This function will create an EVM2AnyMessage struct with all the necessary information for sending a text.
    /// @param _receiver The address of the receiver.
    /// @param _text The string data to be sent.
    /// @param _feeTokenAddress The address of the token used for fees. Set address(0) for native gas.
    /// @return Client.EVM2AnyMessage Returns an EVM2AnyMessage struct which contains information for sending a CCIP message.
    function _buildCCIPMessage(
        address _receiver,
        bytes memory _text,
        address _feeTokenAddress
    ) private pure returns (Client.EVM2AnyMessage memory) {
        // Create an EVM2AnyMessage struct in memory with necessary information for sending a cross-chain message
        return
            Client.EVM2AnyMessage({
                receiver: abi.encode(_receiver), // ABI-encoded receiver address
                data: _text, // ABI-encoded string
                tokenAmounts: new Client.EVMTokenAmount[](0), // Empty array as no tokens are transferred
                extraArgs: Client._argsToBytes(
                    // Additional arguments, setting gas limit and allowing out-of-order execution.
                    // Best Practice: For simplicity, the values are hardcoded. It is advisable to use a more dynamic approach
                    // where you set the extra arguments off-chain. This allows adaptation depending on the lanes, messages,
                    // and ensures compatibility with future CCIP upgrades. Read more about it here: https://docs.chain.link/ccip/best-practices#using-extraargs
                    Client.EVMExtraArgsV2({
                        gasLimit: 200_000, // Gas limit for the callback on the destination chain
                        allowOutOfOrderExecution: true // Allows the message to be executed out of order relative to other messages from the same sender
                    })
                ),
                // Set the feeToken to a feeTokenAddress, indicating specific asset will be used for fees
                feeToken: _feeTokenAddress
            });
    }


    /// handle a received message
    function _ccipReceive(Client.Any2EVMMessage memory any2EvmMessage)
        internal
        override
    {
         Paysense newWallet = new Paysense();
      
      
    }

    /**
     * @dev Retrieves all wallets associated with a user
     * @param _user The address of the user
     * @return An array of OrbitWallet addresses associated with the user
     */
    function getUserWallets(address _user)
        public
        view
        returns (address[] memory)
    {
        return userWallets[_user];
    }

    /**
     * @dev Retrieves all created OrbitWallet addresses
     * @return An array of all OrbitWallet addresses
     */
    function getAllWallets() public view returns (address[] memory) {
        return allWallets;
    }
}