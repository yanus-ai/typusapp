const { IPGeolocationApi } = require("ip-geolocation-api-sdk-typescript");

const ipGeolocationApi = new IPGeolocationApi({
  apiKey: process.env.IP_GEOLOCATION_API_KEY,
});

const getIpAddressInfo = async (ipAddress) => {
  try {
    const response = await ipGeolocationApi.getIpGeolocation({ ip: ipAddress });
    if (response.status === 200) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error("Error getting IP address info:", error);
    return null;
  }
};

const getIpAddressInfoFromRequest = async (req) => {
  try {
    return req.clientIp.replace('::ffff:', '');
  } catch (error) {
    console.error("Error getting IP address info from request:", error);
    return null;
  }
};

module.exports = { getIpAddressInfo, getIpAddressInfoFromRequest };
