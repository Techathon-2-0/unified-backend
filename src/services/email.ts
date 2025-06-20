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