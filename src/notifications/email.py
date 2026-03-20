import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

try:
    from dotenv import load_dotenv
    _env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
    load_dotenv(_env_path)
except ImportError:
    pass

def send_batch_summary_email(batch_id: str, cluster_name: str, sig_result: dict, carbon_summary: dict, recipient_email: str = None):
    """
    Constructs and sends an email summary for a completed batch.
    Uses environment variables for configuration.
    """
    smtp_server = os.getenv("SMTP_SERVER", "localhost")
    smtp_port = int(os.getenv("SMTP_PORT", 1025))
    sender_email = os.getenv("SENDER_EMAIL", "system@cb-mopa.local")
    sender_password = os.getenv("SENDER_PASSWORD", "")
    # Use dynamic auth email if provided, otherwise fall back to env
    recipient_email = recipient_email or os.getenv("RECIPIENT_EMAIL", "admin@cb-mopa.local")

    subject = f"CB-MOPA: Batch {batch_id} Complete ({cluster_name})"
    
    body = f"""
    <html>
      <body>
        <h2>Batch {batch_id} Summary</h2>
        <p><strong>Cluster (Golden Envelope):</strong> {cluster_name}</p>
        
        <h3>Signature Update</h3>
        <p>Signature Updated: {sig_result.get('updated', False)}</p>
        <p>Details: {sig_result.get('reason', 'N/A') if not sig_result.get('updated') else 'New dominant signature recorded.'}</p>

        <h3>Carbon Tracking</h3>
        <ul>
            <li>Total CO2e: {carbon_summary.get('total_co2e_kg', 0)} kg</li>
            <li>Carbon Target Status: {carbon_summary.get('target_status', 'Unknown')}</li>
        </ul>
        <p><i>This is an automated message from the CB-MOPA System.</i></p>
      </body>
    </html>
    """

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = recipient_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'html'))

    # Save a tangible copy to disk to simulate delivery locally unconditionally
    import datetime
    outbox_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "outbox")
    os.makedirs(outbox_dir, exist_ok=True)
    stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = os.path.join(outbox_dir, f"batch_{batch_id}_{stamp}.html")
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(body)
            print(f"[Email Sim] Wrote batch summary to local outbox: {file_path}")
    except Exception as e:
        print(f"Failed to write local outbox email: {e}")

    # Try actual SMTP delivery
    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            if sender_password:
                if smtp_port != 1025:
                    server.starttls()
                server.login(sender_email, sender_password)
            server.send_message(msg)
            print(f"Batch summary email sent to {recipient_email} for batch {batch_id}")
    except Exception as e:
        print(f"SMTP delivery failed (No SMTP configured on {smtp_server}:{smtp_port}). Saved locally to outbox instead.")

def send_simulation_summary_email(total_batches: int, alarms: list, recipient_email: str = None):
    smtp_server = os.getenv("SMTP_SERVER", "localhost")
    smtp_port = int(os.getenv("SMTP_PORT", 1025))
    sender_email = os.getenv("SENDER_EMAIL", "system@cb-mopa.local")
    sender_password = os.getenv("SENDER_PASSWORD", "")
    # Use dynamic auth email if provided, otherwise fall back to env
    recipient_email = recipient_email or os.getenv("RECIPIENT_EMAIL", "admin@cb-mopa.local")

    subject = "CB-MOPA: Real-Time Simulation Complete"
    
    ok_count = alarms.count('OK')
    warn_count = alarms.count('WARNING')
    crit_count = alarms.count('CRITICAL')

    body = f"""
    <html>
      <body>
        <h2>Simulation Complete</h2>
        <p>A Real-Time Simulation run has concluded.</p>
        
        <h3>Summary</h3>
        <ul>
            <li>Total Batches Processed: {total_batches}</li>
            <li>Batches within Golden Envelope: {ok_count}</li>
            <li>Batches with Partial Drift (WARNING): {warn_count}</li>
            <li>Batches with Significant Drift (CRITICAL): {crit_count}</li>
        </ul>
        <p><i>This is an automated message from the CB-MOPA System.</i></p>
      </body>
    </html>
    """

    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['To'] = recipient_email
    msg['Subject'] = subject
    msg.attach(MIMEText(body, 'html'))

    # Save a tangible copy to disk
    import datetime
    outbox_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "outbox")
    os.makedirs(outbox_dir, exist_ok=True)
    stamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = os.path.join(outbox_dir, f"simulation_summary_{stamp}.html")
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(body)
            print(f"[Email Sim] Wrote simulation summary to local outbox: {file_path}")
    except Exception as e:
        print(f"Failed to write local outbox email: {e}")

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            if sender_password:
                if smtp_port != 1025:
                    server.starttls()
                server.login(sender_email, sender_password)
            server.send_message(msg)
            print(f"Simulation summary email sent to {recipient_email}")
    except Exception as e:
        print(f"SMTP delivery failed (No SMTP configured on {smtp_server}:{smtp_port}). Saved locally to outbox instead.")
