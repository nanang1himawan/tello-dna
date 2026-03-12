<?php
/**
 * Email Helper - PHPMailer integration
 */

// Use PHPMailer if installed, otherwise fallback to PHP mail
class EmailHelper {
    private static $config = [
        'smtp_host' => 'smtp.gmail.com', // Configure your SMTP
        'smtp_port' => 587,
        'smtp_user' => '', // Set via environment or config
        'smtp_pass' => '',
        'from_email' => 'noreply@projectmanager.com',
        'from_name' => 'Project Manager'
    ];

    /**
     * Send email notification
     */
    public static function send($to, $subject, $body, $htmlBody = null) {
        // Check if PHPMailer is available
        $phpmailerPath = __DIR__ . '/../vendor/phpmailer/PHPMailer.php';
        
        if (file_exists($phpmailerPath)) {
            return self::sendWithPHPMailer($to, $subject, $body, $htmlBody);
        }
        
        // Fallback to PHP mail()
        return self::sendWithMail($to, $subject, $body, $htmlBody);
    }

    /**
     * Send using PHP mail() function
     */
    private static function sendWithMail($to, $subject, $body, $htmlBody = null) {
        $headers = [
            'From: ' . self::$config['from_name'] . ' <' . self::$config['from_email'] . '>',
            'Reply-To: ' . self::$config['from_email'],
            'X-Mailer: PHP/' . phpversion()
        ];

        if ($htmlBody) {
            $headers[] = 'MIME-Version: 1.0';
            $headers[] = 'Content-type: text/html; charset=utf-8';
            $body = $htmlBody;
        }

        return mail($to, $subject, $body, implode("\r\n", $headers));
    }

    /**
     * Send using PHPMailer (if installed)
     */
    private static function sendWithPHPMailer($to, $subject, $body, $htmlBody = null) {
        // PHPMailer implementation would go here
        // For now, fallback to mail()
        return self::sendWithMail($to, $subject, $body, $htmlBody);
    }

    /**
     * Generate notification email HTML
     */
    public static function generateNotificationEmail($title, $message, $actionUrl = null, $actionText = 'View Details') {
        $actionButton = '';
        if ($actionUrl) {
            $actionButton = '
                <tr>
                    <td style="padding: 20px 0;">
                        <a href="' . htmlspecialchars($actionUrl) . '" 
                           style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #6366f1, #8b5cf6); 
                                  color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
                            ' . htmlspecialchars($actionText) . '
                        </a>
                    </td>
                </tr>';
        }

        return '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f0f23; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <tr>
                    <td style="background: linear-gradient(180deg, #1a1a2e 0%, #16162a 100%); border-radius: 16px; padding: 32px;">
                        <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                                <td style="padding-bottom: 24px; border-bottom: 1px solid #2d2d4a;">
                                    <h1 style="margin: 0; color: #6366f1; font-size: 24px;">📋 Project Manager</h1>
                                </td>
                            </tr>
                            <tr>
                                <td style="padding: 24px 0;">
                                    <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 20px;">' . htmlspecialchars($title) . '</h2>
                                    <p style="margin: 0; color: #a0a0c0; font-size: 16px; line-height: 1.6;">' . nl2br(htmlspecialchars($message)) . '</p>
                                </td>
                            </tr>
                            ' . $actionButton . '
                            <tr>
                                <td style="padding-top: 24px; border-top: 1px solid #2d2d4a;">
                                    <p style="margin: 0; color: #6b7280; font-size: 12px;">
                                        This email was sent by Project Manager. 
                                        If you did not expect this email, please ignore it.
                                    </p>
                                </td>
                            </tr>
                        </table>
                    </td>
                </tr>
            </table>
        </body>
        </html>';
    }

    /**
     * Send task notification
     */
    public static function sendTaskNotification($userEmail, $taskTitle, $message, $taskId = null) {
        $appUrl = getenv('APP_URL') ?: 'http://localhost:5173';
        $actionUrl = $taskId ? $appUrl . '/tasks/' . $taskId : null;
        
        $htmlBody = self::generateNotificationEmail(
            'Task Update: ' . $taskTitle,
            $message,
            $actionUrl,
            'View Task'
        );

        return self::send($userEmail, 'Task Update: ' . $taskTitle, $message, $htmlBody);
    }

    /**
     * Send project invitation
     */
    public static function sendProjectInvitation($userEmail, $projectName, $inviterName, $inviteToken = null) {
        $appUrl = getenv('APP_URL') ?: 'http://localhost:5173';
        $actionUrl = $inviteToken ? $appUrl . '/invite/' . $inviteToken : $appUrl;
        
        $message = $inviterName . ' has invited you to join the project "' . $projectName . '".';
        
        $htmlBody = self::generateNotificationEmail(
            'Project Invitation',
            $message,
            $actionUrl,
            'Accept Invitation'
        );

        return self::send($userEmail, 'You\'ve been invited to ' . $projectName, $message, $htmlBody);
    }
}
