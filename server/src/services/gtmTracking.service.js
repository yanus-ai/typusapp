const axios = require('axios');

class GtmTrackingService {
  constructor(prisma) {
    this.prisma = prisma;
    this.previewHeader = process.env.GTMTRACKING_PREVIEW_HEADER || 'ZW52LTh8Um9mVEpZaE5lalBJbGtoeGtrWnZ5d3wxOTljZGQxMzA2ZjQzMmZhNDZlMDc=';
    this.baseUrl = process.env.GTMTRACKING_BASE_URL || 'https://metrics.typus.ai';
    this.measurementId = process.env.GTMTRACKING_MEASUREMENT_ID || 'G-QR6YQP6P8N';
    this.gaCookie = this.measurementId.replace('G-', '_ga_');
  }

  async saveUserData(userId, req) {

    const allowedKeys = [
      '_ga', this.gaCookie,
      '_fbp', '_fbc',
      'FPID', 'FPLC',
      '_gcl_aw', '_gcl_dc', '_gcl_gs', '_gcl_gb', '_gcl_ag', '_gcl_au', '__gads'
    ];

    const filtered = Object.fromEntries(
      Object.entries(req.cookies).filter(([key]) => allowedKeys.includes(key))
    );

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        gtmTrackingData: filtered
      }
    });
  }

  async trackEvents(userId, events) {

    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    let clientId = null;
    let sessionId = null;
    if (user.gtmTrackingData) {
      if (user.gtmTrackingData.FPID) {
        const matches = new RegExp(/FPID2.2.(.*)/).exec(user.gtmTrackingData.FPID);
        if (matches[1]) {
          clientId = matches[1]
        }
      } else if (user.gtmTrackingData._ga) {
        const matches = new RegExp(/GA1.1.(.*)/).exec(user.gtmTrackingData._ga);
        if (matches[1]) {
          clientId = matches[1]
        }
      }

      if (user.gtmTrackingData[this.gaCookie]) {
        const matches = new RegExp(/GS2.1.s([^\$]*)/).exec(user.gtmTrackingData[this.gaCookie]);
        if (matches[1]) {
          sessionId = matches[1]
        }
      }
    }

    const cookieHeader = Object.entries(user.gtmTrackingData)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    const eventsWithSession = events.map(event => {
      event.params = event.params || {}
      event.params.ga_session_id = sessionId;
      event.params.engagement_time_msec = 100;
      event.params.ip_override = '::';
      event.params.user_data = {
        email_address: user.email,
        address: {
          first_name: user.fullName.split(" ").shift(),
          last_name: user.fullName.split(" ").pop(),
        }
      };
      return event;
    });

    const response = await axios.post(
      `${this.baseUrl}/mp/collect`,
      {
        client_id: clientId,
        events: eventsWithSession
      },
      {
        params: {
          measurement_id: this.measurementId,
          // not required as we are sending to private sGTM instance
          // api_secret: apiSecret,
        },
        headers: {
          "X-Gtm-Server-Preview": this.previewHeader,
          "Content-Type": "application/json",
          Cookie: cookieHeader
        },
      }
    );
  }

}

module.exports = GtmTrackingService;