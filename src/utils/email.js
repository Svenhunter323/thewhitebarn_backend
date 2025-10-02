import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
};

// Email template for contact form
const createContactEmailTemplate = (contactData) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Contact Form Submission - The White Barn FL</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 20px; 
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background: #f9f9f9; 
          padding: 20px; 
          border-radius: 10px; 
        }
        .header { 
          background: #f59332; 
          color: white; 
          padding: 20px; 
          text-align: center; 
          border-radius: 10px 10px 0 0; 
          margin: -20px -20px 20px -20px; 
        }
        .content { 
          background: white; 
          padding: 20px; 
          border-radius: 5px; 
        }
        .field { 
          margin-bottom: 15px; 
          padding: 10px; 
          border-left: 4px solid #f59332; 
          background: #fafafa; 
        }
        .field strong { 
          color: #f59332; 
          display: inline-block; 
          width: 120px; 
        }
        .footer { 
          text-align: center; 
          margin-top: 20px; 
          padding-top: 20px; 
          border-top: 1px solid #ddd; 
          color: #666; 
          font-size: 12px; 
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Contact Form Submission</h1>
          <p>The White Barn FL</p>
        </div>
        
        <div class="content">
          <p>You have received a new contact form submission from your website:</p>
          
          <div class="field">
            <strong>Name:</strong> ${contactData.name}
          </div>
          
          <div class="field">
            <strong>Email:</strong> ${contactData.email}
          </div>
          
          ${contactData.phone ? `
          <div class="field">
            <strong>Phone:</strong> ${contactData.phone}
          </div>
          ` : ''}
          
          ${contactData.address ? `
          <div class="field">
            <strong>Address:</strong> ${contactData.address}
          </div>
          ` : ''}
          
          <div class="field">
            <strong>Message:</strong><br>
            ${contactData.message.replace(/\n/g, '<br>')}
          </div>
          
          <div class="field">
            <strong>Submitted:</strong> ${new Date().toLocaleString()}
          </div>
        </div>
        
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} The White Barn FL - All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send contact form email
export const sendContactEmail = async (contactData) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"The White Barn FL Contact Form" <${process.env.FROM_EMAIL}>`,
      to: process.env.TO_EMAIL,
      replyTo: contactData.email,
      subject: `New Contact Form Submission from ${contactData.name}`,
      html: createContactEmailTemplate(contactData),
      text: `
        New contact form submission:
        
        Name: ${contactData.name}
        Email: ${contactData.email}
        ${contactData.phone ? `Phone: ${contactData.phone}` : ''}
        ${contactData.address ? `Address: ${contactData.address}` : ''}
        
        Message:
        ${contactData.message}
        
        Submitted: ${new Date().toLocaleString()}
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Contact email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    throw error;
  }
};

