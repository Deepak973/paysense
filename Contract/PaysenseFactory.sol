// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Paysense.sol";

contract PaysenseFactory {
  
    mapping(address => address[]) public userWallets;

   
    address[] public allWallets;
    address public _s_router;

   
    event WalletCreated(
        address indexed wallet,
        address[] owners,
        uint256 numConfirmationsRequired
    );


    constructor(
        address _router
    )
    {
        _s_router =_router;
    }

    /**
     * @dev Creates a new Waller instance
     * @param _owners An array of addresses representing the initial wallet owners
     * @param _numConfirmationsRequired The minimum number of owner confirmations required for transaction execution
     * @return The address of the newly created paysense wallet
     */
    function createWallet(
        address[] memory _owners,
        uint256 _numConfirmationsRequired
    ) public returns (address) {
        MultisigWallet newWallet = new MultisigWallet(
            _owners,
            _numConfirmationsRequired,
            _s_router
        );
        address walletAddress = address(newWallet);

        allWallets.push(walletAddress);

    
        for (uint256 i = 0; i < _owners.length; i++) {
            userWallets[_owners[i]].push(walletAddress);
        }

        emit WalletCreated(walletAddress, _owners, _numConfirmationsRequired);

        return walletAddress;
    }

    /**
     * @dev Retrieves all wallets associated with a user
     * @param _user The address of the user
     * @return An array of wallet addresses associated with the user
     */
    function getUserWallets(
        address _user
    ) public view returns (address[] memory) {
        return userWallets[_user];
    }

    function getAllWallets() public view returns (address[] memory) {
        return allWallets;
    }
}