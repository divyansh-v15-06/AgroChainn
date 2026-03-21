// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IFtsoRegistry {
    function getCurrentPriceWithDecimals(string memory symbol)
        external
        view
        returns (uint256 price, uint256 timestamp, uint256 decimals);
}

contract OracleConsumer {
    IFtsoRegistry public ftsoRegistry;
    address public keeper;

    enum DataConfidence { LOW, MEDIUM, HIGH }

    // regionCode => drought index (0-100), timestamp, riskScore, and data confidence
    struct DroughtData {
        uint256 index;
        uint256 timestamp;
        uint256 riskScore;
        DataConfidence confidence;
    }

    mapping(bytes32 => DroughtData) public droughtByRegion;

    event KeeperUpdated(address indexed keeper);
    event FtsoRegistryUpdated(address indexed registry);
    event DroughtIndexUpdated(bytes32 indexed regionCode, uint256 index, uint256 timestamp, uint256 riskScore, DataConfidence confidence);

    modifier onlyKeeper() {
        require(msg.sender == keeper, "OracleConsumer: not keeper");
        _;
    }

    constructor(address _ftsoRegistry, address _keeper) {
        ftsoRegistry = IFtsoRegistry(_ftsoRegistry);
        keeper = _keeper;
        emit KeeperUpdated(_keeper);
        emit FtsoRegistryUpdated(_ftsoRegistry);
    }

    function setKeeper(address _keeper) external onlyKeeper {
        keeper = _keeper;
        emit KeeperUpdated(_keeper);
    }

    function setFtsoRegistry(address _ftsoRegistry) external onlyKeeper {
        ftsoRegistry = IFtsoRegistry(_ftsoRegistry);
        emit FtsoRegistryUpdated(_ftsoRegistry);
    }

    function updateDroughtIndex(bytes32 regionCode, uint256 noaa, uint256 ndvi, uint256 weather, uint256 riskScore) external onlyKeeper {
        require(noaa <= 100 && ndvi <= 100 && weather <= 100, "OracleConsumer: index out of range");
        
        // Calculate median
        uint256 index;
        if ((noaa >= ndvi && noaa <= weather) || (noaa <= ndvi && noaa >= weather)) {
            index = noaa;
        } else if ((ndvi >= noaa && ndvi <= weather) || (ndvi <= noaa && ndvi >= weather)) {
            index = ndvi;
        } else {
            index = weather;
        }

        // Calculate variance
        uint256 maxVal = noaa > ndvi ? (noaa > weather ? noaa : weather) : (ndvi > weather ? ndvi : weather);
        uint256 minVal = noaa < ndvi ? (noaa < weather ? noaa : weather) : (ndvi < weather ? ndvi : weather);
        uint256 diff = maxVal - minVal;
        
        DataConfidence conf = DataConfidence.HIGH;
        if (diff > 20) {
            conf = DataConfidence.LOW;
        } else if (diff > 10) {
            conf = DataConfidence.MEDIUM;
        }

        droughtByRegion[regionCode] = DroughtData({
            index: index, 
            timestamp: block.timestamp,
            riskScore: riskScore,
            confidence: conf
        });
        emit DroughtIndexUpdated(regionCode, index, block.timestamp, riskScore, conf);
    }

    function getDroughtIndex(bytes32 regionCode) external view returns (uint256 index, uint256 timestamp, uint256 riskScore) {
        DroughtData memory data = droughtByRegion[regionCode];
        return (data.index, data.timestamp, data.riskScore);
    }
}

