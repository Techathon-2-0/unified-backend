import nodemailer from 'nodemailer';
import { drizzle } from "drizzle-orm/mysql2";
import { eq, and } from "drizzle-orm";
import { alarm_email, alarm, alarm_alert } from "../db/schema";

const db = drizzle(process.env.DATABASE_URL!);

// Email configuration from environment variables
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST!,
  port: parseInt(process.env.EMAIL_PORT!),
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  user: process.env.EMAIL_USER! || '',
  password: process.env.EMAIL_PASSWORD! || '',
  from: process.env.EMAIL_USER! || '',
};

// Create reusable transporter object using SMTP transport
const transporter = nodemailer.createTransport({
  host: EMAIL_CONFIG.host,
  port: EMAIL_CONFIG.port,
  secure: EMAIL_CONFIG.secure,
  auth: {
    user: EMAIL_CONFIG.user,
    pass: EMAIL_CONFIG.password,
  },
});

// Verify connection configuration
transporter.verify(function (error, success) {
  if (error) {
    console.log('❌ Email configuration error:', error);
  } else {
    console.log('✅ Email server is ready to take our messages');
  }
});

/**
 * Send alert email notification
 * @param alertId - The alert ID that was generated
 * @param vehicleNumber - The vehicle number associated with the alert
 * @param additionalInfo - Any additional information to include in the email
 */