// Send auto-reply email to the contact form submitter
export const sendAutoReplyEmail = async (contactData) => {
  try {
    const transporter = createTransporter();
    
    const autoReplyTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Thank You - The White Barn FL</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 20px; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: #f9f9f9; 
            padding: 20px; 
            border-radius: 10px; 
          }
          .header { 
            background: #f59332; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            border-radius: 10px 10px 0 0; 
            margin: -20px -20px 20px -20px; 
          }
          .content { 
            background: white; 
            padding: 20px; 
            border-radius: 5px; 
          }
          .cta { 
            text-align: center; 
            margin: 20px 0; 
          }
          .button { 
            display: inline-block; 
            background: #f59332; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 5px; 
            font-weight: bold; 
          }
          .footer { 
            text-align: center; 
            margin-top: 20px; 
            padding-top: 20px; 
            border-top: 1px solid #ddd; 
            color: #666; 
            font-size: 12px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Thank You for Contacting Us!</h1>
            <p>The White Barn FL</p>
          </div>
          
          <div class="content">
            <p>Dear ${contactData.name},</p>
            
            <p>Thank you for reaching out to The White Barn FL! We have received your message and appreciate your interest in our venue.</p>
            
            <p>Our team will review your inquiry and get back to you within 24 hours during business days. We're excited to help you plan your special event!</p>
            
            <div class="cta">
              <a href="https://thewhitebarnfl.com" class="button">Visit Our Website</a>
            </div>
            
            <p>In the meantime, feel free to explore our gallery and learn more about our services on our website.</p>
            
            <p>Best regards,<br>
            The White Barn FL Team</p>
            
            <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
            
            <p><strong>Contact Information:</strong><br>
            📞 (561) 376-2855<br>
            📧 contact@thewhitebarnfl.com<br>
            📍 4680 SW 148th Ave, Fort Lauderdale, FL 33330</p>
          </div>
          
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} The White Barn FL - All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const mailOptions = {
      from: `"The White Barn FL" <${process.env.FROM_EMAIL}>`,
      to: contactData.email,
      subject: 'Thank you for contacting The White Barn FL',
      html: autoReplyTemplate,
      text: `
        Dear ${contactData.name},
        
        Thank you for reaching out to The White Barn FL! We have received your message and appreciate your interest in our venue.
        
        Our team will review your inquiry and get back to you within 24 hours during business days. We're excited to help you plan your special event!
        
        Best regards,
        The White Barn FL Team
        
        Contact Information:
        Phone: (561) 376-2855
        Email: contact@thewhitebarnfl.com
        Address: 4680 SW 148th Ave, Fort Lauderdale, FL 33330
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Auto-reply email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Auto-reply email failed:', error);
    throw error;
  }
};

// Send welcome email to new admin
export const sendWelcomeEmail = async (adminData) => {
  try {
    const transporter = createTransporter();
    
    const welcomeTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to The White Barn FL Admin</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 20px; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: #f9f9f9; 
            padding: 20px; 
            border-radius: 10px; 
          }
          .header { 
            background: #f59332; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            border-radius: 10px 10px 0 0; 
            margin: -20px -20px 20px -20px; 
          }
          .content { 
            background: white; 
            padding: 20px; 
            border-radius: 5px; 
          }
          .credentials { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 5px; 
            border-left: 4px solid #f59332; 
            margin: 20px 0; 
          }
          .button { 
            display: inline-block; 
            background: #f59332; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 5px; 
            font-weight: bold; 
            margin: 20px 0; 
          }
          .footer { 
            text-align: center; 
            margin-top: 20px; 
            padding-top: 20px; 
            border-top: 1px solid #ddd; 
            color: #666; 
            font-size: 12px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to The White Barn FL</h1>
            <p>Admin Dashboard Access</p>
          </div>
          
          <div class="content">
            <p>Dear ${adminData.name},</p>
            
            <p>Welcome to The White Barn FL admin dashboard! Your administrator account has been created successfully.</p>
            
            <div class="credentials">
              <h3>Your Login Credentials:</h3>
              <p><strong>Email:</strong> ${adminData.email}</p>
              <p><strong>Temporary Password:</strong> ${adminData.tempPassword}</p>
            </div>
            
            <p><strong>Important:</strong> For security reasons, you will be required to change your password upon first login.</p>
            
            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/admin/login" class="button">Access Admin Dashboard</a>
            </div>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact the system administrator.</p>
            
            <p>Best regards,<br>
            The White Barn FL Team</p>
          </div>
          
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} The White Barn FL - All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const mailOptions = {
      from: `"The White Barn FL Admin" <${process.env.FROM_EMAIL}>`,
      to: adminData.email,
      subject: 'Welcome to The White Barn FL Admin Dashboard',
      html: welcomeTemplate,
      text: `
        Welcome to The White Barn FL Admin Dashboard!
        
        Your administrator account has been created successfully.
        
        Login Credentials:
        Email: ${adminData.email}
        Temporary Password: ${adminData.tempPassword}
        
        Important: You will be required to change your password upon first login.
        
        Access the admin dashboard at: ${process.env.FRONTEND_URL}/admin/login
        
        Best regards,
        The White Barn FL Team
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Welcome email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Welcome email failed:', error);
    throw error;
  }
};

// Send password reset email
export const sendPasswordResetEmail = async (adminData) => {
  try {
    const transporter = createTransporter();
    
    const resetTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Password Reset - The White Barn FL</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 20px; 
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: #f9f9f9; 
            padding: 20px; 
            border-radius: 10px; 
          }
          .header { 
            background: #f59332; 
            color: white; 
            padding: 20px; 
            text-align: center; 
            border-radius: 10px 10px 0 0; 
            margin: -20px -20px 20px -20px; 
          }
          .content { 
            background: white; 
            padding: 20px; 
            border-radius: 5px; 
          }
          .button { 
            display: inline-block; 
            background: #f59332; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 5px; 
            font-weight: bold; 
            margin: 20px 0; 
          }
          .warning { 
            background: #fff3cd; 
            border: 1px solid #ffeaa7; 
            color: #856404; 
            padding: 15px; 
            border-radius: 5px; 
            margin: 20px 0; 
          }
          .footer { 
            text-align: center; 
            margin-top: 20px; 
            padding-top: 20px; 
            border-top: 1px solid #ddd; 
            color: #666; 
            font-size: 12px; 
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
            <p>The White Barn FL Admin</p>
          </div>
          
          <div class="content">
            <p>Dear ${adminData.name},</p>
            
            <p>We received a request to reset your password for your admin account. If you made this request, please click the button below to reset your password:</p>
            
            <div style="text-align: center;">
              <a href="${adminData.resetUrl}" class="button">Reset Password</a>
            </div>
            
            <div class="warning">
              <strong>Important:</strong> This password reset link will expire in 10 minutes for security reasons.
            </div>
            
            <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
            
            <p>For security reasons, if you continue to receive these emails without requesting them, please contact the system administrator immediately.</p>
            
            <p>Best regards,<br>
            The White Barn FL Team</p>
          </div>
          
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} The White Barn FL - All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    const mailOptions = {
      from: `"The White Barn FL Admin" <${process.env.FROM_EMAIL}>`,
      to: adminData.email,
      subject: 'Password Reset Request - The White Barn FL Admin',
      html: resetTemplate,
      text: `
        Password Reset Request
        
        Dear ${adminData.name},
        
        We received a request to reset your password for your admin account.
        
        Reset your password by visiting this link: ${adminData.resetUrl}
        
        This link will expire in 10 minutes for security reasons.
        
        If you did not request a password reset, please ignore this email.
        
        Best regards,
        The White Barn FL Team
      `
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('📧 Password reset email sent:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Password reset email failed:', error);
    throw error;
  }
};