export async function sendAlertEmail(
  alertId: number,
  vehicleNumber: string,
  additionalInfo?: string
): Promise<void> {
  try {
    // Get alarm details from alert
    const alertDetails = await db
      .select({
        alarmId: alarm_alert.alarm_id,
        alarmCategory: alarm.alarm_category,
        alarmValue: alarm.alarm_value,
        description: alarm.descrption,
      })
      .from(alarm_alert)
      .innerJoin(alarm, eq(alarm_alert.alarm_id, alarm.id))
      .where(eq(alarm_alert.alert_id, alertId))
      .limit(1);

    if (alertDetails.length === 0) {
      console.log(`⚠️ No alarm details found for alert ID: ${alertId}`);
      return;
    }

    const alarmDetail = alertDetails[0];
    
    // Get all email addresses for this alarm
    const emailAddresses = await db
      .select({
        emailAddress: alarm_email.email_address,
      })
      .from(alarm_email)
      .where(eq(alarm_email.alarm_id, alarmDetail.alarmId));

    if (emailAddresses.length === 0) {
      console.log(`⚠️ No email addresses configured for alarm ID: ${alarmDetail.alarmId}`);
      return;
    }

    // Prepare email content
    const alertName = alarmDetail.alarmCategory || 'Unknown Alert';
    const subject = `🚨 ${alertName} Alert - Vehicle ${vehicleNumber}`;
    
    let emailBody = `
${alertName} alert has been generated.

Vehicle Details:
- Vehicle Number: ${vehicleNumber}
- Alert Type: ${alertName}
- Generated At: ${new Date().toLocaleString()}
`;

    // Add additional information if provided
    if (additionalInfo) {
      emailBody += `\nAdditional Information:\n${additionalInfo}`;
    }

    // Add alarm specific details
    if (alarmDetail.alarmValue) {
      emailBody += `\nThreshold Value: ${alarmDetail.alarmValue}`;
    }

    if (alarmDetail.description) {
      emailBody += `\nDescription: ${alarmDetail.description}`;
    }

    emailBody += `\n\nThis is an automated alert notification from the Vehicle Tracking System.`;

    // Send email to all configured addresses
    const emailPromises = emailAddresses.map(async ({ emailAddress }) => {
      try {
        const mailOptions = {
          from: EMAIL_CONFIG.from,
          to: emailAddress,
          subject: subject,
          text: emailBody,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h2 style="color: #dc3545; margin-bottom: 20px;">🚨 ${alertName} Alert</h2>
                
                <div style="background-color: white; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                  <h3 style="color: #333; margin-top: 0;">Vehicle Details</h3>
                  <p><strong>Vehicle Number:</strong> ${vehicleNumber}</p>
                  <p><strong>Alert Type:</strong> ${alertName}</p>
                  <p><strong>Generated At:</strong> ${new Date().toLocaleString()}</p>
                  ${alarmDetail.alarmValue ? `<p><strong>Threshold Value:</strong> ${alarmDetail.alarmValue}</p>` : ''}
                </div>
                
                ${additionalInfo ? `
                <div style="background-color: #e9ecef; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                  <h3 style="color: #333; margin-top: 0;">Additional Information</h3>
                  <p>${additionalInfo}</p>
                </div>
                ` : ''}
                
                ${alarmDetail.description ? `
                <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                  <h3 style="color: #856404; margin-top: 0;">Description</h3>
                  <p>${alarmDetail.description}</p>
                </div>
                ` : ''}
                
                <div style="background-color: #d1ecf1; padding: 10px; border-radius: 5px; font-size: 12px; color: #0c5460;">
                  This is an automated alert notification from the Vehicle Tracking System.
                </div>
              </div>
            </div>
          `,
        };

        await transporter.sendMail(mailOptions);
        console.log(`✅ Alert email sent successfully to: ${emailAddress}`);
        
      } catch (error) {
        console.error(`❌ Failed to send email to ${emailAddress}:`, error);
        throw error;
      }
    });

    // Wait for all emails to be sent
    await Promise.allSettled(emailPromises);
    
    console.log(`📧 Alert email notifications processed for ${emailAddresses.length} recipients`);
    
  } catch (error) {
    console.error('❌ Error sending alert email:', error);
    throw error;
  }
}

/**
 * Send bulk alert emails for multiple alerts
 * @param alerts - Array of alert information
 */
export async function sendBulkAlertEmails(
  alerts: Array<{
    alertId: number;
    vehicleNumber: string;
    additionalInfo?: string;
  }>
): Promise<void> {
  try {
    const emailPromises = alerts.map(alert => 
      sendAlertEmail(alert.alertId, alert.vehicleNumber, alert.additionalInfo)
        .catch(error => {
          console.error(`❌ Failed to send email for alert ${alert.alertId}:`, error);
          return null;
        })
    );

    await Promise.allSettled(emailPromises);
    console.log(`📧 Bulk alert email processing completed for ${alerts.length} alerts`);
    
  } catch (error) {
    console.error('❌ Error in bulk alert email sending:', error);
    throw error;
  }
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(): Promise<boolean> {
  try {
    const testMailOptions = {
      from: EMAIL_CONFIG.from,
      to: EMAIL_CONFIG.user, // Send test email to sender
      subject: '🧪 Test Email - Vehicle Tracking System',
      text: 'This is a test email to verify the email configuration.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
            <h2 style="color: #28a745;">🧪 Test Email</h2>
            <p>This is a test email to verify the email configuration for the Vehicle Tracking System.</p>
            <p><strong>Sent at:</strong> ${new Date().toLocaleString()}</p>
            <div style="background-color: #d4edda; padding: 10px; border-radius: 5px; color: #155724;">
              ✅ Email configuration is working correctly!
            </div>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(testMailOptions);
    console.log('✅ Test email sent successfully');
    return true;
    
  } catch (error) {
    console.error('❌ Test email failed:', error);
    return false;
  }
}

/**
 * Get email addresses for a specific alarm
 * @param alarmId - The alarm ID to get emails for
 */
export async function getAlarmEmailAddresses(alarmId: number): Promise<string[]> {
  try {
    const emailAddresses = await db
      .select({
        emailAddress: alarm_email.email_address,
      })
      .from(alarm_email)
      .where(eq(alarm_email.alarm_id, alarmId));

    return emailAddresses.map(email => email.emailAddress);
    
  } catch (error) {
    console.error(`❌ Error fetching email addresses for alarm ${alarmId}:`, error);
    return [];
  }
}

// Alarm type mapping (from aconfig.tsx)
const ALARM_TYPE_MAP: Record<number, string> = {
  1: "Stoppage",
  2: "Overspeeding",
  3: "Continuous Driving",
  4: "No GPS Feed",
  5: "Reached Stop",
  6: "Geofence",
  7: "Route Deviation",
};

/**
 * Generate alert email subject and HTML body according to alarm type and info
 */
export function generateAlertEmailTemplate({
  alarmTypeId,
  vehicleNumber,
  tripId,
  location,
  alertTime,
  driverName,
  driverMobile,
  vendorName,
  customerName,
  alarmValue,
  description,
  additionalInfo,
}: {
  alarmTypeId: number;
  vehicleNumber: string;
  tripId?: string;
  location?: string;
  alertTime?: string;
  driverName?: string;
  driverMobile?: string;
  vendorName?: string;
  customerName?: string;
  alarmValue?: string | number;
  description?: string;
  additionalInfo?: string;
}): { subject: string; html: string; text: string } {
  const alarmType = ALARM_TYPE_MAP[alarmTypeId] || "General";
  let subject = `Alert : ${alarmType}`;
  if (alarmType === "Continuous Driving") {
    subject += ` - Continuous Driving Detected for Vehicle ${vehicleNumber}`;
    if (tripId) subject += ` | Trip : ${tripId}`;
  } else if (alarmType === "Overspeeding") {
    subject += ` - Overspeeding Detected for Vehicle ${vehicleNumber}`;
    if (tripId) subject += ` | Trip : ${tripId}`;
  } else if (alarmType === "Geofence") {
    subject += ` - Geofence Breach for Vehicle ${vehicleNumber}`;
    if (tripId) subject += ` | Trip : ${tripId}`;
  } else {
    subject += ` - ${alarmType} for Vehicle ${vehicleNumber}`;
    if (tripId) subject += ` | Trip : ${tripId}`;
  }

  // Compose main info block
  let infoBlock = "";
  if (vehicleNumber) infoBlock += `<p><b>Vehicle No.:</b> ${vehicleNumber}</p>`;
  if (tripId) infoBlock += `<p><b>Trip ID:</b> ${tripId}</p>`;
  if (alarmType === "Continuous Driving" && alarmValue) infoBlock += `<p><b>Continuous Driving Duration:</b> ${alarmValue} hours</p>`;
  if (alarmType === "Overspeeding" && alarmValue) infoBlock += `<p><b>Speed Threshold:</b> ${alarmValue} km/h</p>`;
  if (location) infoBlock += `<p><b>Location:</b> ${location}</p>`;
  if (alertTime) infoBlock += `<p><b>Alert Time:</b> ${alertTime}</p>`;
  if (driverName) infoBlock += `<p><b>Driver Name:</b> ${driverName}</p>`;
  if (driverMobile) infoBlock += `<p><b>Driver Mobile:</b> ${driverMobile}</p>`;
  if (vendorName) infoBlock += `<p><b>GPS Vendor:</b> ${vendorName}</p>`;
  if (customerName) infoBlock += `<p><b>Customer Name:</b> ${customerName}</p>`;

  // Compose disclaimer
  const disclaimer = `<div style="font-size:12px;color:#888;margin-top:24px;">
Disclaimer: This is an automated email. If you are not the intended recipient, please notify us immediately and delete this message. Unauthorized use, copying, or disclosure of this information is prohibited. For assistance, contact: <a href="mailto:otherapps.support@mllltd.zohodesk.com">otherapps.support@mllltd.zohodesk.com</a>
</div>`;

  // Compose HTML body
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#dc3545;">${subject}</h2>
      <div style="background:#f8f9fa;padding:20px;border-radius:8px;">
        ${infoBlock}
        ${description ? `<p><b>Description:</b> ${description}</p>` : ""}
        ${additionalInfo ? `<p><b>Additional Info:</b> ${additionalInfo}</p>` : ""}
      </div>
      ${disclaimer}
    </div>
  `;

  // Compose plain text version
  let text = `${subject}\n\n`;
  if (vehicleNumber) text += `Vehicle No.: ${vehicleNumber}\n`;
  if (tripId) text += `Trip ID: ${tripId}\n`;
  if (alarmType === "Continuous Driving" && alarmValue) text += `Continuous Driving Duration: ${alarmValue} hours\n`;
  if (alarmType === "Overspeeding" && alarmValue) text += `Speed Threshold: ${alarmValue} km/h\n`;
  if (location) text += `Location: ${location}\n`;
  if (alertTime) text += `Alert Time: ${alertTime}\n`;
  if (driverName) text += `Driver Name: ${driverName}\n`;
  if (driverMobile) text += `Driver Mobile: ${driverMobile}\n`;
  if (vendorName) text += `GPS Vendor: ${vendorName}\n`;
  if (customerName) text += `Customer Name: ${customerName}\n`;
  if (description) text += `Description: ${description}\n`;
  if (additionalInfo) text += `Additional Info: ${additionalInfo}\n`;
  text += `\nDisclaimer: This is an automated email. If you are not the intended recipient, please notify us immediately and delete this message. Unauthorized use, copying, or disclosure of this information is prohibited. For assistance, contact: otherapps.support@mllltd.zohodesk.com\n`;

  return { subject, html, text };
}

/**
 * TEMP: Send a dummy alert email to a test address for verification
 */
export async function sendDummyAlertEmailForTest() {
  const { subject, html, text } = generateAlertEmailTemplate({
    alarmTypeId: 3, // Continuous Driving
    vehicleNumber: "AP29TB3613",
    tripId: "M5090535",
    location: "SH 2, Chityala, Telangana\n14 m from Andhra Pradesh Grameena Vikas Bank, Pin-508114 (India)",
    alertTime: "12/03/2025 21:16:10",
    driverName: "VENKATESH",
    driverMobile: "9553029201",
    vendorName: "GTROPY",
    customerName: "ASOB",
    alarmValue: 3, // 3 hours
    description: "Continuous driving detected for more than 3 hours.",
    additionalInfo: undefined,
  });

  const mailOptions = {
    from: EMAIL_CONFIG.from,
    to: "nayan11404@gmail.com",
    subject,
    text,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("✅ Dummy alert email sent to nayan11404@gmail.com");
  } catch (error) {
    console.error("❌ Failed to send dummy alert email:", error);
  }
}


